import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildKairosImageName, buildKairosOciImageName} from './kairos-image-name.ts';

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
