import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useFlavor} from '@site/src/context/flavor';

type OciCodeProps = {
  variant?: string;
  arch?: string;
  model?: string;
  suffix?: string;
};

export default function OciCode({
  variant = '',
  arch = 'amd64',
  model = 'generic',
  suffix = '',
}: OciCodeProps): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const {selection} = useFlavor();
  const registryURL = String(siteConfig.customFields?.registryURL ?? 'quay.io/kairos');
  const kairosVersion = String(siteConfig.customFields?.kairosVersion ?? 'master');
  const k3sVersion = String(siteConfig.customFields?.k3sVersion ?? 'v1.35.0+k3s1').replaceAll('+', '-');
  const variantValue = String(variant).trim();
  const suffixValue = String(suffix).trim();
  const k3sSegment = variantValue === 'standard' ? `-k3s${k3sVersion}` : '';
  const suffixSegment = suffixValue ? `-${suffixValue}` : '';
  const value =
    `${registryURL}/${selection.flavor}:` +
    `${selection.flavorRelease}-${variantValue}-${arch}-${model}-${kairosVersion}${k3sSegment}${suffixSegment}`;

  return <code className="meta-distro">{value}</code>;
}
