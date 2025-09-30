#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="${ROOT_DIR:-$(dirname "$SCRIPT_DIR")}"

# Source the utils file
source "${SCRIPT_DIR}/utils.sh"

# Default values
DRY_RUN=false
SPECIFIC_VERSION=""
VERBOSE=false
PUSH_CHANGES=true

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --version VERSION    Process a specific version (e.g., v3.5.3)
    --dry-run           Show what would be done without making changes
    --push=false        Don't push changes to remote (local testing only)
    --verbose           Enable verbose output
    --help              Show this help message

Examples:
    $0                          # Check for latest release and process if new
    $0 --version v3.5.3         # Process specific version
    $0 --dry-run                # Show what would be done
    $0 --version v3.5.3 --dry-run  # Test specific version processing
    $0 --version v3.5.3 --push=false  # Test locally without pushing

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            SPECIFIC_VERSION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --push=false)
            PUSH_CHANGES=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo "[$timestamp] INFO: $message"
            ;;
        "WARN")
            echo "[$timestamp] WARN: $message" >&2
            ;;
        "ERROR")
            echo "[$timestamp] ERROR: $message" >&2
            ;;
        "DEBUG")
            if [ "$VERBOSE" = true ]; then
                echo "[$timestamp] DEBUG: $message"
            fi
            ;;
    esac
}

# Function to update hugo.toml with new versions
update_hugo_toml() {
    local version="$1"
    local kairos_init_version="$2"
    local component_versions="$3"
    
    log "INFO" "Updating hugo.toml with version $version"
    
    # Create backup
    cp hugo.toml hugo.toml.backup
    
    # Update kairos_version
    sed -i "s/^kairos_version = \".*\"/kairos_version = \"$version\"/" hugo.toml
    
    # Update kairos_init_version
    sed -i "s/^kairos_init_version = \".*\"/kairos_init_version = \"$kairos_init_version\"/" hugo.toml
    
    # Extract component versions from JSON
    local provider_version=$(echo "$component_versions" | jq -r '.provider_version // empty')
    local auroraboot_version=$(echo "$component_versions" | jq -r '.auroraboot_version // empty')
    local k3s_version=$(echo "$component_versions" | jq -r '.k3s_version // empty')
    
    # Update provider_version if available
    if [ -n "$provider_version" ] && [ "$provider_version" != "null" ]; then
        sed -i "s/^provider_version = \".*\"/provider_version = \"$provider_version\"/" hugo.toml
        log "INFO" "Updated provider_version to $provider_version"
    else
        log "WARN" "provider_version not found or empty"
    fi
    
    # Update auroraboot_version if available
    if [ -n "$auroraboot_version" ] && [ "$auroraboot_version" != "null" ]; then
        sed -i "s/^auroraboot_version = \".*\"/auroraboot_version = \"$auroraboot_version\"/" hugo.toml
        log "INFO" "Updated auroraboot_version to $auroraboot_version"
    else
        log "WARN" "auroraboot_version not found or empty"
    fi
    
    # Update k3s_version if available
    if [ -n "$k3s_version" ] && [ "$k3s_version" != "null" ]; then
        sed -i "s/^k3s_version = \".*\"/k3s_version = \"$k3s_version\"/" hugo.toml
        log "INFO" "Updated k3s_version to $k3s_version"
    else
        log "WARN" "k3s_version not found or empty"
    fi
    
    log "INFO" "Successfully updated hugo.toml"
}

# Function to validate hugo.toml syntax
validate_hugo_toml() {
    log "INFO" "Validating hugo.toml syntax"
    
    # Check if hugo is available
    if ! command -v hugo &> /dev/null; then
        log "WARN" "Hugo not found, skipping syntax validation"
        return 0
    fi
    
    # Try to parse hugo.toml
    if hugo config --quiet 2>/dev/null; then
        log "INFO" "hugo.toml syntax is valid"
        return 0
    else
        log "ERROR" "hugo.toml syntax validation failed"
        return 1
    fi
}

# Function to create release branch and commit changes
create_release_branch() {
    local version="$1"
    local branch_name="release/$version"
    
    log "INFO" "Creating release branch: $branch_name"
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would create branch: $branch_name"
        log "INFO" "[DRY RUN] Would commit changes to hugo.toml"
        if [ "$PUSH_CHANGES" = true ]; then
            log "INFO" "[DRY RUN] Would push branch to origin"
        else
            log "INFO" "[DRY RUN] Would skip pushing (--push=false)"
        fi
        return 0
    fi
    
    # Create and checkout new branch
    git checkout -b "$branch_name"
    
    # Add and commit changes
    git add hugo.toml
    git commit -m "chore: update versions for release $version"
    
    # Push branch to origin only if PUSH_CHANGES is true
    if [ "$PUSH_CHANGES" = true ]; then
        git push -u origin "$branch_name"
        log "INFO" "Successfully created and pushed release branch: $branch_name"
    else
        log "INFO" "Successfully created release branch: $branch_name (not pushed - use --push=false to test locally)"
    fi
}

# Function to process a specific version
process_version() {
    local version="$1"
    
    log "INFO" "Processing version: $version"
    
    # Validate version format
    if ! validate_semantic_version "$version"; then
        log "ERROR" "Invalid semantic version format: $version"
        return 1
    fi
    
    # Check if release branch already exists
    if release_branch_exists "$version"; then
        log "WARN" "Release branch for $version already exists, skipping"
        return 0
    fi
    
    # Get KAIROS_INIT version
    log "INFO" "Fetching KAIROS_INIT version for $version"
    local kairos_init_version
    kairos_init_version=$(get_kairos_init_version "$version")
    
    if [ $? -ne 0 ] || [ -z "$kairos_init_version" ]; then
        log "ERROR" "Failed to get KAIROS_INIT version for $version"
        return 1
    fi
    
    log "INFO" "Found KAIROS_INIT version: $kairos_init_version"
    
    # Get component versions
    log "INFO" "Fetching component versions from kairos-init $kairos_init_version"
    local component_versions
    component_versions=$(get_component_versions "$kairos_init_version")
    
    if [ $? -ne 0 ]; then
        log "ERROR" "Failed to get component versions for kairos-init $kairos_init_version"
        return 1
    fi
    
    log "DEBUG" "Component versions: $component_versions"
    
    # Update hugo.toml
    update_hugo_toml "$version" "$kairos_init_version" "$component_versions"
    
    # Validate hugo.toml
    if ! validate_hugo_toml; then
        log "ERROR" "hugo.toml validation failed, reverting changes"
        mv hugo.toml.backup hugo.toml
        return 1
    fi
    
    # Create release branch
    create_release_branch "$version"
    
    # Clean up backup
    rm -f hugo.toml.backup
    
    log "INFO" "Successfully processed version: $version"
}

# Function to check for new releases
check_for_new_releases() {
    log "INFO" "Checking for new Kairos releases"
    
    # Get latest release from GitHub
    local latest_release
    latest_release=$(get_latest_kairos_release)
    
    if [ $? -ne 0 ] || [ -z "$latest_release" ]; then
        log "ERROR" "Failed to get latest release from GitHub"
        return 1
    fi
    
    log "INFO" "Latest release from GitHub: $latest_release"
    
    # Check if we already have a branch for this release
    if release_branch_exists "$latest_release"; then
        log "INFO" "Release branch for $latest_release already exists, no action needed"
        return 0
    fi
    
    log "INFO" "New release detected: $latest_release"
    process_version "$latest_release"
}

# Main execution
main() {
    log "INFO" "Starting release automation"
    log "INFO" "Dry run mode: $DRY_RUN"
    log "INFO" "Push changes: $PUSH_CHANGES"
    log "INFO" "Verbose mode: $VERBOSE"
    
    # Change to repository root
    cd "$root_dir"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository"
        exit 1
    fi
    
    # Check if hugo.toml exists
    if [ ! -f "hugo.toml" ]; then
        log "ERROR" "hugo.toml not found in repository root"
        exit 1
    fi
    
    # Process specific version or check for new releases
    if [ -n "$SPECIFIC_VERSION" ]; then
        process_version "$SPECIFIC_VERSION"
    else
        check_for_new_releases
    fi
    
    log "INFO" "Release automation completed"
}

# Run main function
main "$@"

