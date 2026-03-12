import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';

type DocsCustomFields = {
  docsVersion: string;
  registryURL: string;
  hadronFlavorRelease: string | null;
  flavorOptions: FlavorOption[];
  kairosVersion: string;
  k3sVersion: string;
  providerVersion: string;
  kairosInitVersion: string;
  auroraBootVersion: string;
};

export type FlavorOption = {
  family: string;
  flavor: string;
  flavorRelease: string;
  label: string;
};

type VersionedDocsCustomFields = Record<string, Partial<DocsCustomFields>>;

const DEFAULT_FIELDS: DocsCustomFields = {
  docsVersion: 'current',
  registryURL: 'quay.io/kairos',
  hadronFlavorRelease: null,
  flavorOptions: [],
  kairosVersion: 'master',
  k3sVersion: '',
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

function parseFlavorOptions(value: unknown): FlavorOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const entry = item as Record<string, unknown>;
      const family = typeof entry.family === 'string' ? entry.family : '';
      const flavor = typeof entry.flavor === 'string' ? entry.flavor : '';
      const flavorRelease = typeof entry.flavorRelease === 'string' ? entry.flavorRelease : '';
      const label = typeof entry.label === 'string' ? entry.label : '';
      if (!family || !flavor || !flavorRelease || !label) {
        return null;
      }
      return {family, flavor, flavorRelease, label};
    })
    .filter((option): option is FlavorOption => option !== null);
}

export function useVersionedCustomFields(): DocsCustomFields {
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();
  const docsVersion = getDocsVersionFromPath(pathname);
  const cf = (siteConfig.customFields ?? {}) as {
    registryURL?: unknown;
    hadronFlavorRelease?: unknown;
    flavorOptions?: unknown;
    kairosVersion?: unknown;
    k3sVersion?: unknown;
    providerVersion?: unknown;
    kairosInitVersion?: unknown;
    auroraBootVersion?: unknown;
    docsVersionCustomFields?: unknown;
  };

  const base: DocsCustomFields = {
    docsVersion: docsVersion ?? 'current',
    registryURL: String(cf.registryURL ?? DEFAULT_FIELDS.registryURL),
    hadronFlavorRelease:
      cf.hadronFlavorRelease === null
        ? null
        : typeof cf.hadronFlavorRelease === 'string'
          ? cf.hadronFlavorRelease
          : DEFAULT_FIELDS.hadronFlavorRelease,
    flavorOptions: parseFlavorOptions(cf.flavorOptions),
    kairosVersion: String(cf.kairosVersion ?? DEFAULT_FIELDS.kairosVersion),
    k3sVersion:
      typeof cf.k3sVersion === 'string' && cf.k3sVersion.length > 0
        ? cf.k3sVersion
        : DEFAULT_FIELDS.k3sVersion,
    providerVersion: String(cf.providerVersion ?? DEFAULT_FIELDS.providerVersion),
    kairosInitVersion: String(cf.kairosInitVersion ?? DEFAULT_FIELDS.kairosInitVersion),
    auroraBootVersion: String(cf.auroraBootVersion ?? DEFAULT_FIELDS.auroraBootVersion),
  };

  if (!base.k3sVersion) {
    throw new Error('Missing customFields.k3sVersion in docusaurus.config.ts');
  }
  if (base.flavorOptions.length === 0) {
    throw new Error('Missing customFields.flavorOptions in docusaurus.config.ts');
  }

  if (!docsVersion) {
    return base;
  }

  const versionMap = (cf.docsVersionCustomFields ?? {}) as VersionedDocsCustomFields;
  const versionFields = versionMap[docsVersion];
  if (!versionFields) {
    return base;
  }

  const hadronFlavorRelease =
    versionFields.hadronFlavorRelease === null
      ? null
      : typeof versionFields.hadronFlavorRelease === 'string'
        ? versionFields.hadronFlavorRelease
        : base.hadronFlavorRelease;
  const versionFlavorOptions = parseFlavorOptions(versionFields.flavorOptions);
  const flavorOptions = versionFlavorOptions.length > 0 ? versionFlavorOptions : base.flavorOptions;

  return {
    docsVersion,
    registryURL: String(versionFields.registryURL ?? base.registryURL),
    hadronFlavorRelease,
    flavorOptions,
    kairosVersion: String(versionFields.kairosVersion ?? docsVersion),
    k3sVersion:
      typeof versionFields.k3sVersion === 'string' && versionFields.k3sVersion.length > 0
        ? versionFields.k3sVersion
        : base.k3sVersion,
    providerVersion: String(versionFields.providerVersion ?? base.providerVersion),
    kairosInitVersion: String(versionFields.kairosInitVersion ?? base.kairosInitVersion),
    auroraBootVersion: String(versionFields.auroraBootVersion ?? base.auroraBootVersion),
  };
}
