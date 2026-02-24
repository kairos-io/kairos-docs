import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

export default function KairosVersion(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const {kairosVersion} = useVersionedCustomFields();
  const latestVersion = siteConfig.customFields?.latestVersion;
  if (typeof latestVersion !== 'string' || !/^v\d+\.\d+\.\d+$/.test(latestVersion)) {
    throw new Error('customFields.latestVersion must be defined as vX.Y.Z');
  }
  const version = String(kairosVersion ?? latestVersion);
  return <>{version}</>;
}
