import React from 'react';
import clsx from 'clsx';
import {useFlavor} from '@site/src/context/flavor';
import {buildKairosImageName} from '@site/src/components/kairos-image-name';

type ImageLinkProps = {
  variant: string;
  arch?: string;
  model?: string;
  suffix?: string;
  kairosVersion?: string;
  k3sVersion?: string;
  flavor?: string;
  flavorRelease?: string;
  className?: string;
};

export default function ImageLink(props: ImageLinkProps): React.JSX.Element {
  const {selection} = useFlavor();
  const kairosVersion = props.kairosVersion ?? 'latest';
  const flavor = props.flavor ?? selection.flavor;
  const flavorRelease = props.flavorRelease ?? selection.flavorRelease;

  const imageName = buildKairosImageName({
    ...props,
    kairosVersion,
    flavor,
    flavorRelease,
  });
  const href = `https://github.com/kairos-io/kairos/releases/download/${kairosVersion}/${imageName}`;

  return (
    <div className={clsx('meta-distro', props.className)}>
      <a href={href}>{imageName}</a>
    </div>
  );
}
