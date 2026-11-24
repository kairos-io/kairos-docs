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

echo "Test 3b: AuroraBoot version follows the Kairos release"
echo "----------------------------------------------------------"
# The functions below replace the network calls, so this test needs no access.
(
  _curl_github() {
    case "$1" in
      */releases/tags/v9.0.0) echo '{"assets":[{"name":"kairos-init-v9.0.0.tar.gz"},{"name":"auroraboot_9.0.0_linux_amd64.tar.gz"}]}' ;;
      */releases/tags/v4.0.0) echo '{"assets":[{"name":"kairos-init-v4.0.0.tar.gz"}]}' ;;
      */kairos-io/AuroraBoot/releases/latest) echo '{"tag_name":"v0.31.0"}' ;;
      *) return 1 ;;
    esac
  }
  failed=0
  check() { # description, expected, actual
    if [ "$2" = "$3" ]; then echo "✓ $1: $3"; else echo "✗ $1: expected $2, got $3"; failed=1; fi
  }
  check "release that ships AuroraBoot" "v9.0.0" "$(get_auroraboot_version v9.0.0)"
  check "release cut before the move" "v0.31.0" "$(get_auroraboot_version v4.0.0)"
  check "no Kairos version" "v0.31.0" "$(get_auroraboot_version "")"
  if get_auroraboot_version v8.8.8 >/dev/null 2>&1; then echo "✗ unreachable release lookup accepted"; failed=1; else echo "✓ unreachable release lookup fails"; fi
  exit $failed
) || echo "✗ AuroraBoot version selection failed"
echo ""

echo "Test 3c: agent, immucore and provider versions"
echo "---------------------------------------------------"
# The functions below replace the network calls, so this test needs no access.
(
  _curl_github() {
    case "$1" in
      */releases/tags/v9.0.0) echo '{"assets":[{"name":"provider-kairos-v9.0.0-linux-amd64.tar.gz"},{"name":"auroraboot_9.0.0_linux_amd64.tar.gz"},{"name":"kairos-hadron-v0.6.3-core-amd64-generic-v9.0.0-k3sv1.35.0+k3s1.iso"},{"name":"kairos-hadron-v0.6.3-core-amd64-generic-v9.0.0-k0sv1.35.0+k0s.0.iso"}]}' ;;
      */releases/tags/v4.0.0) echo '{"assets":[{"name":"kairos-hadron-v0.0.4-core-amd64-generic-v4.0.0-k3sv1.34.0+k3s1.iso"}]}' ;;
      */kairos-io/AuroraBoot/releases/latest) echo '{"tag_name":"v0.31.0"}' ;;
      *) return 1 ;;
    esac
  }
  _curl_raw() {
    case "$1" in
      */kairos-init/refs/tags/v0.9.9/Makefile) printf 'AGENT_VERSION := v2.1.0\nIMMUCORE_VERSION := v0.5.0\nPROVIDER_KAIROS_VERSION := v1.2.3\n' ;;
      *) return 22 ;;
    esac
  }
  failed=0
  check() { # description, expected, actual
    if [ "$2" = "$3" ]; then echo "✓ $1: $3"; else echo "✗ $1: expected $2, got $3"; failed=1; fi
  }
  shipped=$(get_component_versions "v9.9.9" "v9.0.0")
  check "release that ships the components: agent" "v9.0.0" "$(echo "$shipped" | jq -r .agent_version)"
  check "release that ships the components: immucore" "v9.0.0" "$(echo "$shipped" | jq -r .immucore_version)"
  check "release that ships the components: provider" "v9.0.0" "$(echo "$shipped" | jq -r .provider_version)"
  legacy=$(get_component_versions "v0.9.9" "v4.0.0")
  check "release cut before the move: agent" "v2.1.0" "$(echo "$legacy" | jq -r .agent_version)"
  check "release cut before the move: immucore" "v0.5.0" "$(echo "$legacy" | jq -r .immucore_version)"
  check "release cut before the move: provider" "v1.2.3" "$(echo "$legacy" | jq -r .provider_version)"
  if get_component_versions "v8.8.8" "v4.0.0" >/dev/null 2>&1; then echo "✗ missing Makefile accepted"; failed=1; else echo "✓ missing Makefile fails for a release cut before the move"; fi
  exit $failed
) || echo "✗ component version selection failed"
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
