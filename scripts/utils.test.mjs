// get_component_versions in utils.sh decides which agent, immucore and
// provider versions a Kairos release is documented with. A release that ships
// them uses its own version; an earlier release reads them from the
// kairos-init Makefile.
//
// The tests source utils.sh and replace the two functions that reach the
// network, so they need no access.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const utils = fileURLToPath(new URL('./utils.sh', import.meta.url));

const STUBS = `
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
    */kairos-init/refs/tags/v0.9.9/Makefile) printf 'AGENT_VERSION := v2.1.0\\nIMMUCORE_VERSION := v0.5.0\\nPROVIDER_KAIROS_VERSION := v1.2.3\\n' ;;
    *) return 22 ;;
  esac
}
`;

function componentVersions(kairosInitVersion, kairosVersion) {
  const script = `source "${utils}"\n${STUBS}\nget_component_versions "$1" "$2"`;
  const result = spawnSync('bash', ['-c', script, 'bash', kairosInitVersion, kairosVersion], {
    encoding: 'utf8',
  });
  return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}

test('a release that ships the components is documented with its own version', () => {
  const {status, stdout} = componentVersions('v9.9.9', 'v9.0.0');
  assert.equal(status, 0);
  const versions = JSON.parse(stdout);
  assert.equal(versions.agent_version, 'v9.0.0');
  assert.equal(versions.immucore_version, 'v9.0.0');
  assert.equal(versions.provider_version, 'v9.0.0');
});

test('a release that ships the components needs no kairos-init Makefile', () => {
  // v9.9.9 has no Makefile in the stub, like the archived kairos-init repository.
  assert.equal(componentVersions('v9.9.9', 'v9.0.0').status, 0);
});

test('an earlier release reads the versions from the kairos-init Makefile', () => {
  const {status, stdout} = componentVersions('v0.9.9', 'v4.0.0');
  assert.equal(status, 0);
  const versions = JSON.parse(stdout);
  assert.equal(versions.agent_version, 'v2.1.0');
  assert.equal(versions.immucore_version, 'v0.5.0');
  assert.equal(versions.provider_version, 'v1.2.3');
});

test('an earlier release without a Makefile is an error', () => {
  const {status, stderr} = componentVersions('v8.8.8', 'v4.0.0');
  assert.notEqual(status, 0);
  assert.match(stderr, /Failed to fetch Makefile/);
});
