#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';

const REPO = 'kairos-io/kairos';
const TARGET_VERSIONS = ['v3.6.0', 'v3.7.2', 'v4.0.1'];
const CONFIG_PATH = path.join(process.cwd(), 'docusaurus.config.ts');

function extractConstArray(source, constName) {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s+as\\s+const;`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Unable to find array constant: ${constName}`);
  }
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractVersionConfig(source) {
  const configs = new Map();
  const versionBlockRegex =
    /'(?<version>v\d+\.\d+\.\d+)':\s*\{[\s\S]*?k3sVersion:\s*'(?<k3sVersion>[^']+)'[\s\S]*?flavorOptions:\s*(?<flavorOptionsRef>[A-Za-z0-9_]+)/g;

  let match;
  while ((match = versionBlockRegex.exec(source)) !== null) {
    const {version, k3sVersion, flavorOptionsRef} = match.groups;
    const flavorOptions = extractConstArray(source, flavorOptionsRef);
    configs.set(version, {k3sVersion, flavorOptions});
  }

  return configs;
}

function listReleaseAssets(version) {
  const output = execSync(
    `gh release view ${version} --repo ${REPO} --json assets --jq '.assets[].name'`,
    {encoding: 'utf8'},
  );

  return new Set(
    output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function buildExpectedAsset(version, k3sVersion, flavorOption) {
  return `kairos-${flavorOption.flavor}-${flavorOption.flavorRelease}-standard-amd64-generic-${version}-k3s${k3sVersion}.iso.sha256`;
}

function findCloseCandidates(assets, version, k3sVersion, flavorOption) {
  const expectedProviderPart = `-standard-amd64-generic-${version}-k3s${k3sVersion}.iso.sha256`;
  const startsWith = `kairos-${flavorOption.flavor}-`;

  return [...assets]
    .filter((name) => name.startsWith(startsWith) && name.endsWith(expectedProviderPart))
    .slice(0, 3);
}

function main() {
  const source = fs.readFileSync(CONFIG_PATH, 'utf8');
  const versionConfig = extractVersionConfig(source);
  let hasFailures = false;

  for (const version of TARGET_VERSIONS) {
    const cfg = versionConfig.get(version);
    if (!cfg) {
      console.error(`\n[${version}] Missing config in docusaurus.config.ts`);
      hasFailures = true;
      continue;
    }

    const assets = listReleaseAssets(version);
    const failures = [];

    for (const option of cfg.flavorOptions) {
      const expected = buildExpectedAsset(version, cfg.k3sVersion, option);
      if (!assets.has(expected)) {
        failures.push({option, expected, candidates: findCloseCandidates(assets, version, cfg.k3sVersion, option)});
      }
    }

    if (failures.length === 0) {
      console.log(`\n[${version}] OK (${cfg.flavorOptions.length} flavor options validated)`);
      continue;
    }

    hasFailures = true;
    console.log(`\n[${version}] FAIL (${failures.length}/${cfg.flavorOptions.length} missing)`);
    for (const failure of failures) {
      console.log(
        `- ${failure.option.label}: missing ${failure.expected}`,
      );
      if (failure.candidates.length > 0) {
        console.log(`  candidates:`);
        for (const candidate of failure.candidates) {
          console.log(`  - ${candidate}`);
        }
      }
    }
  }

  if (hasFailures) {
    process.exitCode = 1;
    return;
  }

  console.log('\nAll selected versions validated successfully.');
}

main();
