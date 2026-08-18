import React from 'react';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

type ContainerRepoLinkProps = {
  flavor?: string;
};

export default function ContainerRepoLink({
  flavor = '',
}: ContainerRepoLinkProps): React.JSX.Element {
  const {registryURL} = useVersionedCustomFields();
  const trimmedFlavor = String(flavor).trim();
  const text = `${registryURL}/${trimmedFlavor}`;
  const href = `http://${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {text}
    </a>
  );
}
