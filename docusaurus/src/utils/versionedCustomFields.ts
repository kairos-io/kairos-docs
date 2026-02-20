import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';

type DocsCustomFields = {
  registryURL: string;
  kairosVersion: string;
  k3sVersion: string;
  providerVersion: string;
  kairosInitVersion: string;
  auroraBootVersion: string;
};

type VersionedDocsCustomFields = Record<string, Partial<DocsCustomFields>>;

const DEFAULT_FIELDS: DocsCustomFields = {
  registryURL: 'quay.io/kairos',
  kairosVersion: 'master',
  k3sVersion: 'v1.35.0+k3s1',
  providerVersion: 'latest',
  kairosInitVersion: 'latest',
  auroraBootVersion: 'latest',
};

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function getDocsVersionFromPath(pathname: string): string | null {
  const normalized = normalizePathname(pathname);
  const match = normalized.match(/^\/docs\/([^/]+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const candidate = match[1];
  if (/^v\d+\.\d+\.\d+$/.test(candidate)) {
    return candidate;
  }

  return null;
}

export function useVersionedCustomFields(): DocsCustomFields {
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();
  const cf = (siteConfig.customFields ?? {}) as {
    registryURL?: unknown;
    kairosVersion?: unknown;
    k3sVersion?: unknown;
    providerVersion?: unknown;
    kairosInitVersion?: unknown;
    auroraBootVersion?: unknown;
    docsVersionCustomFields?: unknown;
  };

  const base: DocsCustomFields = {
    registryURL: String(cf.registryURL ?? DEFAULT_FIELDS.registryURL),
    kairosVersion: String(cf.kairosVersion ?? DEFAULT_FIELDS.kairosVersion),
    k3sVersion: String(cf.k3sVersion ?? DEFAULT_FIELDS.k3sVersion),
    providerVersion: String(cf.providerVersion ?? DEFAULT_FIELDS.providerVersion),
    kairosInitVersion: String(cf.kairosInitVersion ?? DEFAULT_FIELDS.kairosInitVersion),
    auroraBootVersion: String(cf.auroraBootVersion ?? DEFAULT_FIELDS.auroraBootVersion),
  };

  const docsVersion = getDocsVersionFromPath(pathname);
  if (!docsVersion) {
    return base;
  }

  const versionMap = (cf.docsVersionCustomFields ?? {}) as VersionedDocsCustomFields;
  const versionFields = versionMap[docsVersion];
  if (!versionFields) {
    return base;
  }

  return {
    registryURL: String(versionFields.registryURL ?? base.registryURL),
    kairosVersion: String(versionFields.kairosVersion ?? docsVersion),
    k3sVersion: String(versionFields.k3sVersion ?? base.k3sVersion),
    providerVersion: String(versionFields.providerVersion ?? base.providerVersion),
    kairosInitVersion: String(versionFields.kairosInitVersion ?? base.kairosInitVersion),
    auroraBootVersion: String(versionFields.auroraBootVersion ?? base.auroraBootVersion),
  };
}
