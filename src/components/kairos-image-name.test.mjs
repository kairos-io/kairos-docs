import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleImageName,
  buildKairosImageName,
  buildKairosOciImageName,
} from './kairos-image-name.ts';

test('buildKairosImageName builds standard ISO filename with k3s segment', () => {
  const name = buildKairosImageName({
    variant: 'standard',
    arch: 'amd64',
    model: 'generic',
    kairosVersion: 'v4.1.2',
    k3sVersion: 'v1.36.1+k3s1',
    flavor: 'ubuntu',
    flavorRelease: '24.04',
  });
  // ISO filenames keep the legacy k3sv<version>+k3s1 form (no dash, '+' preserved).
  assert.equal(name, 'kairos-ubuntu-24.04-standard-amd64-generic-v4.1.2-k3sv1.36.1+k3s1');
});

test('buildKairosImageName omits k3s segment for non-standard variant', () => {
  const name = buildKairosImageName({
    variant: 'core',
    kairosVersion: 'v4.1.2',
    k3sVersion: 'v1.36.1+k3s1',
    flavor: 'ubuntu',
    flavorRelease: '24.04',
  });
  assert.equal(name, 'kairos-ubuntu-24.04-core-amd64-generic-v4.1.2');
});

test('buildKairosOciImageName builds a pullable standard OCI reference', () => {
  // Reproduces kairos-io/kairos#4194: the OCI tag must read
  // ...-v4.1.2-k3s-v1.36.1-k3s1 (dash after k3s, '+' replaced by '-'),
  // not the unpullable ...-v4.1.2-k3sv1.36.1-k3s1.
  const ref = buildKairosOciImageName({
    registryURL: 'quay.io/kairos',
    flavor: 'hadron',
    flavorRelease: 'v0.4.0',
    variant: 'standard',
    arch: 'amd64',
    model: 'generic',
    kairosVersion: 'v4.1.2',
    k3sVersion: 'v1.36.1+k3s1',
  });
  assert.equal(
    ref,
    'quay.io/kairos/hadron:v0.4.0-standard-amd64-generic-v4.1.2-k3s-v1.36.1-k3s1',
  );
});

test('buildKairosOciImageName omits k3s segment for non-standard variant', () => {
  const ref = buildKairosOciImageName({
    registryURL: 'quay.io/kairos',
    flavor: 'ubuntu',
    flavorRelease: '24.04',
    variant: 'core',
    kairosVersion: 'v4.1.2',
    k3sVersion: 'v1.36.1+k3s1',
  });
  assert.equal(ref, 'quay.io/kairos/ubuntu:24.04-core-amd64-generic-v4.1.2');
});

test('buildKairosOciImageName appends an optional suffix', () => {
  const ref = buildKairosOciImageName({
    registryURL: 'quay.io/kairos',
    flavor: 'hadron',
    flavorRelease: 'v0.4.0',
    variant: 'standard',
    kairosVersion: 'v4.1.2',
    k3sVersion: 'v1.36.1+k3s1',
    suffix: 'uki',
  });
  assert.equal(
    ref,
    'quay.io/kairos/hadron:v0.4.0-standard-amd64-generic-v4.1.2-k3s-v1.36.1-k3s1-uki',
  );
});

test('buildGoogleImageName matches what upload-image-to-gcp.sh creates', () => {
  // The pipeline builds the raw disk from the hadron container the release was
  // built with, names it from /etc/kairos-release
  // (FLAVOR=hadron FLAVOR_RELEASE=v0.5.1 VARIANT=core ARCH=amd64
  // MODEL=generic VERSION=v4.3.0), then sanitizeString runs the filename
  // through `tr '.' '-'` because GCE resource names cannot contain dots.
  assert.equal(
    buildGoogleImageName({hadronFlavorRelease: 'v0.5.1', kairosVersion: 'v4.3.0'}),
    'kairos-hadron-v0-5-1-core-amd64-generic-v4-3-0',
  );
});

test('buildGoogleImageName leaves no dots for GCE to reject', () => {
  const name = buildGoogleImageName({hadronFlavorRelease: 'v0.0.4', kairosVersion: 'v4.0.3'});
  assert.equal(name, 'kairos-hadron-v0-0-4-core-amd64-generic-v4-0-3');
  assert.ok(!name.includes('.'), 'GCE resource names cannot contain dots');
});

test('buildGoogleImageName never adds a k3s segment', () => {
  // Only the core variant is published, so no k3s version can leak into the name.
  assert.equal(
    buildGoogleImageName({hadronFlavorRelease: 'v0.4.0', kairosVersion: 'v4.1.2'}),
    'kairos-hadron-v0-4-0-core-amd64-generic-v4-1-2',
  );
});
