import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {extractYamlBlocks, findInvalidBlocks, listDocFiles} from './validate-doc-yaml.mjs';

test('extractYamlBlocks reports the line of the opening fence', () => {
  const source = ['# Title', '', '```yaml', 'a: 1', '```', ''].join('\n');

  assert.deepEqual(extractYamlBlocks(source), [{line: 3, body: 'a: 1'}]);
});

test('extractYamlBlocks takes yml as well as yaml, in any case', () => {
  const source = ['```YML', 'a: 1', '```'].join('\n');

  assert.equal(extractYamlBlocks(source).length, 1);
});

test('extractYamlBlocks leaves other languages alone', () => {
  const source = ['```bash', 'echo a:', '```', '', '```', 'a:', '```'].join('\n');

  assert.deepEqual(extractYamlBlocks(source), []);
});

test('an indented block closes at its own indent, not at a nested fence', () => {
  const source = [
    '- A list item:',
    '',
    '  ```yaml',
    '  outer: true',
    '  nested: |',
    '    ```',
    '  still: outer',
    '  ```',
    '',
    'After.',
  ].join('\n');

  const blocks = extractYamlBlocks(source);
  assert.equal(blocks.length, 1);
  assert.match(blocks[0].body, /still: outer/);
});

test('an unterminated double quote is invalid', () => {
  // The defect this guard was written for: docs/reference/stage_modules.md
  // shipped a users example whose homedir value never closed its quote.
  const source = [
    '```yaml',
    '#cloud-config',
    'stages:',
    '  boot:',
    '    - name: "Setup users"',
    '      users:',
    '        bastion:',
    '          homedir: "/home/foo',
    '```',
  ].join('\n');

  const invalid = findInvalidBlocks(source);
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].line, 1);
});

test('a shell heredoc labelled yaml is invalid', () => {
  // docs/reference/auroraboot.md labelled a `cat <<EOF | docker run` snippet
  // as YAML. It is a bash block, and the fence should say so.
  const source = [
    '```yaml',
    'cat <<EOF | docker run --rm -i auroraboot --cloud-config -',
    '#cloud-config',
    'install:',
    '  auto: true',
    'EOF',
    '```',
  ].join('\n');

  assert.equal(findInvalidBlocks(source).length, 1);
});

test('... used as an elision is invalid, it ends the document', () => {
  const source = ['```yaml', 'spec:', '  azureImage: true', '  ...', '```'].join('\n');

  assert.equal(findInvalidBlocks(source).length, 1);
});

test('a comment reading # ... is a valid elision', () => {
  const source = ['```yaml', 'spec:', '  azureImage: true', '  # ...', '```'].join('\n');

  assert.deepEqual(findInvalidBlocks(source), []);
});

test('a block holding several documents is valid', () => {
  const source = ['```yaml', 'kind: One', '---', 'kind: Two', '```'].join('\n');

  assert.deepEqual(findInvalidBlocks(source), []);
});

test('shortcodes are expanded before the block is parsed', () => {
  // Raw, this block has double quotes nested inside a double quoted scalar and
  // cannot parse. The published page never carries that form: remark hands the
  // block to ShortcodeCodeBlock, which substitutes the image name. Checking the
  // raw source would fail a block every reader sees rendered correctly.
  const source = [
    '```yaml',
    '#cloud-config',
    'install:',
    '  source: "oci:{{< OCI variant="standard" >}}"',
    '```',
  ].join('\n');

  assert.deepEqual(findInvalidBlocks(source), []);
});

test('an unexpanded shortcode still has to leave the block parseable', () => {
  const source = ['```yaml', 'image: "{{< Image >}}"', '```'].join('\n');

  assert.deepEqual(findInvalidBlocks(source), []);
});

test('listDocFiles collects md and mdx, and skips node_modules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-yaml-'));
  try {
    fs.mkdirSync(path.join(root, 'docs', 'nested'), {recursive: true});
    fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), {recursive: true});
    fs.writeFileSync(path.join(root, 'docs', 'a.md'), '');
    fs.writeFileSync(path.join(root, 'docs', 'nested', 'b.mdx'), '');
    fs.writeFileSync(path.join(root, 'docs', 'c.txt'), '');
    fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'README.md'), '');

    assert.deepEqual(
      listDocFiles(root).map((file) => path.relative(root, file)),
      [path.join('docs', 'a.md'), path.join('docs', 'nested', 'b.mdx')],
    );
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
