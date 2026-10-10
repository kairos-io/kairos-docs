import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const SCRIPT = fileURLToPath(new URL('./update-docusaurus-config.mjs', import.meta.url));

// A minimal but representative docusaurus.config.ts. It carries a hadron-based
// template version (v4.0.3) and a target version (v4.1.1) whose flavorOptions
// still points at the old hadron const, plus an OS-flavor version (v3.7.2)
// whose curated list must be left untouched.
const FIXTURE_CONFIG = `const v372FlavorOptions = [
  {family: 'ubuntu', flavor: 'ubuntu', flavorRelease: '24.04', label: 'Ubuntu 24.04'},
  {family: 'hadron', flavor: 'hadron', flavorRelease: '0.0.1', label: 'Hadron 0.0.1'},
] as const;

const hadronFlavorOptionsV403 = [
  {family: 'hadron', flavor: 'hadron', flavorRelease: 'v0.0.4', label: 'Hadron v0.0.4'},
] as const;

const docsVersionCustomFields = {
  'v4.1.1': {
    registryURL: 'quay.io/kairos',
    hadronFlavorRelease: 'v0.0.4',
    k3sVersion: 'v1.35.2+k3s1',
    k0sVersion: 'v1.34.3+k0s.0',
    flavorOptions: hadronFlavorOptionsV403,
    providerVersion: 'v2.14.2',
    auroraBootVersion: 'v0.20.0',
    kairosInitVersion: 'v0.8.4',
  },
  'v4.0.3': {
    registryURL: 'quay.io/kairos',
    hadronFlavorRelease: 'v0.0.4',
    k3sVersion: 'v1.35.2+k3s1',
    k0sVersion: 'v1.34.3+k0s.0',
    flavorOptions: hadronFlavorOptionsV403,
    providerVersion: 'v2.14.2',
    auroraBootVersion: 'v0.20.0',
    kairosInitVersion: 'v0.8.4',
  },
  'v3.7.2': {
    registryURL: 'quay.io/kairos',
    hadronFlavorRelease: '0.0.1',
    k3sVersion: 'v1.35.0+k3s3',
    k0sVersion: 'v1.34.3+k0s.0',
    flavorOptions: v372FlavorOptions,
    providerVersion: 'v2.14.0',
    auroraBootVersion: 'v0.14.0',
    kairosInitVersion: 'v0.7.0',
  },
} as const;

const announcementBar = {
  content: '<a href="https://github.com/kairos-io/kairos/releases/tag/v4.0.3">Kairos v4.0.3</a> is out! 🚀',
};
`;

// A config whose template (newest non-target) version genuinely has no hadron
// flavor: hadronFlavorRelease is null and flavorOptions is an OS list.
const FIXTURE_CONFIG_NO_HADRON = `const v372FlavorOptions = [
  {family: 'ubuntu', flavor: 'ubuntu', flavorRelease: '24.04', label: 'Ubuntu 24.04'},
] as const;

const docsVersionCustomFields = {
  'v4.1.1': {
    registryURL: 'quay.io/kairos',
    hadronFlavorRelease: null,
    k3sVersion: 'v1.35.0+k3s3',
    k0sVersion: 'v1.34.3+k0s.0',
    flavorOptions: v372FlavorOptions,
    providerVersion: 'v2.14.0',
    auroraBootVersion: 'v0.14.0',
    kairosInitVersion: 'v0.7.0',
  },
  'v3.7.2': {
    registryURL: 'quay.io/kairos',
    hadronFlavorRelease: null,
    k3sVersion: 'v1.35.0+k3s3',
    k0sVersion: 'v1.34.3+k0s.0',
    flavorOptions: v372FlavorOptions,
    providerVersion: 'v2.14.0',
    auroraBootVersion: 'v0.14.0',
    kairosInitVersion: 'v0.7.0',
  },
} as const;

const announcementBar = {
  content: '<a href="https://github.com/kairos-io/kairos/releases/tag/v3.7.2">Kairos v3.7.2</a> is out! 🚀',
};
`;

function setupFixture(versions = ['v4.1.1', 'v4.0.3', 'v3.7.2'], config = FIXTURE_CONFIG) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-cfg-'));
  fs.writeFileSync(path.join(dir, 'docusaurus.config.ts'), config);
  for (const v of versions) {
    fs.mkdirSync(path.join(dir, 'versioned_docs', `version-${v}`), {recursive: true});
  }
  return dir;
}

function run(dir, env) {
  execFileSync(process.execPath, [SCRIPT], {cwd: dir, env: {...process.env, ...env}});
  return fs.readFileSync(path.join(dir, 'docusaurus.config.ts'), 'utf8');
}

// Pull the flavorOptions identifier referenced by a given version block.
function flavorOptionsRefFor(config, version) {
  const block = config.match(
    new RegExp(`'${version.replace(/\./g, '\\.')}':\\s*\\{[\\s\\S]*?flavorOptions:\\s*([A-Za-z0-9_]+)`),
  );
  return block ? block[1] : null;
}

test('updates hadronFlavorRelease for the target version', () => {
  const dir = setupFixture();
  const out = run(dir, {TARGET_VERSION: 'v4.1.1', HADRON_VERSION: 'v0.3.0'});
  const block = out.match(/'v4\.1\.1':\s*\{[\s\S]*?hadronFlavorRelease:\s*'([^']*)'/);
  assert.equal(block?.[1], 'v0.3.0');
});

test('leaves the OS-flavor curated list (v3.7.2) untouched', () => {
  const dir = setupFixture();
  const out = run(dir, {TARGET_VERSION: 'v4.1.1', HADRON_VERSION: 'v0.3.0'});
  assert.equal(flavorOptionsRefFor(out, 'v3.7.2'), 'v372FlavorOptions');
  assert.match(out, /const v372FlavorOptions = \[/);
});

test('refreshes the announcement banner to the target version', () => {
  const dir = setupFixture();
  const out = run(dir, {TARGET_VERSION: 'v4.1.1', HADRON_VERSION: 'v0.3.0'});
  assert.match(out, /Kairos v4\.1\.1<\/a> is out!/);
});

// The core regression: the generated flavorOptions for the target must list the
// hadron release that hadronFlavorRelease was set to, not the template's stale
// hadron version. The release validator builds expected artifacts from
// flavorOptions[].flavorRelease, so the two must agree.
test('generates a per-version hadron flavor const matching hadronFlavorRelease', () => {
  const dir = setupFixture();
  const out = run(dir, {TARGET_VERSION: 'v4.1.1', HADRON_VERSION: 'v0.3.0'});

  // v4.1.1 must reference a dedicated const, not the template's hadronFlavorOptionsV403.
  const ref = flavorOptionsRefFor(out, 'v4.1.1');
  assert.equal(ref, 'hadronFlavorOptionsV411');

  // That const must exist and carry the v0.3.0 hadron release.
  const constMatch = out.match(
    /const hadronFlavorOptionsV411 = \[([\s\S]*?)\] as const;/,
  );
  assert.ok(constMatch, 'expected a hadronFlavorOptionsV411 const to be generated');
  assert.match(constMatch[1], /flavorRelease:\s*'v0\.3\.0'/);
  assert.match(constMatch[1], /family:\s*'hadron'/);
  assert.match(constMatch[1], /label:\s*'Hadron v0\.3\.0'/);
});

// Re-running the automation must not duplicate the const or drift the result.
test('is idempotent across repeated runs', () => {
  const dir = setupFixture();
  const first = run(dir, {TARGET_VERSION: 'v4.1.1', HADRON_VERSION: 'v0.3.0'});
  const second = run(dir, {TARGET_VERSION: 'v4.1.1', HADRON_VERSION: 'v0.3.0'});
  assert.equal(first, second);
  const occurrences = second.match(/const hadronFlavorOptionsV411 = \[/g) ?? [];
  assert.equal(occurrences.length, 1);
});

// When a release has no hadron flavor at all, fall back to copying the
// template's flavorOptions reference (the existing behavior).
test('falls back to the template flavorOptions when there is no hadron release', () => {
  const dir = setupFixture(['v4.1.1', 'v3.7.2'], FIXTURE_CONFIG_NO_HADRON);
  const out = run(dir, {TARGET_VERSION: 'v4.1.1', HADRON_VERSION: ''});
  assert.equal(flavorOptionsRefFor(out, 'v4.1.1'), 'v372FlavorOptions');
  assert.doesNotMatch(out, /hadronFlavorOptionsV411/);
});
