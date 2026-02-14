import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useFlavor} from '@site/src/context/flavor';
import {buildKairosImageName} from '@site/src/components/kairos-image-name';

type ShortcodeCodeBlockProps = {
  language?: string;
  template: string;
};

const IMAGE_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*image\s+([^>]*?)\s*>\}\}/g;
const OCI_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*oci\s+([^>]*?)\s*>\}\}/g;
const FLAVOR_CODE_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*flavorCode\s*>\}\}/g;
const FLAVOR_RELEASE_CODE_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*flavorReleaseCode\s*>\}\}/g;
const REGISTRY_URL_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*registryURL\s*>\}\}/g;
const KAIROS_INIT_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*kairosInitVersion\s*>\}\}/g;
const AURORA_BOOT_VERSION_SHORTCODE_GLOBAL_PATTERN = /\{\{<\s*auroraBootVersion\s*>\}\}/g;
const ATTRIBUTE_PATTERN = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"/g;

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

function renderTemplate(
  template: string,
  flavor: string,
  flavorRelease: string,
  registryURL: string,
  kairosInitVersion: string,
  auroraBootVersion: string,
): string {
  return template
    .replace(AURORA_BOOT_VERSION_SHORTCODE_GLOBAL_PATTERN, auroraBootVersion)
    .replace(KAIROS_INIT_VERSION_SHORTCODE_GLOBAL_PATTERN, kairosInitVersion)
    .replace(REGISTRY_URL_SHORTCODE_GLOBAL_PATTERN, registryURL)
    .replace(FLAVOR_RELEASE_CODE_SHORTCODE_GLOBAL_PATTERN, flavorRelease)
    .replace(FLAVOR_CODE_SHORTCODE_GLOBAL_PATTERN, flavor)
    .replace(OCI_SHORTCODE_GLOBAL_PATTERN, (_full, rawAttrs) => {
      const attrs = parseAttributes(rawAttrs);
      if (!attrs.variant) {
        return _full;
      }
      const variant = attrs.variant;
      const arch = attrs.arch ?? 'amd64';
      const model = attrs.model ?? 'generic';
      const kairosVersion = attrs.kairosVersion ?? 'latest';
      const k3sVersion = (attrs.k3sVersion ?? 'v1.35.0+k3s1').replaceAll('+', '-');
      const suffix = attrs.suffix ? `-${attrs.suffix}` : '';
      const k3sSegment = variant === 'standard' ? `-k3s${k3sVersion}` : '';
      const tag = `${flavorRelease}-${variant}-${arch}-${model}-${kairosVersion}${k3sSegment}${suffix}`;
      return `${registryURL}/${flavor}:${tag}`;
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
        kairosVersion: attrs.kairosVersion,
        k3sVersion: attrs.k3sVersion,
        flavor,
        flavorRelease,
      });
    });
}

export default function ShortcodeCodeBlock({
  language = 'text',
  template,
}: ShortcodeCodeBlockProps): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const {selection} = useFlavor();
  const registryURL = String(siteConfig.customFields?.registryURL ?? 'quay.io/kairos');
  const kairosInitVersion = String(siteConfig.customFields?.kairosInitVersion ?? 'latest');
  const auroraBootVersion = String(siteConfig.customFields?.auroraBootVersion ?? 'latest');
  const content = renderTemplate(
    template,
    selection.flavor,
    selection.flavorRelease,
    registryURL,
    kairosInitVersion,
    auroraBootVersion,
  );

  return <CodeBlock language={language}>{content}</CodeBlock>;
}
