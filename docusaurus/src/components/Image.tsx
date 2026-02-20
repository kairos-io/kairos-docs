import React from 'react';
import {useFlavor} from '@site/src/context/flavor';
import {buildKairosImageName} from '@site/src/components/kairos-image-name';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

type ImageProps = {
  variant: string;
  arch?: string;
  model?: string;
  suffix?: string;
  kairosVersion?: string;
  k3sVersion?: string;
  flavor?: string;
  flavorRelease?: string;
};

export default function Image(props: ImageProps): React.JSX.Element {
  const {selection} = useFlavor();
  const {kairosVersion, k3sVersion} = useVersionedCustomFields();
  const imageName = buildKairosImageName({
    ...props,
    kairosVersion: props.kairosVersion ?? kairosVersion,
    k3sVersion: props.k3sVersion ?? k3sVersion,
    flavor: props.flavor ?? selection.flavor,
    flavorRelease: props.flavorRelease ?? selection.flavorRelease,
  });

  return <>{imageName}</>;
}
