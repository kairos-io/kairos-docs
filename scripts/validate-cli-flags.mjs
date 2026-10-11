#!/usr/bin/env node

// Checks that every kairos-init flag the documentation spells is a flag the
// binary registers. A name the binary does not know makes kairos-init exit 1,
// and most of these commands are meant to be pasted into a Dockerfile RUN
// line, where that fails the whole image build.
//
// The flag set is read from kairos-init's own source on the kairos default
// branch, so this check cannot drift the way a second copy of the list would.

import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';

export const FLAG_SOURCE = 'kairos-io/kairos kairos-init/main.go';

// Directories holding the documentation that is served today. The
// versioned_docs trees are frozen copies of older releases and are left alone.
const DOC_DIRS = [
  'docs',
  'getting-started',
  'quickstart',
  'operator-docs',
  'hadron-docs',
];

// Flag names that read as kairos-init's own rather than as any CLI's. One of
// these on a line is what tells us a list of flags in prose is about
// kairos-init and not about some other binary.
const DISTINCTIVE_FLAGS = new Set([
  'fips',
  'skip-step',
  'stage-extensions',
  'trusted',
]);

// Flag names cobra gives every command for free.
const BUILT_IN_FLAGS = ['help'];

// A flag name as cobra spells it: lower case, dash separated, with $NAME
// standing in for a value filled at registration time.
const FLAG_NAME = /^[a-z][a-z0-9-]*(?:\$[A-Z]+[a-z0-9-]*)*$/;

// Reads the flag names out of the cobra registrations. Every form in use
// (Var, VarP, BoolVar, StringVarP, String, StringSliceVarP) puts the flag name
// in a string literal, but not always in the same position, so take the first
// literal on the call that is shaped like a flag name. A registration whose
// name comes from a variable has no such literal and is skipped: those are the
// per provider flags, which the "provider-$NAME-..." registrations below them
// already describe.
export function extractFlagNames(source) {
  const names = new Set(BUILT_IN_FLAGS);
  const callRegex = /\.(?:Persistent)?Flags\(\)\.\w+\(([^\n]*)/g;

  let match;
  while ((match = callRegex.exec(source)) !== null) {
    const name = [...match[1].matchAll(/"([^"]*)"/g)]
      .map((literal) => literal[1])
      .find((value) => value.length > 1 && FLAG_NAME.test(value));
    if (name) {
      names.add(name);
    }
  }

  if (names.size <= BUILT_IN_FLAGS.length) {
    throw new Error(
      `No cobra flag registrations found in ${FLAG_SOURCE}. The CLI was ` +
        'probably restructured, so this check needs updating.',
    );
  }

  return names;
}

// A registration such as "provider-$NAME-version" stands for a family of
// flags whose middle segment is the provider name.
export function isKnownFlag(flag, knownNames) {
  if (knownNames.has(flag)) {
    return true;
  }

  for (const name of knownNames) {
    if (!name.includes('$')) {
      continue;
    }
    const pattern = new RegExp(
      `^${name.split(/\$[A-Z]+/).map(escapeForRegex).join('.+')}$`,
    );
    if (pattern.test(flag)) {
      return true;
    }
  }

  return false;
}

function escapeForRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Joins shell line continuations so that a flag on the second line of a
// multi-line RUN is still seen as part of the same command.
export function logicalLines(content) {
  const out = [];
  let buffer = '';
  let bufferStart = 0;

  content.split('\n').forEach((raw, index) => {
    const continues = /\\\s*$/.test(raw);
    const text = continues ? raw.replace(/\s*\\\s*$/, '') : raw;

    if (buffer === '') {
      bufferStart = index + 1;
    }
    buffer += buffer === '' ? text : ` ${text}`;

    if (!continues) {
      out.push({line: bufferStart, text: buffer});
      buffer = '';
    }
  });

  if (buffer !== '') {
    out.push({line: bufferStart, text: buffer});
  }

  return out;
}

// A flag whose name is partly a shell variable, such as
// --provider-"${PROVIDER_NAME}"-version, is spelled by the reader's own
// substitution and cannot be checked against a fixed list.
function longFlagsIn(text) {
  return [...text.matchAll(/--([a-zA-Z][a-zA-Z0-9-]*)(.?)/g)]
    .filter(([, , next]) => !['"', "'", '$', '{'].includes(next))
    .map(([, flag]) => flag);
}

// Two ways a kairos-init flag appears in the documentation. In a command,
// where everything from the kairos-init token to the end of that command is
// its own; and in a sentence listing flags, which carries no command at all
// and writes each flag in inline code. A flag only kairos-init has is what
// tells us such a sentence is about kairos-init and not about some other
// binary.
export function flagsUsedOn(text) {
  const invocation = text.match(/(?:^|[\s`'"/])kairos-init(\s.*)$/);
  if (invocation) {
    const tail = invocation[1].split(/[|>;`]|&&/)[0];
    return [...new Set(longFlagsIn(tail))];
  }

  const quoted = [...text.matchAll(/`(--[a-zA-Z][a-zA-Z0-9-]*)`/g)].map(
    ([, flag]) => flag.slice(2),
  );
  if (quoted.some((flag) => DISTINCTIVE_FLAGS.has(flag))) {
    return [...new Set(quoted)];
  }

  return [];
}

export function findUnknownFlags(files, knownNames, readFile) {
  const problems = [];

  for (const file of files) {
    for (const {line, text} of logicalLines(readFile(file))) {
      for (const flag of flagsUsedOn(text)) {
        if (!isKnownFlag(flag, knownNames)) {
          problems.push({file, line, flag});
        }
      }
    }
  }

  return problems;
}

function listDocFiles(root) {
  const files = [];

  for (const dir of DOC_DIRS) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) {
      continue;
    }
    for (const entry of fs.readdirSync(base, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
        files.push(path.relative(root, path.join(entry.parentPath, entry.name)));
      }
    }
  }

  return files.sort();
}

function readFlagSource() {
  return execSync(
    'gh api repos/kairos-io/kairos/contents/kairos-init/main.go ' +
      '-H "Accept: application/vnd.github.raw"',
    {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024},
  );
}

function main() {
  const knownNames = extractFlagNames(readFlagSource());
  const root = process.cwd();
  const files = listDocFiles(root);
  const problems = findUnknownFlags(files, knownNames, (file) =>
    fs.readFileSync(path.join(root, file), 'utf8'),
  );

  if (problems.length > 0) {
    console.error('kairos-init flags the binary does not register:\n');
    for (const {file, line, flag} of problems) {
      console.error(`  ${file}:${line}: --${flag}`);
    }
    console.error(
      `\nkairos-init registers: ${[...knownNames]
        .sort()
        .map((name) => `--${name}`)
        .join(', ')}`,
    );
    process.exit(1);
  }

  console.log(
    `Checked ${files.length} pages against ${knownNames.size} kairos-init flags. No unknown flags.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
