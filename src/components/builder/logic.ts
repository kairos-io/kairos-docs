import type {AuroraBootOptions, BaseFamily, BuilderOptions} from './types';

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

export function generateDockerBuildCommand(
  imageName: string,
  imageTag: string,
  dockerfilePath: string,
  contextPath: string,
): string {
  return `docker build -t ${imageName}:${imageTag} -f ${dockerfilePath} ${contextPath}`;
}

function parseAdditionalSet(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'));
}

function appendSetArgs(lines: string[], key: string, value: string): void {
  if (value.trim()) {
    lines.push(`--set "${key}=${value.trim()}"`);
  }
}

export function generateAuroraBootDockerCommand(imageRef: string, options: AuroraBootOptions): string {
  const commonPrefix = [
    'docker run --rm -ti',
    '-v /var/run/docker.sock:/var/run/docker.sock',
    `-v "${options.outputDir}":/output`,
  ];

  const additionalSetLines = parseAdditionalSet(options.additionalSet);

  if (options.preset === 'uki-iso' || options.preset === 'uki-container') {
    const outputType = options.preset === 'uki-iso' ? 'iso' : 'container';
    const cmdParts = [
      ...commonPrefix,
      'quay.io/kairos/auroraboot:' + options.auroraBootVersion,
      `build-uki -t ${outputType} -d /output/`,
      options.cloudConfigPath.trim() ? `--cloud-config ${options.cloudConfigPath.trim()}` : '',
      options.overlayIsoPath.trim() ? `--overlay-iso ${options.overlayIsoPath.trim()}` : '',
      options.overlayRootfsPath.trim() ? `--overlay-rootfs ${options.overlayRootfsPath.trim()}` : '',
      `oci:${imageRef}`,
    ].filter(Boolean);
    return cmdParts.join(' \\\n+  ');
  }

  const setArgs: string[] = [];
  setArgs.push(`--set "container_image=oci:${imageRef}"`);

  if (options.preset === 'netboot') {
    setArgs.push('--set "disable_netboot=false"');
  } else {
    setArgs.push('--set "disable_netboot=true"');
  }

  appendSetArgs(setArgs, 'state_dir', options.stateDir);
  appendSetArgs(setArgs, 'netboot_http_port', options.netbootHttpPort);
  appendSetArgs(setArgs, 'netboot.cmdline', options.netbootCmdline);
  appendSetArgs(setArgs, 'cloud_config', options.cloudConfigPath);
  appendSetArgs(setArgs, 'disk.state_size', options.diskStateSize);
  appendSetArgs(setArgs, 'iso.overlay_iso', options.overlayIsoPath);
  appendSetArgs(setArgs, 'iso.overlay_rootfs', options.overlayRootfsPath);

  if (options.preset === 'raw-efi') {
    setArgs.push('--set "disk.efi=true"');
  }
  if (options.preset === 'raw-bios') {
    setArgs.push('--set "disk.bios=true"');
  }
  if (options.preset === 'raw-gce') {
    setArgs.push('--set "disk.gce=true"');
  }
  if (options.preset === 'raw-vhd') {
    setArgs.push('--set "disk.vhd=true"');
  }
  if (options.preset === 'container') {
    setArgs.push('--set "output=container"');
  }

  additionalSetLines.forEach((line) => setArgs.push(`--set "${line}"`));

  const full = [
    ...commonPrefix,
    options.preset.startsWith('raw-') ? '--privileged' : '--net host',
    'quay.io/kairos/auroraboot:' + options.auroraBootVersion,
    ...setArgs,
  ];

  return full.join(' \\\n+  ');
}
