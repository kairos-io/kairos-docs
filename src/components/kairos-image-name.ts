export type KairosImageNameParams = {
  variant: string;
  arch?: string;
  model?: string;
  suffix?: string;
  kairosVersion: string;
  k3sVersion: string;
  flavor?: string;
  flavorRelease?: string;
};

export function buildKairosImageName({
  variant,
  arch = 'amd64',
  model = 'generic',
  suffix = '',
  kairosVersion,
  k3sVersion,
  flavor = 'ubuntu',
  flavorRelease = '24.04',
}: KairosImageNameParams): string {
  const k3sSegment = variant === 'standard' ? `-k3s${k3sVersion}` : '';
  return `kairos-${flavor}-${flavorRelease}-${variant}-${arch}-${model}-${kairosVersion}${k3sSegment}${suffix}`;
}

export type KairosOciImageNameParams = {
  registryURL: string;
  flavor: string;
  flavorRelease: string;
  variant: string;
  arch?: string;
  model?: string;
  suffix?: string;
  kairosVersion: string;
  k3sVersion: string;
};

export function buildKairosOciImageName({
  registryURL,
  flavor,
  flavorRelease,
  variant,
  arch = 'amd64',
  model = 'generic',
  suffix = '',
  kairosVersion,
  k3sVersion,
}: KairosOciImageNameParams): string {
  const normalizedK3sVersion = String(k3sVersion).replaceAll('+', '-');
  const variantValue = String(variant).trim();
  const suffixValue = String(suffix).trim();
  const k3sSegment = variantValue === 'standard' ? `-k3s-${normalizedK3sVersion}` : '';
  const suffixSegment = suffixValue ? `-${suffixValue}` : '';
  return (
    `${registryURL}/${flavor}:` +
    `${flavorRelease}-${variantValue}-${arch}-${model}-${kairosVersion}${k3sSegment}${suffixSegment}`
  );
}
