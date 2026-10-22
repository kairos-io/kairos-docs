import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
  extractFlagNames,
  findUnknownFlags,
  flagsUsedOn,
  isKnownFlag,
  logicalLines,
} from './validate-cli-flags.mjs';

// The registration forms kairos-init actually uses, including the two whose
// flag name is a variable rather than a literal.
const FIXTURE_SOURCE = `
	rootCmd.Flags().String(flagName, "", fmt.Sprintf("Version for provider %s", provider))
	rootCmd.Flags().String("provider-$NAME-version", "", "Version for provider $NAME set by --provider/-p flag")
	rootCmd.Flags().VarP(stageFlag, "stage", "s", fmt.Sprintf("set the stage to run (%s)", strings.Join(stageFlag.Allowed, ", ")))
	rootCmd.Flags().StringSliceVarP(&providers, "provider", "p", []string{}, "Provider plugin (repeatable)")
	rootCmd.Flags().BoolVar(&config.DefaultConfig.Fips, "fips", false, "use fips kairos binary versions")
	rootCmd.Flags().Var(skipStepsFlag, "skip-step", "Skip one or more steps, for example: --skip-step initrd,workarounds")
	cmd.Flags().StringVarP(&trusted, "trusted", "t", "false", "init the system for Trusted Boot")
	if f := cmd.Flags().Lookup(flagName); f != nil {
`;

const KNOWN = extractFlagNames(FIXTURE_SOURCE);

test('reads a flag name out of every registration form', () => {
  assert.deepEqual(
    [...KNOWN].sort(),
    [
      'fips',
      'help',
      'provider',
      'provider-$NAME-version',
      'skip-step',
      'stage',
      'trusted',
    ],
  );
});

test('does not mistake a usage string for a flag name', () => {
  assert.equal(KNOWN.has('Version for provider %s'), false);
});

test('a $NAME registration stands for the whole family', () => {
  assert.equal(isKnownFlag('provider-k3s-version', KNOWN), true);
  assert.equal(isKnownFlag('provider-k0s-version', KNOWN), true);
  assert.equal(isKnownFlag('provider-k3s-config', KNOWN), false);
});

test('reads the flags of a command', () => {
  assert.deepEqual(
    flagsUsedOn('kairos-init --skip-step cisHardening --version v0.0.1'),
    ['skip-step', 'version'],
  );
});

test('leaves the flags of the command that invokes kairos-init alone', () => {
  assert.deepEqual(
    flagsUsedOn(
      'RUN --mount=type=bind,src=/kairos-init,dst=/kairos-init /kairos-init --fips',
    ),
    ['fips'],
  );
});

test('stops at the end of the kairos-init command', () => {
  assert.deepEqual(flagsUsedOn('kairos-init --fips | tee --output log'), [
    'fips',
  ]);
});

test('skips a flag whose name the reader substitutes', () => {
  assert.deepEqual(
    flagsUsedOn('kairos-init --provider-"${NAME}"-version v1.0.0'),
    [],
  );
});

test('reads a sentence that lists kairos-init flags', () => {
  assert.deepEqual(
    flagsUsedOn('`--fips`, `--trusted-boot` and `--skip-step` all work.'),
    ['fips', 'trusted-boot', 'skip-step'],
  );
});

test('leaves a sentence that names no kairos-init flag alone', () => {
  assert.deepEqual(flagsUsedOn('Pass `--output` to write the ISO.'), []);
});

test('counts a continued command as one line, reported at its first', () => {
  assert.deepEqual(logicalLines('a \\\nb\nc'), [
    {line: 1, text: 'a b'},
    {line: 3, text: 'c'},
  ]);
});

test('reports an unknown flag with the page and the line it is on', () => {
  const pages = {
    'docs/security/cis.md': 'Skip it:\n\nkairos-init --skip-steps cisHardening\n',
    'docs/reference/factory.md': 'kairos-init --skip-step cisHardening\n',
  };

  assert.deepEqual(
    findUnknownFlags(Object.keys(pages), KNOWN, (file) => pages[file]),
    [{file: 'docs/security/cis.md', line: 3, flag: 'skip-steps'}],
  );
});
