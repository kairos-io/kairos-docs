#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="${ROOT_DIR:-$(dirname "$SCRIPT_DIR")}"

# Source the utils file
source "${SCRIPT_DIR}/utils.sh"

# Test configuration
TEST_VERSION="v3.5.2"  # Use a known existing version for testing

echo "Testing Release Automation System"
echo "================================="
echo ""

# Test 1: Validate semantic version function
echo "Test 1: Semantic version validation"
echo "-----------------------------------"
if validate_semantic_version "v3.5.2"; then
    echo "✓ Valid version 'v3.5.2' passed validation"
else
    echo "✗ Valid version 'v3.5.2' failed validation"
fi

if ! validate_semantic_version "invalid-version"; then
    echo "✓ Invalid version 'invalid-version' correctly rejected"
else
    echo "✗ Invalid version 'invalid-version' incorrectly accepted"
fi
echo ""

# Test 2: Get latest release from GitHub API
echo "Test 2: GitHub API integration"
echo "------------------------------"
echo "Fetching latest release from GitHub API..."
latest_release=$(get_latest_kairos_release)
if [ $? -eq 0 ] && [ -n "$latest_release" ]; then
    echo "✓ Successfully fetched latest release: $latest_release"
else
    echo "✗ Failed to fetch latest release from GitHub API"
fi
echo ""

# Test 3: Extract KAIROS_INIT version
echo "Test 3: KAIROS_INIT version extraction"
echo "--------------------------------------"
echo "Extracting KAIROS_INIT version for $TEST_VERSION..."
kairos_init_version=$(get_kairos_init_version "$TEST_VERSION")
if [ $? -eq 0 ] && [ -n "$kairos_init_version" ]; then
    echo "✓ Successfully extracted KAIROS_INIT version: $kairos_init_version"
else
    echo "✗ Failed to extract KAIROS_INIT version for $TEST_VERSION"
fi
echo ""

# Test 4: Extract component versions
if [ -n "$kairos_init_version" ]; then
    echo "Test 4: Component version extraction"
    echo "------------------------------------"
    echo "Extracting component versions for kairos-init $kairos_init_version..."
    component_versions=$(get_component_versions "$kairos_init_version" "$TEST_VERSION")
    if [ $? -eq 0 ] && [ -n "$component_versions" ]; then
        echo "✓ Successfully extracted component versions:"
        echo "$component_versions" | jq '.'
    else
        echo "✗ Failed to extract component versions for kairos-init $kairos_init_version"
    fi
else
    echo "Test 4: Skipped (no KAIROS_INIT version available)"
fi
echo ""

# Test 4.1: Test component version extraction without kairos_version (should fail)
echo "Test 4.1: Component version extraction without kairos_version"
echo "------------------------------------------------------------"
if [ -n "$kairos_init_version" ]; then
    echo "Testing component version extraction without kairos_version parameter..."
    if get_component_versions "$kairos_init_version" >/dev/null 2>&1; then
        echo "✗ Should have failed when kairos_version is not provided"
    else
        echo "✓ Correctly failed when kairos_version is not provided"
    fi
else
    echo "Test 4.1: Skipped (no KAIROS_INIT version available)"
fi
echo ""

# Test 4.2: Test K3s version extraction from release
echo "Test 4.2: K3s version extraction from release"
echo "---------------------------------------------"
echo "Extracting K3s version from release $TEST_VERSION..."
k3s_version=$(get_k3s_version_from_release "$TEST_VERSION")
if [ $? -eq 0 ] && [ -n "$k3s_version" ]; then
    echo "✓ Successfully extracted K3s version: $k3s_version"
else
    echo "✗ Failed to extract K3s version from release $TEST_VERSION"
fi
echo ""

# Test 4.3: Test K3s version extraction with invalid version (should fail)
echo "Test 4.3: K3s version extraction with invalid version"
echo "----------------------------------------------------"
echo "Testing K3s version extraction with invalid version..."
if get_k3s_version_from_release "v999.999.999" >/dev/null 2>&1; then
    echo "✗ Should have failed when trying to extract K3s version from non-existent release"
else
    echo "✓ Correctly failed when trying to extract K3s version from non-existent release"
fi
echo ""

# Test 5: Check if release branch exists
echo "Test 5: Release branch existence check"
echo "--------------------------------------"
echo "Checking if release branch exists for $TEST_VERSION..."
if release_branch_exists "$TEST_VERSION"; then
    echo "✓ Release branch for $TEST_VERSION exists"
else
    echo "ℹ Release branch for $TEST_VERSION does not exist (this is expected for testing)"
fi
echo ""

# Test 6: Dry run of the main automation script
echo "Test 6: Dry run of release automation"
echo "-------------------------------------"
echo "Running release automation in dry-run mode for $TEST_VERSION..."
cd "$root_dir"
if ./scripts/release-automation.sh --version "$TEST_VERSION" --dry-run --verbose; then
    echo "✓ Dry run completed successfully"
else
    echo "✗ Dry run failed"
fi
echo ""

# Test 7: Hugo.toml syntax validation
echo "Test 7: Hugo.toml syntax validation"
echo "-----------------------------------"
if command -v hugo &> /dev/null; then
    if hugo config --quiet 2>/dev/null; then
        echo "✓ Hugo.toml syntax is valid"
    else
        echo "✗ Hugo.toml syntax validation failed"
    fi
else
    echo "ℹ Hugo not available, skipping syntax validation"
fi
echo ""

echo "Test Summary"
echo "============"
echo "All tests completed. Check the output above for any failures."
echo ""
echo "To run the automation manually:"
echo "  ./scripts/release-automation.sh --help"
echo ""
echo "To test with a specific version:"
echo "  ./scripts/release-automation.sh --version v3.5.3 --dry-run"
echo ""
echo "To run the automation normally:"
echo "  ./scripts/release-automation.sh"

