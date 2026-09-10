import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDocsVersionFromPath, getOperatorVersionFromPath} from './versionedCustomFields.helpers.ts';

test('getDocsVersionFromPath returns the version for /docs/vX.Y.Z/ paths', () => {
  assert.equal(getDocsVersionFromPath('/docs/v4.2.0/'), 'v4.2.0');
  assert.equal(getDocsVersionFromPath('/docs/v4.2.0/installation/automated'), 'v4.2.0');
});

test('getDocsVersionFromPath returns null for the current (unversioned) docs path', () => {
  assert.equal(getDocsVersionFromPath('/docs/'), null);
  assert.equal(getDocsVersionFromPath('/docs/installation/automated'), null);
});

test('getDocsVersionFromPath returns null for non-docs paths, including operator-docs', () => {
  assert.equal(getDocsVersionFromPath('/'), null);
  assert.equal(getDocsVersionFromPath('/operator-docs/v0.2.2/'), null);
  assert.equal(getDocsVersionFromPath('/blog/2025-07-25-release-v3.5.0'), null);
});

test('getOperatorVersionFromPath returns the version for /operator-docs/vX.Y.Z/ paths', () => {
  assert.equal(getOperatorVersionFromPath('/operator-docs/v0.2.2/'), 'v0.2.2');
  assert.equal(getOperatorVersionFromPath('/operator-docs/v0.2.2/installation'), 'v0.2.2');
  assert.equal(getOperatorVersionFromPath('/operator-docs/v0.0.7/nodeop'), 'v0.0.7');
});

test('getOperatorVersionFromPath returns null for the current (unversioned) operator-docs path', () => {
  assert.equal(getOperatorVersionFromPath('/operator-docs/'), null);
  assert.equal(getOperatorVersionFromPath('/operator-docs/installation'), null);
});

test('getOperatorVersionFromPath returns null for non-operator paths', () => {
  assert.equal(getOperatorVersionFromPath('/'), null);
  assert.equal(getOperatorVersionFromPath('/docs/v4.2.0/'), null);
});
