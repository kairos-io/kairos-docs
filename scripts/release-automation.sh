#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="${ROOT_DIR:-$(dirname "$SCRIPT_DIR")}"

source "${SCRIPT_DIR}/utils.sh"

DRY_RUN=false
SPECIFIC_VERSION=""
VERBOSE=false
PUSH_CHANGES=true

KEEP_VERSIONS=()
REMOVED_VERSIONS=()

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --version VERSION    Process a specific version (e.g., v4.0.2)
    --dry-run           Show what would be done without making changes
    --push=false        Don't push changes or open PR (local testing only)
    --verbose           Enable verbose output
    --help              Show this help message

Examples:
    $0
    $0 --version v4.0.2
    $0 --version v4.0.2 --dry-run
    $0 --version v4.0.2 --push=false
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            SPECIFIC_VERSION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --push=false)
            PUSH_CHANGES=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        INFO) echo "[$timestamp] INFO: $message" ;;
        WARN) echo "[$timestamp] WARN: $message" >&2 ;;
        ERROR) echo "[$timestamp] ERROR: $message" >&2 ;;
        DEBUG)
            if [ "$VERBOSE" = true ]; then
                echo "[$timestamp] DEBUG: $message"
            fi
            ;;
    esac
}

list_local_doc_versions() {
    shopt -s nullglob
    local path
    for path in versioned_docs/version-v*; do
        basename "$path" | sed 's/^version-//'
    done
    shopt -u nullglob
}

contains_version() {
    local needle="$1"
    shift
    local value
    for value in "$@"; do
        if [ "$value" = "$needle" ]; then
            return 0
        fi
    done
    return 1
}

compute_keep_versions() {
    local target_version="$1"
    local -a fetched_versions=()
    local line

    while IFS= read -r line; do
        if [[ "$line" =~ release/(v[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
            fetched_versions+=("${BASH_REMATCH[1]}")
        fi
    done < <(fetch_latest_releases)

    fetched_versions+=("$target_version")

    declare -A latest_patch_by_minor=()
    declare -A latest_version_by_minor=()

    local version major minor patch key
    for version in "${fetched_versions[@]}"; do
        if [[ ! "$version" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
            continue
        fi

        major="${BASH_REMATCH[1]}"
        minor="${BASH_REMATCH[2]}"
        patch="${BASH_REMATCH[3]}"
        key="${major}.${minor}"

        if [ -z "${latest_patch_by_minor[$key]+x}" ] || [ "$patch" -gt "${latest_patch_by_minor[$key]}" ]; then
            latest_patch_by_minor[$key]="$patch"
            latest_version_by_minor[$key]="$version"
        fi
    done

    local -a minor_latest=()
    local k
    for k in "${!latest_version_by_minor[@]}"; do
        minor_latest+=("${latest_version_by_minor[$k]}")
    done

    if [ "${#minor_latest[@]}" -eq 0 ]; then
        return 1
    fi

    mapfile -t minor_latest < <(printf '%s\n' "${minor_latest[@]}" | sort -V)

    local count=${#minor_latest[@]}
    local start=0
    if [ "$count" -gt 3 ]; then
        start=$((count - 3))
    fi

    KEEP_VERSIONS=()
    local i
    for ((i=start; i<count; i++)); do
        KEEP_VERSIONS+=("${minor_latest[$i]}")
    done
}

ensure_release_branch() {
    local version="$1"
    local branch_name="release/$version"

    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would checkout/create branch: $branch_name"
        return 0
    fi

    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$current_branch" = "$branch_name" ]; then
        log "INFO" "Already on branch $branch_name"
        return 0
    fi

    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        git checkout "$branch_name"
    elif git show-ref --verify --quiet "refs/remotes/origin/$branch_name"; then
        git checkout -b "$branch_name" --track "origin/$branch_name"
    else
        git checkout -b "$branch_name"
    fi

    log "INFO" "Using branch $branch_name"
}

create_docs_version_if_missing() {
    local version="$1"
    if [ -d "versioned_docs/version-$version" ]; then
        log "INFO" "Versioned docs already exist for $version"
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would run: npm run docusaurus docs:version $version"
        return 0
    fi

    log "INFO" "Creating Docusaurus docs version for $version"
    npm run docusaurus -- docs:version "$version"
}

delete_docs_version() {
    local version="$1"
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would delete versioned_docs/version-$version"
        log "INFO" "[DRY RUN] Would delete versioned_sidebars/version-$version-sidebars.json"
        return 0
    fi

    rm -rf "versioned_docs/version-$version"
    rm -f "versioned_sidebars/version-$version-sidebars.json"
    log "INFO" "Removed docs artifacts for $version"
}

sync_versions_json() {
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would rewrite versions.json from versioned_docs folders"
        return 0
    fi

    node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const dir = path.join(root, 'versioned_docs');
const versionsPath = path.join(root, 'versions.json');

const versions = fs.existsSync(dir)
  ? fs
      .readdirSync(dir, {withFileTypes: true})
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('version-v'))
      .map((entry) => entry.name.replace(/^version-/, ''))
  : [];

const parsed = versions
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

fs.writeFileSync(versionsPath, `${JSON.stringify(parsed, null, 2)}\n`);
NODE
}

update_docusaurus_config() {
    local target_version="$1"
    local kairos_init_version="$2"
    local component_versions_json="$3"

    local provider_version
    local auroraboot_version
    local hadron_version
    local k3s_version
    local k0s_version
    provider_version=$(echo "$component_versions_json" | jq -r '.provider_version')
    auroraboot_version=$(echo "$component_versions_json" | jq -r '.auroraboot_version')
    hadron_version=$(echo "$component_versions_json" | jq -r '.hadron_version')
    k3s_version=$(echo "$component_versions_json" | jq -r '.k3s_version')
    k0s_version=$(echo "$component_versions_json" | jq -r '.k0s_version')

    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would sync docsVersionCustomFields in docusaurus.config.ts"
        log "INFO" "[DRY RUN] Would update banner to $target_version"
        return 0
    fi

    TARGET_VERSION="$target_version" \
    KAIROS_INIT_VERSION="$kairos_init_version" \
    PROVIDER_VERSION="$provider_version" \
    AURORABOOT_VERSION="$auroraboot_version" \
    HADRON_VERSION="$hadron_version" \
    K3S_VERSION="$k3s_version" \
    K0S_VERSION="$k0s_version" \
    node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

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

const normalizedEntries = new Map();
for (const version of parsedFolderVersions) {
  if (version === targetVersion) {
    normalizedEntries.set(version, {
      registryURL: template.registryURL,
      hadronFlavorRelease: coalesce(hadronVersion, template.hadronFlavorRelease),
      k3sVersion: coalesce(k3sVersion, template.k3sVersion),
      k0sVersion: coalesce(k0sVersion, template.k0sVersion),
      flavorOptions: template.flavorOptions,
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

const releaseUrl = `https://github.com/kairos-io/kairos/releases/tag/${targetVersion}`;
const bannerContent = `<a href="${releaseUrl}">Kairos ${targetVersion}</a> is out! 🚀`;
updated = updated.replace(
  /content:\s*'[^']*',/,
  `content: '${bannerContent}',`,
);

fs.writeFileSync(configPath, updated);
NODE

    log "INFO" "Updated docusaurus.config.ts for version $target_version"
}

prune_versions_to_keep() {
    local -a local_versions=()
    mapfile -t local_versions < <(list_local_doc_versions | sort -V)

    REMOVED_VERSIONS=()
    local version
    for version in "${local_versions[@]}"; do
        if ! contains_version "$version" "${KEEP_VERSIONS[@]}"; then
            REMOVED_VERSIONS+=("$version")
            delete_docs_version "$version"
        fi
    done
}

validate_site_build() {
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would run: npm run build"
        return 0
    fi

    log "INFO" "Validating Docusaurus build"
    npm run build
}

format_csv() {
    local -a values=("$@")
    if [ "${#values[@]}" -eq 0 ]; then
        echo "none"
        return 0
    fi
    local IFS=", "
    echo "${values[*]}"
}

commit_push_and_open_pr() {
    local version="$1"
    local component_versions_json="$2"
    local branch_name="release/$version"

    local provider_version
    local auroraboot_version
    local k3s_version
    provider_version=$(echo "$component_versions_json" | jq -r '.provider_version')
    auroraboot_version=$(echo "$component_versions_json" | jq -r '.auroraboot_version')
    k3s_version=$(echo "$component_versions_json" | jq -r '.k3s_version')

    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY RUN] Would commit docs version updates"
        log "INFO" "[DRY RUN] Would push $branch_name and open PR"
        return 0
    fi

    if git diff --quiet && git diff --cached --quiet; then
        log "INFO" "No changes detected after processing $version"
        return 0
    fi

    git add versions.json docusaurus.config.ts versioned_docs versioned_sidebars
    git commit -m "chore: update docs versions for $version"

    if [ "$PUSH_CHANGES" = false ]; then
        log "INFO" "Skipping push and PR creation (--push=false)"
        return 0
    fi

    git push -u origin "$branch_name"

    local pr_title="chore: release docs updates for $version"
    local kept_csv
    local removed_csv
    kept_csv=$(format_csv "${KEEP_VERSIONS[@]}")
    removed_csv=$(format_csv "${REMOVED_VERSIONS[@]}")
    local release_url="https://github.com/kairos-io/kairos/releases/tag/$version"

    if gh pr view "$branch_name" --json url --jq '.url' >/dev/null 2>&1; then
        local existing_url
        existing_url=$(gh pr view "$branch_name" --json url --jq '.url')
        log "INFO" "PR already exists: $existing_url"
        return 0
    fi

    local pr_url
    pr_url=$(gh pr create --base main --head "$branch_name" --title "$pr_title" --body "$(cat <<EOF
## Summary
- Added Docusaurus docs version for $version (if missing)
- Enforced retention policy: latest patch of the last 3 major.minor lines
- Synced \\`docsVersionCustomFields\\` and updated announcement banner

## Details
- Kept versions: $kept_csv
- Removed versions: $removed_csv
- Banner release URL: $release_url
- Extracted component versions: provider=$provider_version, auroraboot=$auroraboot_version, k3s=$k3s_version
EOF
)")

    log "INFO" "Created PR: $pr_url"
}

process_version() {
    local version="$1"

    log "INFO" "Processing version: $version"

    if ! validate_semantic_version "$version"; then
        log "ERROR" "Invalid semantic version format: $version"
        return 1
    fi

    if [[ "$version" == *-* ]]; then
        log "WARN" "Skipping prerelease version: $version"
        return 0
    fi

    compute_keep_versions "$version"
    log "INFO" "Retention keep list (latest patch of last 3 major.minor): $(format_csv "${KEEP_VERSIONS[@]}")"

    ensure_release_branch "$version"

    local kairos_init_version
    kairos_init_version=$(get_kairos_init_version "$version")
    if [ -z "$kairos_init_version" ]; then
        log "ERROR" "Failed to get KAIROS_INIT version for $version"
        return 1
    fi
    log "INFO" "Found KAIROS_INIT version: $kairos_init_version"

    local component_versions
    component_versions=$(get_component_versions "$kairos_init_version" "$version")
    log "DEBUG" "Component versions: $component_versions"

    create_docs_version_if_missing "$version"
    prune_versions_to_keep
    sync_versions_json
    update_docusaurus_config "$version" "$kairos_init_version" "$component_versions"
    validate_site_build
    commit_push_and_open_pr "$version" "$component_versions"

    log "INFO" "Successfully processed version: $version"
}

check_for_new_releases() {
    log "INFO" "Checking for new Kairos releases"

    local latest_release
    latest_release=$(get_latest_kairos_release)
    if [ -z "$latest_release" ]; then
        log "ERROR" "Failed to get latest release"
        return 1
    fi

    log "INFO" "Latest release from GitHub: $latest_release"
    process_version "$latest_release"
}

main() {
    log "INFO" "Starting Docusaurus release automation"
    log "INFO" "Dry run mode: $DRY_RUN"
    log "INFO" "Push changes: $PUSH_CHANGES"
    log "INFO" "Verbose mode: $VERBOSE"

    cd "$root_dir"

    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository"
        exit 1
    fi

    if [ ! -f "docusaurus.config.ts" ]; then
        log "ERROR" "docusaurus.config.ts not found in repository root"
        exit 1
    fi

    if [ -n "$SPECIFIC_VERSION" ]; then
        process_version "$SPECIFIC_VERSION"
    else
        check_for_new_releases
    fi

    log "INFO" "Release automation completed"
}

main "$@"
