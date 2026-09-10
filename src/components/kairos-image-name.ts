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

export type GoogleImageNameParams = {
  hadronFlavorRelease: string;
  kairosVersion: string;
};

/**
 * Build the Google Compute Engine image name the release pipeline publishes.
 *
 * The pipeline derives the image name from the artifact filename, not from the
 * version: `upload-cloud-images.yaml` resolves the hadron container image the
 * release was built with, AuroraBoot names the raw disk
 * `kairos-<FLAVOR>-<FLAVOR_RELEASE>-<VARIANT>-<ARCH>-<MODEL>-<VERSION>.raw`
 * from `/etc/kairos-release`, and `upload-image-to-gcp.sh` (`sanitizeString`)
 * runs that through `tr '.' '-'` because GCE resource names cannot contain
 * dots.
 *
 * Only one image is published, so the variant, arch and model are fixed here
 * rather than taken from the page's flavor selector: a reader switching flavor
 * must not be handed the name of an image that does not exist. The flavor is
 * hadron for every release the pipeline currently builds, and its release comes
 * from `hadronFlavorRelease`, which already tracks the hadron version per docs
 * version.
 */
export function buildGoogleImageName({
  hadronFlavorRelease,
  kairosVersion,
}: GoogleImageNameParams): string {
  return buildKairosImageName({
    variant: 'core',
    kairosVersion,
    k3sVersion: '',
    flavor: 'hadron',
    flavorRelease: hadronFlavorRelease,
  }).replaceAll('.', '-');
}
