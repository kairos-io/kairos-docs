import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function KairosVersion(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const version = String(siteConfig.customFields?.kairosVersion ?? 'master');
  return <>{version}</>;
}
