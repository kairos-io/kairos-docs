import type {BaseFamily, BuilderOptions} from './types';

const BASE_IMAGE_REPOSITORIES: Record<Exclude<BaseFamily, 'hadron'>, string> = {
  ubuntu: 'ubuntu',
  debian: 'debian',
  fedora: 'fedora',
  alpine: 'alpine',
  rocky: 'rockylinux/rockylinux',
  opensuse: 'opensuse/leap',
};

function getHadronBaseImage(options: BuilderOptions): string {
  const version = options.hadronVersion;
  const isCloud = options.cloud;
  const isTrusted = options.trustedBoot;
  const isFips = options.fips;

  if (isCloud && isTrusted && isFips) {
    return `ghcr.io/kairos-io/hadron-cloud-trusted:v${version}`;
  }
  if (isCloud && isTrusted) {
    return `ghcr.io/kairos-io/hadron-cloud-trusted:v${version}`;
  }
  if (isCloud && isFips) {
    return `ghcr.io/kairos-io/hadron-cloud-fips:v${version}`;
  }
  if (isCloud) {
    return `ghcr.io/kairos-io/hadron-cloud:v${version}`;
  }
  if (isTrusted) {
    return `ghcr.io/kairos-io/hadron-trusted:v${version}`;
  }
  return `ghcr.io/kairos-io/hadron:v${version}`;
}

export function resolveBaseImage(options: BuilderOptions): string {
  if (options.baseFamily === 'hadron') {
    return getHadronBaseImage(options);
  }

  const repository = BASE_IMAGE_REPOSITORIES[options.baseFamily];
  return `${repository}:${options.baseTag}`;
}

function getKubernetesFlags(options: BuilderOptions): string {
  if (options.kubernetesDistro === 'none') {
    return '';
  }
  if (options.kubernetesDistro === 'k3s') {
    return `--provider k3s --provider-k3s-version "${options.kubernetesVersion}"`;
  }
  return `--provider k0s --provider-k0s-version "${options.kubernetesVersion}"`;
}

function getFipsFlag(options: BuilderOptions): string {
  return options.fips ? '--fips' : '';
}

function getTrustedBootValue(options: BuilderOptions): string {
  return options.trustedBoot ? 'true' : 'false';
}

function normalizeFlags(...flags: string[]): string {
  return flags.filter(Boolean).join(' ');
}

export function generateDockerfile(options: BuilderOptions, kairosInitVersion: string): string {
  const baseImage = resolveBaseImage(options);
  const k8sFlags = getKubernetesFlags(options);
  const fipsFlag = getFipsFlag(options);
  const installFlags = normalizeFlags(
    '-l debug -s install',
    `-m "${options.model}"`,
    `-t "${getTrustedBootValue(options)}"`,
    k8sFlags,
    `--version "${options.kairosVersion}"`,
    fipsFlag,
  );
  const initFlags = normalizeFlags(
    '-l debug -s init',
    `-m "${options.model}"`,
    `-t "${getTrustedBootValue(options)}"`,
    k8sFlags,
    `--version "${options.kairosVersion}"`,
    fipsFlag,
  );

  const extensionStage = options.extendSystem
    ? `
FROM ghcr.io/kairos-io/hadron-toolchain:v${options.hadronVersion} AS extension-toolchain
# Use this stage to compile or download binaries.
# Example:
# RUN apk add --no-cache build-base
# RUN curl -L -o tool.tar.gz https://example.com/tool.tar.gz && tar xzf tool.tar.gz
`
    : '';

  const extensionCopy = options.extendSystem
    ? `
# Copy artifacts from extension-toolchain into the final image.
# Example:
# COPY --from=extension-toolchain /path/to/artifact /usr/local/bin/artifact
`
    : '';

  return `FROM quay.io/kairos/kairos-init:${kairosInitVersion} AS kairos-init
${extensionStage}
FROM ${baseImage} AS base-kairos

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \\
    /kairos-init ${installFlags} && \\
    /kairos-init ${initFlags}
${extensionCopy}`;
}

export function hasInvalidHadronCombination(options: BuilderOptions): boolean {
  return options.baseFamily === 'hadron' && options.cloud && options.trustedBoot && options.fips;
}
