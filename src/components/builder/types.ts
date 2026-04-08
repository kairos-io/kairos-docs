export type KubernetesDistro = 'none' | 'k3s' | 'k0s';

export type BaseFamily =
  | 'hadron'
  | 'ubuntu'
  | 'debian'
  | 'fedora'
  | 'alpine'
  | 'rocky'
  | 'opensuse';

export type BuilderOptions = {
  baseFamily: BaseFamily;
  baseTag: string;
  hadronVersion: string;
  kairosVersion: string;
  model: string;
  trustedBoot: boolean;
  cloud: boolean;
  fips: boolean;
  kubernetesDistro: KubernetesDistro;
  kubernetesVersion: string;
  extendSystem: boolean;
};

export type ExampleTemplate = {
  id: string;
  label: string;
  docsPath: string;
  config: string;
};

export type AuroraBootPreset =
  | 'iso'
  | 'raw-efi'
  | 'raw-bios'
  | 'raw-gce'
  | 'raw-vhd'
  | 'netboot'
  | 'uki-iso'
  | 'uki-container'
  | 'container';

export type AuroraBootOptions = {
  preset: AuroraBootPreset;
  auroraBootVersion: string;
  outputDir: string;
  stateDir: string;
  cloudConfigPath: string;
  diskStateSize: string;
  netbootHttpPort: string;
  netbootCmdline: string;
  overlayIsoPath: string;
  overlayRootfsPath: string;
  additionalSet: string;
};
