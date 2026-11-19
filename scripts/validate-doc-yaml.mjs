#!/usr/bin/env node

// Every ```yaml block in the docs is something a reader copies into a cloud
// config. Until now nothing parsed them, so a block could ship unreadable by
// any YAML parser: docs/reference/stage_modules.md carried an unterminated
// quote, and two pages labelled a shell heredoc as YAML.
//
// Blocks go through the site's own shortcode renderer first. The source of
// `source: "oci:{{< OCI variant="standard" >}}"` has nested double quotes and
// cannot parse, but no reader ever sees that form: remark rewrites the block
// to a ShortcodeCodeBlock, and the published page carries the expanded image
// name. Checking the raw source would report 45 failures, 35 of them blocks
// that render perfectly well.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {renderTemplate} from '../src/components/ShortcodeCodeBlock.render.ts';

// Walk the whole tree rather than name the doc directories. The site has
// eleven of them already (docs, getting-started, quickstart, hadron-docs,
// provider-kubernetes-docs, operator-docs and the versioned snapshots of
// each), and an enumerated list would quietly stop covering the next one.
const SKIPPED_DIRECTORIES = new Set(['.git', '.docusaurus', 'build', 'node_modules']);

// Fixed, representative values rather than the live ones from
// docusaurus.config.ts. This guard is about YAML syntax, and the syntax of a
// block cannot depend on which release the site currently points at. Fixing
// them also keeps the check offline, unlike validate-release-artifacts.
const RENDER_CONTEXT = {
  flavor: 'ubuntu',
  flavorRelease: '24.04',
  hadronFlavorRelease: 'v0.5.1',
  registryURL: 'quay.io/kairos',
  defaultKairosVersion: 'v4.3.0',
  defaultK3sVersion: 'v1.36.3+k3s1',
  providerVersion: 'v2.16.4',
  kairosInitVersion: 'v0.17.2',
  auroraBootVersion: 'v0.26.2',
  operatorVersion: 'v0.2.2',
};

const FENCE_OPEN_PATTERN = /^(\s*)(`{3,})\s*(ya?ml)\s*$/i;

// A fence inside a list item is indented, and it closes at that same indent.
// Matching a bare ``` anywhere would end the block at the first nested fence.
export function extractYamlBlocks(source) {
  const lines = source.split('\n');
  const blocks = [];

  for (let i = 0; i < lines.length; i += 1) {
    const open = FENCE_OPEN_PATTERN.exec(lines[i]);
    if (!open) {
      continue;
    }

    const [, indent, fence] = open;
    const closePattern = new RegExp(`^${indent}\`{${fence.length},}\\s*$`);
    const body = [];
    let j = i + 1;
    while (j < lines.length && !closePattern.test(lines[j])) {
      body.push(lines[j]);
      j += 1;
    }

    blocks.push({line: i + 1, body: body.join('\n')});
    i = j;
  }

  return blocks;
}

export function findInvalidBlocks(source, {render = renderTemplate} = {}) {
  const invalid = [];

  for (const block of extractYamlBlocks(source)) {
    const rendered = render({...RENDER_CONTEXT, template: block.body});
    try {
      // loadAll, not load: a block may legitimately hold several documents.
      yaml.loadAll(rendered);
    } catch (error) {
      invalid.push({line: block.line, reason: error.message.split('\n')[0]});
    }
  }

  return invalid;
}

export function listDocFiles(root, skipped = SKIPPED_DIRECTORIES) {
  const files = [];

  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!skipped.has(entry.name)) {
          walk(full);
        }
      } else if (/\.mdx?$/.test(entry.name)) {
        files.push(full);
      }
    }
  };

  walk(root);

  return files.sort();
}

function main() {
  const root = process.cwd();
  const failures = [];
  let checked = 0;

  for (const file of listDocFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    checked += extractYamlBlocks(source).length;
    for (const {line, reason} of findInvalidBlocks(source)) {
      failures.push(`${path.relative(root, file)}:${line} ${reason}`);
    }
  }

  if (failures.length > 0) {
    console.error(`${failures.length} of ${checked} YAML blocks do not parse:\n`);
    for (const failure of failures) {
      console.error(`  ${failure}`);
    }
    console.error('\nThe line number is the opening fence of the block.');
    process.exit(1);
  }

  console.log(`${checked} YAML blocks parse.`);
}

if (import.meta.filename === process.argv[1]) {
  main();
}
