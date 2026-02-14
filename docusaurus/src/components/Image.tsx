import React from 'react';
import {useFlavor} from '@site/src/context/flavor';
import {buildKairosImageName} from '@site/src/components/kairos-image-name';

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
  const imageName = buildKairosImageName({
    ...props,
    kairosVersion: props.kairosVersion ?? 'latest',
    flavor: props.flavor ?? selection.flavor,
    flavorRelease: props.flavorRelease ?? selection.flavorRelease,
  });

  return <>{imageName}</>;
}
