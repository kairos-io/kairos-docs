#!/usr/bin/env node

// Regenerates the docsVersionCustomFields block (and announcement banner) in
// docusaurus.config.ts for a release. Driven entirely by environment variables
// so it can be invoked from release-automation.sh and exercised in tests.
//
// Required env:
//   TARGET_VERSION        e.g. v4.1.1 (must have a versioned_docs/version-<v> folder)
// Optional env (fall back to the template version's value when empty):
//   KAIROS_INIT_VERSION, PROVIDER_VERSION, AURORABOOT_VERSION,
//   HADRON_VERSION, K3S_VERSION, K0S_VERSION

import fs from 'node:fs';
import path from 'node:path';

const configPath = path.join(process.cwd(), 'docusaurus.config.ts');
const source = fs.readFileSync(configPath, 'utf8');

const targetVersion = process.env.TARGET_VERSION;
const kairosInitVersion = process.env.KAIROS_INIT_VERSION;
const providerVersion = process.env.PROVIDER_VERSION;
const auroraBootVersion = process.env.AURORABOOT_VERSION;
const hadronVersion = process.env.HADRON_VERSION;
const k3sVersion = process.env.K3S_VERSION;
const k0sVersion = process.env.K0S_VERSION;

function coalesce(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

const versionsDir = path.join(process.cwd(), 'versioned_docs');
const folderVersions = fs.existsSync(versionsDir)
  ? fs
      .readdirSync(versionsDir, {withFileTypes: true})
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('version-v'))
      .map((entry) => entry.name.replace(/^version-/, ''))
  : [];

if (!folderVersions.includes(targetVersion)) {
  throw new Error(`Target version ${targetVersion} missing from versioned_docs`);
}

const parsedFolderVersions = folderVersions
  .map((version) => {
    const match = version.match(/^v(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return null;
    return {
      raw: version,
      major: Number.parseInt(match[1], 10),
      minor: Number.parseInt(match[2], 10),
      patch: Number.parseInt(match[3], 10),
    };
  })
  .filter(Boolean)
  .sort((a, b) => {
    if (a.major !== b.major) return b.major - a.major;
    if (a.minor !== b.minor) return b.minor - a.minor;
    return b.patch - a.patch;
  })
  .map((v) => v.raw);

const docsFieldMatch = source.match(/const docsVersionCustomFields = \{([\s\S]*?)\} as const;/);
if (!docsFieldMatch) {
  throw new Error('Unable to locate docsVersionCustomFields in docusaurus.config.ts');
}

const existingBlock = docsFieldMatch[1];
const entryRegex = /'(?<version>v\d+\.\d+\.\d+)':\s*\{(?<body>[\s\S]*?)\n\s*\},?/g;
const existing = new Map();

function extractString(body, key) {
  const m = body.match(new RegExp(`${key}:\\s*'([^']*)'`));
  return m ? m[1] : null;
}

function extractNullable(body, key) {
  const m = body.match(new RegExp(`${key}:\\s*(null|'[^']*')`));
  if (!m) return null;
  if (m[1] === 'null') return null;
  return m[1].slice(1, -1);
}

function extractIdentifier(body, key) {
  const m = body.match(new RegExp(`${key}:\\s*([A-Za-z0-9_]+)`));
  return m ? m[1] : null;
}

let match;
while ((match = entryRegex.exec(existingBlock)) !== null) {
  const version = match.groups.version;
  const body = match.groups.body;
  const item = {
    registryURL: extractString(body, 'registryURL'),
    hadronFlavorRelease: extractNullable(body, 'hadronFlavorRelease'),
    k3sVersion: extractString(body, 'k3sVersion'),
    k0sVersion: extractString(body, 'k0sVersion'),
    flavorOptions: extractIdentifier(body, 'flavorOptions'),
    providerVersion: extractString(body, 'providerVersion'),
    auroraBootVersion: extractString(body, 'auroraBootVersion'),
    kairosInitVersion: extractString(body, 'kairosInitVersion'),
  };
  existing.set(version, item);
}

if (existing.size === 0) {
  throw new Error('No docsVersionCustomFields entries found');
}

const templateVersion = parsedFolderVersions.find((v) => v !== targetVersion && existing.has(v))
  ?? [...existing.keys()].sort((a, b) => {
    const am = a.match(/^v(\d+)\.(\d+)\.(\d+)$/);
    const bm = b.match(/^v(\d+)\.(\d+)\.(\d+)$/);
    if (!am || !bm) return 0;
    if (am[1] !== bm[1]) return Number.parseInt(bm[1], 10) - Number.parseInt(am[1], 10);
    if (am[2] !== bm[2]) return Number.parseInt(bm[2], 10) - Number.parseInt(am[2], 10);
    return Number.parseInt(bm[3], 10) - Number.parseInt(am[3], 10);
  })[0];

const template = existing.get(templateVersion);
if (!template) {
  throw new Error('Unable to select template docsVersionCustomFields entry');
}

// When the target release ships a hadron flavor, generate a dedicated
// flavor-options const for it instead of copying the template's stale hadron
// const. hadronFlavorRelease and flavorOptions[].flavorRelease must agree, since
// the release-artifact validator builds expected ISO names from the latter.
const targetHadronRelease = coalesce(hadronVersion, template.hadronFlavorRelease);
const generatedConstName =
  targetHadronRelease === null
    ? null
    : `hadronFlavorOptions${'V' + targetVersion.replace(/^v/, '').replace(/\./g, '')}`;
const generatedConstSource =
  generatedConstName === null
    ? null
    : `const ${generatedConstName} = [\n  {family: 'hadron', flavor: 'hadron', flavorRelease: '${targetHadronRelease}', label: 'Hadron ${targetHadronRelease}'},\n] as const;`;

const normalizedEntries = new Map();
for (const version of parsedFolderVersions) {
  if (version === targetVersion) {
    normalizedEntries.set(version, {
      registryURL: template.registryURL,
      hadronFlavorRelease: targetHadronRelease,
      k3sVersion: coalesce(k3sVersion, template.k3sVersion),
      k0sVersion: coalesce(k0sVersion, template.k0sVersion),
      flavorOptions: generatedConstName ?? template.flavorOptions,
      providerVersion: coalesce(providerVersion, template.providerVersion),
      auroraBootVersion: coalesce(auroraBootVersion, template.auroraBootVersion),
      kairosInitVersion: coalesce(kairosInitVersion, template.kairosInitVersion),
    });
    continue;
  }

  const current = existing.get(version);
  if (!current) {
    normalizedEntries.set(version, {
      registryURL: template.registryURL,
      hadronFlavorRelease: template.hadronFlavorRelease,
      k3sVersion: template.k3sVersion,
      k0sVersion: template.k0sVersion,
      flavorOptions: template.flavorOptions,
      providerVersion: template.providerVersion,
      auroraBootVersion: template.auroraBootVersion,
      kairosInitVersion: template.kairosInitVersion,
    });
  } else {
    normalizedEntries.set(version, current);
  }
}

const lines = [];
for (const version of parsedFolderVersions) {
  const cfg = normalizedEntries.get(version);
  lines.push(`  '${version}': {`);
  lines.push(`    registryURL: '${cfg.registryURL}',`);
  if (cfg.hadronFlavorRelease === null) {
    lines.push('    hadronFlavorRelease: null,');
  } else {
    lines.push(`    hadronFlavorRelease: '${cfg.hadronFlavorRelease}',`);
  }
  lines.push(`    k3sVersion: '${cfg.k3sVersion}',`);
  lines.push(`    k0sVersion: '${cfg.k0sVersion}',`);
  lines.push(`    flavorOptions: ${cfg.flavorOptions},`);
  lines.push(`    providerVersion: '${cfg.providerVersion}',`);
  lines.push(`    auroraBootVersion: '${cfg.auroraBootVersion}',`);
  lines.push(`    kairosInitVersion: '${cfg.kairosInitVersion}',`);
  lines.push('  },');
}

const newDocsVersionCustomFields = `const docsVersionCustomFields = {\n${lines.join('\n')}\n} as const;`;

let updated = source.replace(/const docsVersionCustomFields = \{[\s\S]*?\} as const;/, newDocsVersionCustomFields);

if (generatedConstName !== null) {
  // Drop any previous definition of this const so repeated runs stay idempotent.
  const existingConstRegex = new RegExp(`const ${generatedConstName} = \\[[\\s\\S]*?\\] as const;\\n*`);
  updated = updated.replace(existingConstRegex, '');
  // Define it immediately above docsVersionCustomFields, which references it.
  // Use a function replacer so any '$' in the generated source is inserted
  // literally rather than interpreted as a replacement pattern ($&, $1, ...).
  updated = updated.replace(
    /const docsVersionCustomFields = \{/,
    () => `${generatedConstSource}\n\nconst docsVersionCustomFields = {`,
  );
}

const releaseUrl = `https://github.com/kairos-io/kairos/releases/tag/${targetVersion}`;
const bannerContent = `<a href="${releaseUrl}">Kairos ${targetVersion}</a> is out! 🚀`;
updated = updated.replace(
  /content:\s*'[^']*',/,
  `content: '${bannerContent}',`,
);

fs.writeFileSync(configPath, updated);
