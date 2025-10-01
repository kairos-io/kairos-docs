#!/bin/bash

# Function to fetch all release branches
# Returns a list of all release branches sorted by version
fetch_all_releases() {
    # Fetch release branches
    git fetch --no-recurse-submodules origin '+refs/heads/release/v*:refs/remotes/origin/release/*'
    
    # Get all release branches
    git branch -r | awk '/origin\/release\/v[0-9]+\.[0-9]+\.[0-9]+/ {print $1}' | sort -V
}

# Function to get the latest release from GitHub API
# Returns the latest release tag name
get_latest_kairos_release() {
    local api_url="https://api.github.com/repos/kairos-io/kairos/releases/latest"
    local response
    
    response=$(curl -s -H "Accept: application/vnd.github.v3+json" "$api_url")
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to fetch latest release from GitHub API" >&2
        return 1
    fi
    
    local tag_name=$(echo "$response" | jq -r '.tag_name // empty')
    
    if [ -z "$tag_name" ] || [ "$tag_name" = "null" ]; then
        echo "Error: No tag name found in API response" >&2
        return 1
    fi
    
    echo "$tag_name"
}

# Function to check if a release branch already exists
# Arguments:
#   $1: version tag (e.g., v3.5.3)
# Returns: 0 if exists, 1 if not
release_branch_exists() {
    local version="$1"
    local branch_name="release/$version"
    
    git show-ref --verify --quiet "refs/remotes/origin/$branch_name"
}

# Function to extract KAIROS_INIT version from Dockerfile
# Arguments:
#   $1: version tag (e.g., v3.5.3)
# Returns: KAIROS_INIT version or empty string on error
get_kairos_init_version() {
    local version="$1"
    local dockerfile_url="https://raw.githubusercontent.com/kairos-io/kairos/refs/tags/$version/images/Dockerfile"
    local response
    
    response=$(curl -s "$dockerfile_url")
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to fetch Dockerfile for version $version" >&2
        return 1
    fi
    
    local kairos_init_version=$(echo "$response" | grep -E '^ARG KAIROS_INIT=' | sed 's/ARG KAIROS_INIT=//' | tr -d '\r\n')
    
    if [ -z "$kairos_init_version" ]; then
        echo "Error: KAIROS_INIT version not found in Dockerfile" >&2
        return 1
    fi
    
    echo "$kairos_init_version"
}

# Function to extract K3s version from GitHub release artifacts
# Arguments:
#   $1: kairos_version (e.g., v3.5.3)
# Returns: K3s version (e.g., v1.33.4) or empty string on error
get_k3s_version_from_release() {
    local kairos_version="$1"
    local api_url="https://api.github.com/repos/kairos-io/kairos/releases/tags/$kairos_version"
    local response
    
    response=$(curl -s -H "Accept: application/vnd.github.v3+json" "$api_url")
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to fetch release data for version $kairos_version" >&2
        return 1
    fi
    
    # Extract artifact names that contain "+k3s"
    local k3s_versions=$(echo "$response" | jq -r '.assets[] | select(.name | contains("+k3s")) | .name' 2>/dev/null)
    
    if [ -z "$k3s_versions" ]; then
        echo "Error: No K3s artifacts found in release $kairos_version" >&2
        return 1
    fi
    
    # Extract K3s versions from artifact names
    # Pattern: extract v1.31.12+k3s1 from "kairos-alpine-3.21-standard-amd64-generic-v3.5.3-k3sv1.31.12+k3s1.iso"
    local extracted_versions=$(echo "$k3s_versions" | grep -oE 'k3sv[0-9]+\.[0-9]+\.[0-9]+\+k3s[0-9]+' | sed 's/k3s//' | sort -u)
    
    if [ -z "$extracted_versions" ]; then
        echo "Error: Could not extract K3s versions from artifact names" >&2
        return 1
    fi
    
    # Get the highest semantic version
    local highest_version=$(echo "$extracted_versions" | sort -V | tail -n1)
    
    echo "$highest_version"
}

# Function to fetch subcomponent versions from kairos-init Makefile and kairos release
# Arguments:
#   $1: kairos_init_version (e.g., v0.5.20)
#   $2: kairos_version (e.g., v3.5.3)
# Returns: JSON object with component versions
get_component_versions() {
    local kairos_init_version="$1"
    local kairos_version="${2:-}"
    local makefile_url="https://raw.githubusercontent.com/kairos-io/kairos-init/refs/tags/$kairos_init_version/Makefile"
    local response
    
    response=$(curl -s "$makefile_url")
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to fetch Makefile for kairos-init version $kairos_init_version" >&2
        return 1
    fi
    
    # Extract version variables from Makefile
    local agent_version=$(echo "$response" | grep -E '^AGENT_VERSION\s*:?=' | sed 's/.*:=\s*//' | tr -d '\r\n')
    local immucore_version=$(echo "$response" | grep -E '^IMMUCORE_VERSION\s*:?=' | sed 's/.*:=\s*//' | tr -d '\r\n')
    local provider_version=$(echo "$response" | grep -E '^PROVIDER_KAIROS_VERSION\s*:?=' | sed 's/.*:=\s*//' | tr -d '\r\n')
    local auroraboot_version=$(echo "$response" | grep -E '^AURORABOOT_VERSION\s*:?=' | sed 's/.*:=\s*//' | tr -d '\r\n')
    
    # Get K3s version from GitHub release artifacts if kairos_version is provided
    local k3s_version=""
    if [ -n "$kairos_version" ]; then
        k3s_version=$(get_k3s_version_from_release "$kairos_version")
        if [ $? -ne 0 ]; then
            echo "Error: Failed to get K3s version from release for version $kairos_version" >&2
            return 1
        fi
    else
        echo "Error: kairos_version is required to extract K3s version from release" >&2
        return 1
    fi
    
    # Create JSON object
    cat << EOF
{
  "agent_version": "$agent_version",
  "immucore_version": "$immucore_version",
  "provider_version": "$provider_version",
  "auroraboot_version": "$auroraboot_version",
  "k3s_version": "$k3s_version"
}
EOF
}

# Function to validate semantic version
# Arguments:
#   $1: version string
# Returns: 0 if valid, 1 if invalid
validate_semantic_version() {
    local version="$1"
    
    if [[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to fetch and process release branches
# Returns a list of the latest patch version for each minor version
fetch_latest_releases() {
    # Get all releases and process them to keep only latest patch per minor version
    fetch_all_releases | \
    awk -F'/' '{
        version=$3
        split(version, parts, ".")
        minor_ver = parts[1]"."parts[2]
        if (!latest[minor_ver] || parts[3] > latest_patch[minor_ver]) {
            latest_patch[minor_ver] = parts[3]
            latest[minor_ver] = $0
        }
    } END {
        for (v in latest) print latest[v]
    }' | sort -V
}

# Function to bump version according to semver rules
# Arguments:
#   $1: current version (without 'v' prefix)
#   $2: bump type (major|minor|patch)
# Returns: new version number
bump_version() {
    local version=$1
    local bump_type=$2
    
    # Split version into components
    IFS='.' read -r major minor patch <<< "$version"
    
    case "$bump_type" in
        "major")
            echo "$((major + 1)).0.0"
            ;;
        "minor")
            echo "$major.$((minor + 1)).0"
            ;;
        "patch")
            echo "$major.$minor.$((patch + 1))"
            ;;
        *)
            echo "Invalid bump type: $bump_type" >&2
            return 1
            ;;
    esac
}