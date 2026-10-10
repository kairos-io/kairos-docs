import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';
import {
  getDocsVersionFromPath,
  getOperatorVersionFromPath,
} from '@site/src/utils/versionedCustomFields.helpers';

type DocsCustomFields = {
  docsVersion: string;
  registryURL: string;
  hadronFlavorRelease: string | null;
  flavorOptions: FlavorOption[];
  kairosVersion: string;
  k3sVersion: string;
  k0sVersion: string;
  providerVersion: string;
  kairosInitVersion: string;
  auroraBootVersion: string;
  operatorVersion: string;
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
  k0sVersion: '',
  providerVersion: 'latest',
  kairosInitVersion: 'latest',
  auroraBootVersion: 'latest',
  operatorVersion: 'main',
};

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
  const operatorDocsVersion = getOperatorVersionFromPath(pathname);
  const cf = (siteConfig.customFields ?? {}) as {
    registryURL?: unknown;
    hadronFlavorRelease?: unknown;
    flavorOptions?: unknown;
    kairosVersion?: unknown;
    k3sVersion?: unknown;
    k0sVersion?: unknown;
    providerVersion?: unknown;
    kairosInitVersion?: unknown;
    auroraBootVersion?: unknown;
    latestOperatorVersion?: unknown;
    docsVersionCustomFields?: unknown;
  };

  const baseOperatorVersion =
    typeof cf.latestOperatorVersion === 'string' && cf.latestOperatorVersion.length > 0
      ? cf.latestOperatorVersion
      : DEFAULT_FIELDS.operatorVersion;

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
    k0sVersion:
      typeof cf.k0sVersion === 'string' && cf.k0sVersion.length > 0
        ? cf.k0sVersion
        : DEFAULT_FIELDS.k0sVersion,
    providerVersion: String(cf.providerVersion ?? DEFAULT_FIELDS.providerVersion),
    kairosInitVersion: String(cf.kairosInitVersion ?? DEFAULT_FIELDS.kairosInitVersion),
    auroraBootVersion: String(cf.auroraBootVersion ?? DEFAULT_FIELDS.auroraBootVersion),
    operatorVersion: operatorDocsVersion ?? baseOperatorVersion,
  };

  if (!base.k3sVersion) {
    throw new Error('Missing customFields.k3sVersion in docusaurus.config.ts');
  }
  if (!base.k0sVersion) {
    throw new Error('Missing customFields.k0sVersion in docusaurus.config.ts');
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
    k0sVersion:
      typeof versionFields.k0sVersion === 'string' && versionFields.k0sVersion.length > 0
        ? versionFields.k0sVersion
        : base.k0sVersion,
    providerVersion: String(versionFields.providerVersion ?? base.providerVersion),
    kairosInitVersion: String(versionFields.kairosInitVersion ?? base.kairosInitVersion),
    auroraBootVersion: String(versionFields.auroraBootVersion ?? base.auroraBootVersion),
    operatorVersion: base.operatorVersion,
  };
}
