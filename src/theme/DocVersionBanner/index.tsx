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

/** Plugins that show a version banner (Kairos docs + Operator docs) */
const DOCS_PLUGIN_IDS_WITH_BANNER = new Set(['default', 'operator-docs']);

export default function DocVersionBanner({className}: Props): ReactNode {
  const activePlugin = useActivePlugin({failfast: false});
  const pluginId = activePlugin?.pluginId ?? null;
  const versionMetadata = useDocsVersion();
  const {siteConfig} = useDocusaurusContext();
  const customFields = (siteConfig.customFields ?? {}) as {
    latestVersion?: string;
    latestOperatorVersion?: string | null;
  };
  const latestKairosVersion = customFields.latestVersion ?? '';
  const latestOperatorVersion = customFields.latestOperatorVersion ?? '';
  const {savePreferredVersionName} = useDocsPreferredVersion(pluginId ?? 'default');
  const {latestDocSuggestion, latestVersionSuggestion} =
    useDocVersionSuggestions(pluginId ?? 'default');

  if (!pluginId || !DOCS_PLUGIN_IDS_WITH_BANNER.has(pluginId)) {
    return null;
  }

  if (!versionMetadata.banner) {
    return null;
  }

  const getVersionMainDoc = (version: GlobalVersion) =>
    version.docs.find((doc) => doc.id === version.mainDocId)!;

  const latestVersionSuggestedDoc =
    latestDocSuggestion ?? getVersionMainDoc(latestVersionSuggestion);

  const linkTo = latestVersionSuggestedDoc.path;
  const onLinkClick = () => savePreferredVersionName(latestVersionSuggestion.name);

  const isOperatorDocs = pluginId === 'operator-docs';
  const latestStableVersion = isOperatorDocs ? latestOperatorVersion : latestKairosVersion;

  if (versionMetadata.banner === 'unreleased') {
    return (
      <div
        className={clsx(className, ThemeClassNames.docs.docVersionBanner, 'alert alert--warning margin-bottom--md')}
        role="alert">
        <div>
          {isOperatorDocs ? (
            <>
              You are viewing the <strong>development docs</strong> for the Kairos Operator, which are in progress.
              There is no guarantee that the development documentation will be accurate,
              including instructions, links, and other information.
            </>
          ) : (
            <>
              You are viewing the <strong>development docs</strong> which are in progress.
              There is no guarantee that the development documentation will be accurate,
              including instructions, links, and other information.
            </>
          )}
        </div>
        {latestStableVersion && (
          <div className="margin-top--md">
            For the latest stable {isOperatorDocs ? 'operator ' : ''}documentation ({latestStableVersion}),{' '}
            <b><Link to={linkTo} onClick={onLinkClick}>click here</Link></b>.
          </div>
        )}
      </div>
    );
  }

  if (versionMetadata.banner === 'unmaintained') {
    return (
      <div
        className={clsx(className, ThemeClassNames.docs.docVersionBanner, 'alert alert--warning margin-bottom--md')}
        role="alert">
        <div>
          You are viewing documentation for {isOperatorDocs ? 'Kairos Operator' : 'Kairos'} release{' '}
          <strong>{versionMetadata.label}</strong>.
        </div>
        {latestStableVersion && (
          <div className="margin-top--md">
            For the latest release ({latestStableVersion}),{' '}
            <b><Link to={linkTo} onClick={onLinkClick}>click here</Link></b>.
          </div>
        )}
      </div>
    );
  }

  return null;
}
