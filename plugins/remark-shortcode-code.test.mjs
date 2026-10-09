import {test} from 'node:test';
import assert from 'node:assert/strict';
import remarkShortcodeCode from './remark-shortcode-code.ts';

const transform = remarkShortcodeCode();

function paragraph(...children) {
  return {type: 'root', children: [{type: 'paragraph', children}]};
}

function firstChild(tree) {
  return tree.children[0].children[0];
}

test('a fenced block carrying a shortcode becomes a flow ShortcodeCodeBlock', () => {
  const tree = {
    type: 'root',
    children: [
      {type: 'code', lang: 'bash', value: 'docker pull quay.io/kairos/kairos-init:{{< KairosInitVersion >}}'},
    ],
  };
  transform(tree);
  const node = tree.children[0];
  assert.equal(node.type, 'mdxJsxFlowElement');
  assert.equal(node.name, 'ShortcodeCodeBlock');
  assert.deepEqual(
    node.attributes.map((a) => a.name),
    ['language', 'template'],
  );
});

test('inline code carrying a shortcode becomes a text ShortcodeInlineCode', () => {
  const tree = paragraph(
    {type: 'text', value: 'use '},
    {type: 'inlineCode', value: 'COPY --from=quay.io/kairos/kairos-init:{{< KairosInitVersion >}} /kairos-init /kairos-init'},
    {type: 'text', value: ' instead'},
  );
  transform(tree);
  const node = tree.children[0].children[1];
  // A text element, not a flow one: a flow element inside a paragraph would
  // close the paragraph and break the sentence around it.
  assert.equal(node.type, 'mdxJsxTextElement');
  assert.equal(node.name, 'ShortcodeInlineCode');
  assert.deepEqual(
    node.attributes.map((a) => a.name),
    ['template'],
  );
  assert.equal(
    node.attributes[0].value,
    'COPY --from=quay.io/kairos/kairos-init:{{< KairosInitVersion >}} /kairos-init /kairos-init',
  );
  assert.equal(tree.children[0].children.length, 3);
});

test('inline code with extra whitespace in the shortcode is still matched', () => {
  const tree = paragraph({type: 'inlineCode', value: 'kairos-init:{{<  KairosInitVersion  >}}'});
  transform(tree);
  assert.equal(firstChild(tree).name, 'ShortcodeInlineCode');
});

test('inline code with no shortcode is left alone', () => {
  const tree = paragraph({type: 'inlineCode', value: 'kairos-agent install'});
  transform(tree);
  assert.equal(firstChild(tree).type, 'inlineCode');
});

test('every shortcode the fenced branch accepts is accepted inline too', () => {
  const shortcodes = [
    '{{< Image variant="core" >}}',
    '{{< OCI variant="core" >}}',
    '{{< OCITag variant="core" >}}',
    '{{< FlavorCode >}}',
    '{{< FlavorReleaseCode >}}',
    '{{< RegistryURL >}}',
    '{{< KairosVersion >}}',
    '{{< K3sVersion >}}',
    '{{< K3sVersionOCI >}}',
    '{{< ProviderVersion >}}',
    '{{< KairosInitVersion >}}',
    '{{< AuroraBootVersion >}}',
    '{{< OperatorVersion >}}',
    '{{< OperatorChartVersion >}}',
    '{{< GoogleImage >}}',
    '<ProviderVersion />',
  ];
  for (const value of shortcodes) {
    const tree = paragraph({type: 'inlineCode', value});
    transform(tree);
    assert.equal(firstChild(tree).name, 'ShortcodeInlineCode', `not matched inline: ${value}`);
  }
});

test('inline code nested below a paragraph is reached', () => {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'list',
        children: [
          {
            type: 'listItem',
            children: [
              {
                type: 'paragraph',
                children: [{type: 'inlineCode', value: '{{< KairosInitVersion >}}'}],
              },
            ],
          },
        ],
      },
    ],
  };
  transform(tree);
  assert.equal(
    tree.children[0].children[0].children[0].children[0].name,
    'ShortcodeInlineCode',
  );
});

test('a shortcode carrying an attribute is matched for every supported name', () => {
  // The gate decides whether renderTemplate ever sees the node, so a name it
  // misses is printed verbatim on the page. OCITag was the one name written
  // without the argument-tolerant form, and the four reset reference pages
  // call it with a variant. Assert the property for the whole list so the
  // next name added cannot regress the same way.
  const names = [
    'Image',
    'OCI',
    'OCITag',
    'FlavorCode',
    'FlavorReleaseCode',
    'RegistryURL',
    'KairosVersion',
    'K3sVersion',
    'K3sVersionOCI',
    'ProviderVersion',
    'KairosInitVersion',
    'AuroraBootVersion',
    'OperatorVersion',
    'OperatorChartVersion',
    'GoogleImage',
  ];
  for (const name of names) {
    const tree = {
      type: 'root',
      children: [{type: 'code', lang: 'yaml', value: `v: "{{< ${name} variant="standard" >}}"`}],
    };
    transform(tree);
    assert.equal(tree.children[0].name, 'ShortcodeCodeBlock', `not matched with an attribute: ${name}`);
  }
});

test('a name that only prefixes a supported shortcode is not matched', () => {
  // The alternation must not let OCI swallow OCITagged, or Image swallow
  // ImageFoo, now that the word boundary is shared by the whole list.
  for (const value of ['{{< OCITagged variant="core" >}}', '{{< ImageFoo >}}', '{{< Nope >}}']) {
    const tree = {type: 'root', children: [{type: 'code', lang: 'yaml', value}]};
    transform(tree);
    assert.equal(tree.children[0].type, 'code', `wrongly matched: ${value}`);
  }
});
