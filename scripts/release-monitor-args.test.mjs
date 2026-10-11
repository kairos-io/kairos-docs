// The Release Monitor workflow turns its dispatch inputs into the argument
// vector release-automation.sh is called with. The script takes one flag per
// argument and treats anything it does not recognise as fatal, so a step that
// collapses the flags into a single argument fails every manual run.
//
// These tests run the step's own shell against a stub script that records
// what it was called with. The workflow file is the code under test: the
// step body is read out of it and executed, not matched against a pattern.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const workflow = path.join(repoRoot, '.github', 'workflows', 'release-monitor.yml');
const automation = path.join(repoRoot, 'scripts', 'release-automation.sh');

const STEP_NAME = 'Run release automation';

// stepRunBody returns the shell of the named step's `run:` block, dedented.
// GitHub expands `${{ ... }}` before the shell ever sees it; the step under
// test has none left in its body, and one appearing again would be a
// regression on its own, so it is rejected here.
function stepRunBody(file, stepName) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === `- name: ${stepName}`);
  assert.notEqual(start, -1, `no step named ${stepName} in ${file}`);
  const runAt = lines.findIndex((l, i) => i > start && l.trim() === 'run: |');
  assert.notEqual(runAt, -1, `step ${stepName} has no block-scalar run:`);
  const indent = lines[runAt].length - lines[runAt].trimStart().length + 2;
  const body = [];
  for (let i = runAt + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      body.push('');
      continue;
    }
    if (line.length - line.trimStart().length < indent) break;
    body.push(line.slice(indent));
  }
  const text = body.join('\n');
  assert.ok(!text.includes('${{'), 'the step body must not interpolate workflow expressions into the shell');
  return text;
}

// runStep executes the step body in a throwaway tree whose
// scripts/release-automation.sh records its arguments, one per line, and
// returns them.
function runStep(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-monitor-'));
  try {
    const argsFile = path.join(dir, 'args');
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.writeFileSync(
      path.join(dir, 'scripts', 'release-automation.sh'),
      `#!/bin/bash\nfor a in "$@"; do printf '%s\\n' "$a"; done > ${JSON.stringify(argsFile)}\n`,
      {mode: 0o755},
    );
    fs.writeFileSync(path.join(dir, 'step.sh'), stepRunBody(workflow, STEP_NAME));
    // GitHub runs a `run:` block with `bash -e {0}`.
    execFileSync('bash', ['-e', 'step.sh'], {cwd: dir, env: {PATH: process.env.PATH, ...env}});
    return fs.readFileSync(argsFile, 'utf8').split('\n').filter((l) => l !== '');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

test('a scheduled run asks for verbose output and nothing else', () => {
  assert.deepEqual(runStep({GITHUB_EVENT_NAME: 'schedule'}), ['--verbose']);
});

test('a dispatch with a version passes the version as its own argument', () => {
  assert.deepEqual(
    runStep({GITHUB_EVENT_NAME: 'workflow_dispatch', INPUT_VERSION: 'v9.9.9', INPUT_DRY_RUN: 'false'}),
    ['--verbose', '--version', 'v9.9.9'],
  );
});

test('a dispatch with a version and a dry run passes four separate arguments', () => {
  assert.deepEqual(
    runStep({GITHUB_EVENT_NAME: 'workflow_dispatch', INPUT_VERSION: 'v9.9.9', INPUT_DRY_RUN: 'true'}),
    ['--verbose', '--version', 'v9.9.9', '--dry-run'],
  );
});

test('a dispatch with blank inputs is the scheduled argument vector', () => {
  assert.deepEqual(
    runStep({GITHUB_EVENT_NAME: 'workflow_dispatch', INPUT_VERSION: '', INPUT_DRY_RUN: 'false'}),
    ['--verbose'],
  );
});

test('a version holding a space stays one argument', () => {
  assert.deepEqual(
    runStep({GITHUB_EVENT_NAME: 'workflow_dispatch', INPUT_VERSION: 'v9.9.9 --push=false', INPUT_DRY_RUN: 'false'}),
    ['--verbose', '--version', 'v9.9.9 --push=false'],
  );
});

// Why the arguments have to be separate: this is what the step used to send.
test('release-automation.sh rejects every flag collapsed into one argument', () => {
  let err;
  try {
    execFileSync('bash', [automation, '--verbose --version v9.9.9 --dry-run'], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
  } catch (e) {
    err = e;
  }
  assert.ok(err, 'the script accepted a single mashed argument');
  assert.equal(err.status, 1);
  assert.match(err.stderr.toString(), /Unknown option: --verbose --version v9\.9\.9 --dry-run/);
});
