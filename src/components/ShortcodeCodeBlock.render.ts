import {buildKairosImageName, buildKairosOciImageName} from './kairos-image-name.ts';

const IMAGE_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*Image\s+([^>]*?)\s*>\}\}/g;
const OCI_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*OCI\s+([^>]*?)\s*>\}\}/g;
const FLAVOR_CODE_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*FlavorCode\s*>\}\}/g;
const FLAVOR_RELEASE_CODE_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*FlavorReleaseCode\s*>\}\}/g;
const REGISTRY_URL_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*RegistryURL\s*>\}\}/g;
const KAIROS_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*KairosVersion\s*>\}\}/g;
const K3S_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*K3sVersion\s*>\}\}/g;
const K3S_VERSION_OCI_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*K3sVersionOCI\s*>\}\}/g;
const PROVIDER_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*ProviderVersion\s*>\}\}/g;
const PROVIDER_VERSION_COMPONENT_GLOBAL_PATTERN = /<\s*ProviderVersion\s*\/>/g;
const KAIROS_INIT_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*KairosInitVersion\s*>\}\}/g;
const AURORA_BOOT_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*AuroraBootVersion\s*>\}\}/g;
const OPERATOR_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*OperatorVersion\s*>\}\}/g;
const FLAVOR_AT_PATTERN = /@flavor\b/g;
const FLAVOR_RELEASE_AT_PATTERN = /@flavorRelease\b/g;
const ATTRIBUTE_PATTERN = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"/g;

export type RenderTemplateInput = {
  template: string;
  flavor: string;
  flavorRelease: string;
  registryURL: string;
  defaultKairosVersion: string;
  defaultK3sVersion: string;
  providerVersion: string;
  kairosInitVersion: string;
  auroraBootVersion: string;
  operatorVersion: string;
};

function parseAttributes(rawAttributes: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = ATTRIBUTE_PATTERN.exec(rawAttributes);
  while (match) {
    attrs[match[1]] = match[2];
    match = ATTRIBUTE_PATTERN.exec(rawAttributes);
  }
  return attrs;
}

export function renderTemplate(input: RenderTemplateInput): string {
  const {
    template,
    flavor,
    flavorRelease,
    registryURL,
    defaultKairosVersion,
    defaultK3sVersion,
    providerVersion,
    kairosInitVersion,
    auroraBootVersion,
    operatorVersion,
  } = input;

  return template
    .replace(OPERATOR_VERSION_SHORTCODE_GLOBAL_PATTERN, operatorVersion)
    .replace(AURORA_BOOT_VERSION_SHORTCODE_GLOBAL_PATTERN, auroraBootVersion)
    .replace(KAIROS_INIT_VERSION_SHORTCODE_GLOBAL_PATTERN, kairosInitVersion)
    .replace(KAIROS_VERSION_SHORTCODE_GLOBAL_PATTERN, defaultKairosVersion)
    .replace(K3S_VERSION_OCI_SHORTCODE_GLOBAL_PATTERN, defaultK3sVersion.replaceAll('+', '-'))
    .replace(K3S_VERSION_SHORTCODE_GLOBAL_PATTERN, defaultK3sVersion)
    .replace(PROVIDER_VERSION_SHORTCODE_GLOBAL_PATTERN, providerVersion)
    .replace(PROVIDER_VERSION_COMPONENT_GLOBAL_PATTERN, providerVersion)
    .replace(REGISTRY_URL_SHORTCODE_GLOBAL_PATTERN, registryURL)
    .replace(FLAVOR_RELEASE_AT_PATTERN, flavorRelease)
    .replace(FLAVOR_AT_PATTERN, flavor)
    .replace(FLAVOR_RELEASE_CODE_SHORTCODE_GLOBAL_PATTERN, flavorRelease)
    .replace(FLAVOR_CODE_SHORTCODE_GLOBAL_PATTERN, flavor)
    .replace(OCI_SHORTCODE_GLOBAL_PATTERN, (_full, rawAttrs) => {
      const attrs = parseAttributes(rawAttrs);
      if (!attrs.variant) {
        return _full;
      }
      return buildKairosOciImageName({
        registryURL,
        flavor,
        flavorRelease,
        variant: attrs.variant,
        arch: attrs.arch ?? 'amd64',
        model: attrs.model ?? 'generic',
        suffix: attrs.suffix,
        kairosVersion: attrs.kairosVersion ?? defaultKairosVersion,
        k3sVersion: attrs.k3sVersion ?? defaultK3sVersion,
      });
    })
    .replace(IMAGE_SHORTCODE_GLOBAL_PATTERN, (_full, rawAttrs) => {
      const attrs = parseAttributes(rawAttrs);
      if (!attrs.variant) {
        return _full;
      }

      return buildKairosImageName({
        variant: attrs.variant,
        arch: attrs.arch,
        model: attrs.model,
        suffix: attrs.suffix,
        kairosVersion: attrs.kairosVersion ?? defaultKairosVersion,
        k3sVersion: attrs.k3sVersion ?? defaultK3sVersion,
        flavor,
        flavorRelease,
      });
    });
}
