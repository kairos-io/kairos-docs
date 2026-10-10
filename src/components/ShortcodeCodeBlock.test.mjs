import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderTemplate} from './ShortcodeCodeBlock.render.ts';

const context = {
  flavor: 'ubuntu',
  flavorRelease: '24.04',
  hadronFlavorRelease: 'v0.5.1',
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

test('renderTemplate strips the leading v for OperatorChartVersion', () => {
  const template = '--version {{< OperatorChartVersion >}}';
  assert.equal(render(template), '--version 0.2.2');
});

test('renderTemplate leaves OperatorChartVersion unchanged if the operator version has no v prefix', () => {
  const template = 'tag: "{{< OperatorChartVersion >}}"';
  assert.equal(render(template, {operatorVersion: '0.3.0'}), 'tag: "0.3.0"');
});

test('renderTemplate replaces {{< GoogleImage >}} with the image name the pipeline publishes', () => {
  // Reproduces kairos-io/kairos#3644: the GCE page shipped a gcloud command
  // whose --image was a hardcoded ubuntu-24-04 prefix plus an unsubstituted
  // GoogleVersion shortcode, so it named an image that does not exist. The
  // pipeline builds from a hadron container and sanitizes dots to dashes.
  const template = 'gcloud --image=projects/palette-kairos/global/images/{{< GoogleImage >}}';
  assert.equal(
    render(template, {defaultKairosVersion: 'v4.3.0'}),
    'gcloud --image=projects/palette-kairos/global/images/' +
      'kairos-hadron-v0-5-1-core-amd64-generic-v4-3-0',
  );
});

test('renderTemplate leaves no shortcode behind for GoogleImage', () => {
  const out = render('{{< GoogleImage >}}', {defaultKairosVersion: 'v4.3.0'});
  assert.equal(out, 'kairos-hadron-v0-5-1-core-amd64-generic-v4-3-0');
  assert.ok(!out.includes('{{<'), 'shortcode should be fully substituted');
});

test('renderTemplate tracks the hadron version of each docs version for GoogleImage', () => {
  // The published name carries the hadron release the kairos release was built
  // with, resolved by .github/public-cloud/resolve-hadron-container-image.sh.
  assert.equal(
    render('{{< GoogleImage >}}', {hadronFlavorRelease: 'v0.4.0', defaultKairosVersion: 'v4.1.2'}),
    'kairos-hadron-v0-4-0-core-amd64-generic-v4-1-2',
  );
  assert.equal(
    render('{{< GoogleImage >}}', {hadronFlavorRelease: 'v0.0.4', defaultKairosVersion: 'v4.0.3'}),
    'kairos-hadron-v0-0-4-core-amd64-generic-v4-0-3',
  );
});

test('renderTemplate ignores the flavor selector for GoogleImage', () => {
  // Only one image is published. A reader switching the page's flavor must not
  // be handed the name of an image the pipeline never created.
  assert.equal(
    render('{{< GoogleImage >}}', {
      flavor: 'opensuse',
      flavorRelease: 'leap-15.6',
      defaultKairosVersion: 'v4.3.0',
    }),
    'kairos-hadron-v0-5-1-core-amd64-generic-v4-3-0',
  );
});

test('renderTemplate leaves GoogleImage untouched for a docs version predating hadron', () => {
  assert.equal(render('{{< GoogleImage >}}', {hadronFlavorRelease: null}), '{{< GoogleImage >}}');
});

test('renderTemplate renders GoogleImage and KairosVersion differently in one template', () => {
  // The GCE page uses both: the image name needs the sanitized form, the
  // reset-source OCI reference needs the real tag.
  assert.equal(
    render('{{< GoogleImage >}} and {{< KairosVersion >}}', {defaultKairosVersion: 'v4.3.0'}),
    'kairos-hadron-v0-5-1-core-amd64-generic-v4-3-0 and v4.3.0',
  );
});

test('renderTemplate substitutes every GoogleImage occurrence, not just the first', () => {
  // Guards the /g flag: a non-global regex would leave the second in place.
  assert.equal(
    render('{{< GoogleImage >}} {{< GoogleImage >}}', {defaultKairosVersion: 'v4.3.0'}),
    'kairos-hadron-v0-5-1-core-amd64-generic-v4-3-0 ' +
      'kairos-hadron-v0-5-1-core-amd64-generic-v4-3-0',
  );
});
