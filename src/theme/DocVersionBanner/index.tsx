import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Link from '@docusaurus/Link';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {
  useActivePlugin,
  useDocVersionSuggestions,
  type GlobalVersion,
} from '@docusaurus/plugin-content-docs/client';
import {
  useDocsPreferredVersion,
  useDocsVersion,
} from '@docusaurus/plugin-content-docs/client';
import type {Props} from '@theme/DocVersionBanner';

export default function DocVersionBanner({className}: Props): ReactNode {
  const versionMetadata = useDocsVersion();
  const {siteConfig} = useDocusaurusContext();
  const latestVersion = (siteConfig.customFields?.latestVersion as string) ?? '';

  if (!versionMetadata.banner) {
    return null;
  }

  const {pluginId} = useActivePlugin({failfast: true})!;
  const {savePreferredVersionName} = useDocsPreferredVersion(pluginId);
  const {latestDocSuggestion, latestVersionSuggestion} =
    useDocVersionSuggestions(pluginId);

  const getVersionMainDoc = (version: GlobalVersion) =>
    version.docs.find((doc) => doc.id === version.mainDocId)!;

  const latestVersionSuggestedDoc =
    latestDocSuggestion ?? getVersionMainDoc(latestVersionSuggestion);

  const linkTo = latestVersionSuggestedDoc.path;
  const onLinkClick = () => savePreferredVersionName(latestVersionSuggestion.name);

  if (versionMetadata.banner === 'unreleased') {
    return (
      <div
        className={clsx(className, ThemeClassNames.docs.docVersionBanner, 'alert alert--warning margin-bottom--md')}
        role="alert">
        <div>
          You are viewing the <strong>development docs</strong> which are in progress.
          There is no guarantee that the development documentation will be accurate,
          including instructions, links, and other information.
        </div>
        <div className="margin-top--md">
          For the latest stable documentation ({latestVersion}),{' '}
          <b><Link to={linkTo} onClick={onLinkClick}>click here</Link></b>.
        </div>
      </div>
    );
  }

  if (versionMetadata.banner === 'unmaintained') {
    return (
      <div
        className={clsx(className, ThemeClassNames.docs.docVersionBanner, 'alert alert--warning margin-bottom--md')}
        role="alert">
        <div>
          You are viewing documentation for Kairos release{' '}
          <strong>{versionMetadata.label}</strong>.
        </div>
        <div className="margin-top--md">
          For the latest release ({latestVersion}),{' '}
          <b><Link to={linkTo} onClick={onLinkClick}>click here</Link></b>.
        </div>
      </div>
    );
  }

  return null;
}
