import React from 'react';
import {useFlavor} from '@site/src/context/flavor';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

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
  const {selection} = useFlavor();
  const {registryURL, kairosVersion, k3sVersion} = useVersionedCustomFields();
  const normalizedK3sVersion = String(k3sVersion).replaceAll('+', '-');
  const variantValue = String(variant).trim();
  const suffixValue = String(suffix).trim();
  const k3sSegment = variantValue === 'standard' ? `-k3s${normalizedK3sVersion}` : '';
  const suffixSegment = suffixValue ? `-${suffixValue}` : '';
  const value =
    `${registryURL}/${selection.flavor}:` +
    `${selection.flavorRelease}-${variantValue}-${arch}-${model}-${kairosVersion}${k3sSegment}${suffixSegment}`;

  return <code className="meta-distro">{value}</code>;
}
