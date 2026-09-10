import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderTemplate} from './ShortcodeCodeBlock.render.ts';

const context = {
  flavor: 'ubuntu',
  flavorRelease: '24.04',
  registryURL: 'quay.io/kairos',
  defaultKairosVersion: 'v4.2.0',
  defaultK3sVersion: 'v1.36.3+k3s1',
  providerVersion: 'v2.16.4',
  kairosInitVersion: 'v0.17.2',
  auroraBootVersion: 'v0.26.2',
  operatorVersion: 'v0.2.2',
};

function render(template, overrides = {}) {
  return renderTemplate({...context, ...overrides, template});
}

test('renderTemplate replaces {{< OperatorVersion >}} with the resolved operator version', () => {
  const template = 'targetRevision: {{< OperatorVersion >}}\n';
  assert.equal(render(template), 'targetRevision: v0.2.2\n');
});

test('renderTemplate leaves other shortcodes intact when replacing OperatorVersion', () => {
  const template = '{{< OperatorVersion >}} pairs with {{< KairosVersion >}}';
  assert.equal(render(template), 'v0.2.2 pairs with v4.2.0');
});

test('renderTemplate substitutes OperatorVersion in older-version contexts', () => {
  const template = 'chart: kairos-operator@{{< OperatorVersion >}}';
  assert.equal(render(template, {operatorVersion: 'v0.0.7'}), 'chart: kairos-operator@v0.0.7');
});
