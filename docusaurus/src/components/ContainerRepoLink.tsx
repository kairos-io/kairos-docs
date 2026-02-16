import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type ContainerRepoLinkProps = {
  flavor?: string;
};

export default function ContainerRepoLink({
  flavor = '',
}: ContainerRepoLinkProps): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const registryURL = String(siteConfig.customFields?.registryURL ?? 'quay.io/kairos');
  const trimmedFlavor = String(flavor).trim();
  const text = `${registryURL}/${trimmedFlavor}`;
  const href = `http://${text}`;

  return (
    <a
      href={href}
      className={`plausible-event-flavor=${trimmedFlavor}`}
      target="_blank"
      rel="noreferrer"
    >
      {text}
    </a>
  );
}
