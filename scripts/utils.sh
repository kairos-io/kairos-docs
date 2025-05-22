#!/bin/bash

# Function to fetch all release branches
# Returns a list of all release branches sorted by version
fetch_all_releases() {
    # Fetch release branches
    git fetch --no-recurse-submodules origin '+refs/heads/release/v*:refs/remotes/origin/release/*'
    
    # Get all release branches
    git branch -r | awk '/origin\/release\/v[0-9]+\.[0-9]+\.[0-9]+/ {print $1}' | sort -V
}

# Function to fetch and process release branches
# Returns a list of the latest patch version for each minor version
fetch_latest_releases() {
    # Get all releases and process them to keep only latest patch per minor version
    fetch_all_releases | \
    awk -F'/' '{
        version=$2
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