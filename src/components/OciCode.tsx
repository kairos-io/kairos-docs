import React from 'react';
import {useFlavor} from '@site/src/context/flavor';
import {buildKairosOciImageName} from '@site/src/components/kairos-image-name';
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
  const value = buildKairosOciImageName({
    registryURL,
    flavor: selection.flavor,
    flavorRelease: selection.flavorRelease,
    variant,
    arch,
    model,
    suffix,
    kairosVersion,
    k3sVersion,
  });

  return <code className="meta-distro">{value}</code>;
}
