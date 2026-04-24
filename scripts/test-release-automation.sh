#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="${ROOT_DIR:-$(dirname "$SCRIPT_DIR")}"

source "${SCRIPT_DIR}/utils.sh"

TEST_VERSION="v3.5.2"

echo "Testing Docusaurus Release Automation"
echo "====================================="
echo ""

echo "Test 1: Semantic version validation"
echo "-----------------------------------"
if validate_semantic_version "v3.5.2"; then
  echo "✓ Valid version accepted"
else
  echo "✗ Valid version rejected"
fi

if ! validate_semantic_version "invalid-version"; then
  echo "✓ Invalid version rejected"
else
  echo "✗ Invalid version accepted"
fi
echo ""

echo "Test 2: Latest release detection"
echo "--------------------------------"
latest_release=$(get_latest_kairos_release)
if [ -n "$latest_release" ]; then
  echo "✓ Latest release: $latest_release"
else
  echo "✗ Could not read latest release"
fi
echo ""

echo "Test 3: Component version extraction"
echo "------------------------------------"
kairos_init_version=$(get_kairos_init_version "$TEST_VERSION")
if [ -n "$kairos_init_version" ]; then
  echo "✓ KAIROS_INIT: $kairos_init_version"
else
  echo "✗ Could not read KAIROS_INIT"
fi

component_versions=$(get_component_versions "$kairos_init_version" "$TEST_VERSION")
if [ -n "$component_versions" ]; then
  echo "✓ Component versions extracted"
  echo "$component_versions" | jq '.'
else
  echo "✗ Could not extract component versions"
fi
echo ""

echo "Test 4: Retention source (latest patch per major.minor)"
echo "--------------------------------------------------------"
if releases=$(fetch_latest_releases); then
  echo "✓ fetch_latest_releases output:"
  echo "$releases"
else
  echo "✗ fetch_latest_releases failed"
fi
echo ""

echo "Test 5: Release automation dry run"
echo "----------------------------------"
cd "$root_dir"
if ./scripts/release-automation.sh --version "$TEST_VERSION" --dry-run --verbose; then
  echo "✓ Dry run completed"
else
  echo "✗ Dry run failed"
fi
echo ""

echo "Test 6: Docusaurus config smoke check"
echo "--------------------------------------"
if npm run build >/dev/null 2>&1; then
  echo "✓ Docusaurus build succeeded"
else
  echo "✗ Docusaurus build failed"
fi
echo ""

echo "Done"
