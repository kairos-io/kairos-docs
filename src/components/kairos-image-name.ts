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
