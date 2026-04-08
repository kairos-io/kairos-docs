import type {ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import {buildKairosImageName} from '@site/src/components/kairos-image-name';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

import {
  generateAuroraBootDockerCommand,
  generateDockerBuildCommand,
  generateDockerfile,
  hasInvalidHadronCombination,
} from './logic';
import {CONFIG_EXAMPLES, getExampleById} from './examples';
import type {AuroraBootOptions, BaseFamily, BuilderOptions} from './types';
import styles from './ImageConfigBuilder.module.css';

type ActiveTab = 'dockerfile' | 'config';
type BuilderMode = 'easy' | 'medium' | 'expert';
type EasyProfile = 'k3s' | 'none';
type HostOs = 'macos' | 'linux' | 'windows' | 'unknown';

function detectHostOs(): HostOs {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }

  const nav = navigator as Navigator & {userAgentData?: {platform?: string}};
  const uaDataPlatform = nav.userAgentData?.platform?.toLowerCase() ?? '';
  const platform = navigator.platform?.toLowerCase() ?? '';
  const userAgent = navigator.userAgent?.toLowerCase() ?? '';
  const source = `${uaDataPlatform} ${platform} ${userAgent}`;

  if (source.includes('win')) {
    return 'windows';
  }

  if (source.includes('mac') || source.includes('darwin')) {
    return 'macos';
  }

  if (source.includes('linux') || source.includes('x11')) {
    return 'linux';
  }

  return 'unknown';
}

const DEFAULT_BASE_TAGS: Record<BaseFamily, string> = {
  hadron: 'v0.0.4',
  ubuntu: '24.04',
  debian: 'bookworm',
  fedora: '41',
  alpine: '3.20',
  rocky: '9',
  opensuse: '15.6',
};

const DEFAULT_KAIROS_VERSION = 'v4.0.1';
const DEFAULT_K3S_VERSION = 'latest';
const DEFAULT_K0S_VERSION = 'latest';
const DEFAULT_HADRON_VERSION = '0.0.4';

function getEasyConfig(profile: 'k3s' | 'k0s' | 'none'): string {
  if (profile === 'k3s') {
    return `#cloud-config
users:
  - name: kairos
    passwd: kairos
    groups: [admin]
k3s:
  enabled: true
`;
  }

  if (profile === 'k0s') {
    return `#cloud-config
users:
  - name: kairos
    passwd: kairos
    groups: [admin]
k0s:
  enabled: true
`;
  }

  return `#cloud-config
users:
  - name: kairos
    passwd: kairos
    groups: [admin]
`;
}

export default function ImageConfigBuilder(): ReactNode {
  const {
    kairosInitVersion,
    auroraBootVersion,
    k3sVersion,
    k0sVersion,
    kairosVersion,
    hadronFlavorRelease,
  } = useVersionedCustomFields();
  const effectiveKairosVersion = kairosVersion || DEFAULT_KAIROS_VERSION;
  const effectiveK3sVersion = k3sVersion || DEFAULT_K3S_VERSION;
  const effectiveK0sVersion = k0sVersion || DEFAULT_K0S_VERSION;
  const effectiveHadronVersion = (hadronFlavorRelease ?? DEFAULT_HADRON_VERSION).replace(/^v/, '');
  const [mode, setMode] = useState<BuilderMode>('easy');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dockerfile');
  const [selectedExampleId, setSelectedExampleId] = useState('blank');

  const [easyProfile, setEasyProfile] = useState<EasyProfile>('none');
  const [hostOs, setHostOs] = useState<HostOs>('unknown');
  const [hostOsOverride, setHostOsOverride] = useState<HostOs | null>(null);
  const [preferManualFlow, setPreferManualFlow] = useState(false);

  const [options, setOptions] = useState<BuilderOptions>({
    baseFamily: 'hadron',
    baseTag: DEFAULT_BASE_TAGS.hadron,
    hadronVersion: effectiveHadronVersion,
    kairosVersion: effectiveKairosVersion,
    model: 'generic',
    trustedBoot: false,
    cloud: false,
    fips: false,
    kubernetesDistro: 'none',
    kubernetesVersion: effectiveK3sVersion,
    extendSystem: false,
  });

  const [auroraOptions, setAuroraOptions] = useState<AuroraBootOptions>({
    preset: 'iso',
    auroraBootVersion,
    outputDir: '$PWD/build',
    stateDir: '/output',
    cloudConfigPath: '/output/config.yaml',
    diskStateSize: '',
    netbootHttpPort: '',
    netbootCmdline: '',
    overlayIsoPath: '',
    overlayRootfsPath: '',
    additionalSet: '',
  });

  const generatedDockerfile = useMemo(() => generateDockerfile(options, kairosInitVersion), [options, kairosInitVersion]);
  const [dockerfileText, setDockerfileText] = useState(generatedDockerfile);
  const [dockerfileDirty, setDockerfileDirty] = useState(false);

  const mediumConfigGenerated = useMemo(() => getEasyConfig(options.kubernetesDistro === 'none' ? 'none' : options.kubernetesDistro), [options.kubernetesDistro]);
  const [configText, setConfigText] = useState(mediumConfigGenerated);
  const [configDirty, setConfigDirty] = useState(false);

  const [dockerImageName, setDockerImageName] = useState('my-kairos-image');
  const [dockerImageTag, setDockerImageTag] = useState(effectiveKairosVersion);
  const [dockerfilePath, setDockerfilePath] = useState('./Dockerfile');
  const [buildContextPath, setBuildContextPath] = useState('.');

  const imageRef = useMemo(() => `${dockerImageName}:${dockerImageTag}`, [dockerImageName, dockerImageTag]);
  const generatedBuildCommand = useMemo(
    () => generateDockerBuildCommand(dockerImageName, dockerImageTag, dockerfilePath, buildContextPath),
    [dockerImageName, dockerImageTag, dockerfilePath, buildContextPath],
  );
  const [buildCommandText, setBuildCommandText] = useState(generatedBuildCommand);
  const [buildCommandDirty, setBuildCommandDirty] = useState(false);

  const generatedAuroraCommand = useMemo(() => {
    if (mode === 'medium') {
      return generateAuroraBootDockerCommand(imageRef, {...auroraOptions, preset: 'iso'});
    }
    return generateAuroraBootDockerCommand(imageRef, auroraOptions);
  }, [auroraOptions, imageRef, mode]);
  const [auroraCommandText, setAuroraCommandText] = useState(generatedAuroraCommand);
  const [auroraCommandDirty, setAuroraCommandDirty] = useState(false);

  const easyGeneratedConfig = useMemo(() => getEasyConfig(easyProfile), [easyProfile]);
  const effectiveHostOs = hostOsOverride ?? hostOs;
  const kairosLabCommand = useMemo(() => {
    if (effectiveHostOs === 'macos') {
      return `brew tap kairos-io/kairos
brew install kairos-lab
kairos-lab setup`;
    }

    if (effectiveHostOs === 'linux') {
      const installScriptUrl = new URL('install-kairos-lab.sh', window.location.href).toString();
      return `curl -fsSL "${installScriptUrl}" | sh
kairos-lab setup`;
    }

    return '';
  }, [effectiveHostOs]);
  const showKairosLabFlow = (effectiveHostOs === 'macos' || effectiveHostOs === 'linux') && !preferManualFlow;
  const showManualFlow = effectiveHostOs === 'windows' || effectiveHostOs === 'unknown' || preferManualFlow;
  const canRestoreDetectedOs = hostOsOverride === 'windows' && (hostOs === 'macos' || hostOs === 'linux');
  const isMacOsSelected = effectiveHostOs === 'macos';
  const isLinuxSelected = effectiveHostOs === 'linux';
  const isWindowsSelected = effectiveHostOs === 'windows';
  const easyIsoArtifacts = useMemo(() => {
    const hadronTag = options.hadronVersion.startsWith('v') ? options.hadronVersion : `v${options.hadronVersion}`;
    const variant = easyProfile === 'none' ? 'core' : 'standard';

    const buildIsoName = (arch: 'amd64' | 'arm64'): string => {
      const baseName = buildKairosImageName({
        variant,
        arch,
        model: 'generic',
        kairosVersion: options.kairosVersion,
        k3sVersion: effectiveK3sVersion,
        flavor: 'hadron',
        flavorRelease: hadronTag,
      });

      return `${baseName}.iso`;
    };

    const amd64 = buildIsoName('amd64');
    const arm64 = buildIsoName('arm64');

    return {
      amd64,
      arm64,
      amd64Url: `https://github.com/kairos-io/kairos/releases/download/${options.kairosVersion}/${amd64}`,
      arm64Url: `https://github.com/kairos-io/kairos/releases/download/${options.kairosVersion}/${arm64}`,
    };
  }, [easyProfile, effectiveK3sVersion, options.hadronVersion, options.kairosVersion]);
  const [easyConfigText, setEasyConfigText] = useState(easyGeneratedConfig);
  const [easyConfigDirty, setEasyConfigDirty] = useState(false);

  useEffect(() => {
    if (!dockerfileDirty) setDockerfileText(generatedDockerfile);
  }, [dockerfileDirty, generatedDockerfile]);

  useEffect(() => {
    if (!configDirty) setConfigText(mediumConfigGenerated);
  }, [configDirty, mediumConfigGenerated]);

  useEffect(() => {
    if (!buildCommandDirty) setBuildCommandText(generatedBuildCommand);
  }, [buildCommandDirty, generatedBuildCommand]);

  useEffect(() => {
    if (!auroraCommandDirty) setAuroraCommandText(generatedAuroraCommand);
  }, [auroraCommandDirty, generatedAuroraCommand]);

  useEffect(() => {
    if (!easyConfigDirty) setEasyConfigText(easyGeneratedConfig);
  }, [easyConfigDirty, easyGeneratedConfig]);

  useEffect(() => {
    setHostOs(detectHostOs());
  }, []);

  useEffect(() => {
    if (!copiedKey) return;
    const timeout = window.setTimeout(() => setCopiedKey(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [copiedKey]);

  useEffect(() => {
    setAuroraOptions((prev) => ({...prev, auroraBootVersion}));
  }, [auroraBootVersion]);

  useEffect(() => {
    setOptions((prev) => {
      const next = {...prev};
      if (prev.kairosVersion !== effectiveKairosVersion) {
        next.kairosVersion = effectiveKairosVersion;
      }
      if (prev.hadronVersion !== effectiveHadronVersion) {
        next.hadronVersion = effectiveHadronVersion;
      }
      if (prev.kubernetesDistro === 'k3s' && prev.kubernetesVersion !== effectiveK3sVersion) {
        next.kubernetesVersion = effectiveK3sVersion;
      }
      if (prev.kubernetesDistro === 'k0s' && prev.kubernetesVersion !== effectiveK0sVersion) {
        next.kubernetesVersion = effectiveK0sVersion;
      }
      return next;
    });
    setDockerImageTag(effectiveKairosVersion);
  }, [effectiveHadronVersion, effectiveKairosVersion, effectiveK0sVersion, effectiveK3sVersion]);

  const invalidCombo = hasInvalidHadronCombination(options);
  const selectedExample = useMemo(() => getExampleById(selectedExampleId), [selectedExampleId]);

  const copyText = async (key: string, text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
  };

  const onEasyProfileChange = (value: EasyProfile): void => {
    setEasyProfile(value);
    setOptions((prev) => ({
      ...prev,
      kubernetesDistro: value === 'none' ? 'none' : value,
      kubernetesVersion: value === 'k3s' ? effectiveK3sVersion : DEFAULT_K3S_VERSION,
    }));
  };

  const applyConfigExample = (id: string): void => {
    const example = getExampleById(id);
    setSelectedExampleId(id);
    setConfigText(example.config);
    setConfigDirty(false);
    setActiveTab('config');
  };

  const onHostOsSelect = (value: Exclude<HostOs, 'unknown'>): void => {
    setHostOsOverride(value);
    setPreferManualFlow(value === 'windows');
  };

  const restoreDetectedOs = (): void => {
    setHostOsOverride(null);
    setPreferManualFlow(hostOs === 'windows' || hostOs === 'unknown');
  };

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <Heading as="h2">Download</Heading>
        </div>

        <div className={styles.easyCard}>
          {showKairosLabFlow && (
            <>
              <div className={styles.superSimpleHeader}>
                <div className={styles.osSwitches}>
                  <button
                    type="button"
                    className={`${styles.osSwitch} ${isMacOsSelected ? styles.osSwitchActive : ''}`}
                    onClick={() => onHostOsSelect('macos')}>
                    macOS
                  </button>
                  <button
                    type="button"
                    className={`${styles.osSwitch} ${isLinuxSelected ? styles.osSwitchActive : ''}`}
                    onClick={() => onHostOsSelect('linux')}>
                    Linux
                  </button>
                  <button
                    type="button"
                    className={`${styles.osSwitch} ${isWindowsSelected ? styles.osSwitchActive : ''}`}
                    onClick={() => onHostOsSelect('windows')}>
                    Windows
                  </button>
                </div>
              </div>

              <p className={styles.superSimpleIntro}>
                Install <a href="https://github.com/kairos-io/kairos-lab" target="_blank" rel="noreferrer">kairos-lab</a> and get a working local VM setup in a few commands.
              </p>
              <div className={styles.superSimpleShell}>
                <button
                  type="button"
                  className={styles.iconCopyBtn}
                  aria-label="Copy kairos-lab install command"
                  title={copiedKey === 'kairos-lab' ? 'Copied' : 'Copy install command'}
                  onClick={() => copyText('kairos-lab', kairosLabCommand)}>
                  <span className={styles.copyIcon} aria-hidden="true" />
                </button>
                <textarea readOnly className={`${styles.commandArea} ${styles.superSimpleCommand}`} value={kairosLabCommand} />
              </div>
              <button type="button" className={styles.byoiAction} onClick={() => setPreferManualFlow(true)}>
                Prefer your virtualization software instead
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}

          {showManualFlow && (
            <>
              <div className={styles.easyLayout}>
                <div className={styles.easyLeftCol}>
                  <div className={styles.hadronHeader}>
                    <div className={styles.hadronTitleRow}>
                      <strong>Kairos comes with Hadron Linux</strong>
                      <img src="/img/hadron-linux-icon.svg" alt="Hadron logo" />
                    </div>
                    <button
                      type="button"
                      className={styles.byoiAction}
                      onClick={() => {
                        setMode('medium');
                        setDrawerOpen(true);
                      }}>
                      Or build your own image based on your preferred <span className={styles.orAccent}>Linux distribution</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>

                  <div className={styles.selectorLine}>
                    <div className={styles.compactControl}>
                      <div className={styles.stepper} role="radiogroup" aria-label="Kubernetes profile">
                        <button
                          type="button"
                          className={`${styles.stepBtn} ${easyProfile === 'none' ? styles.stepBtnActive : ''}`}
                          onClick={() => onEasyProfileChange('none')}>
                          Without Kubernetes
                        </button>
                        <button
                          type="button"
                          className={`${styles.stepBtn} ${easyProfile === 'k3s' ? styles.stepBtnActive : ''}`}
                          onClick={() => onEasyProfileChange('k3s')}>
                          With Kubernetes
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.byoiAction}
                    onClick={() => {
                      setOptions((prev) => ({...prev, kubernetesDistro: 'k0s', kubernetesVersion: effectiveK0sVersion}));
                      setMode('medium');
                      setDrawerOpen(true);
                    }}>
                    Or build your own image <span className={styles.orAccent}>with k0s</span>
                    <span aria-hidden="true">→</span>
                  </button>

                  <div className={styles.row}>
                    <label>Download ISO</label>
                    <div className={styles.downloadButtons}>
                      <a className={styles.isoButton} href={easyIsoArtifacts.amd64Url}>
                        <strong>x86_64</strong>
                        <small>Intel / AMD processors</small>
                      </a>
                      <a className={styles.isoButton} href={easyIsoArtifacts.arm64Url}>
                        <strong>ARM64</strong>
                        <small>Apple Silicon, Ampere</small>
                      </a>
                    </div>
                  </div>
                </div>

                <div className={styles.easyConfigShell}>
                  <button
                    type="button"
                    className={styles.iconCopyBtn}
                    aria-label="Copy config.yaml"
                    title={copiedKey === 'easy-config' ? 'Copied' : 'Copy config.yaml'}
                    onClick={() => copyText('easy-config', easyConfigText)}>
                    <span className={styles.copyIcon} aria-hidden="true" />
                  </button>
                  <textarea
                    className={`${styles.commandArea} ${styles.easyConfigArea}`}
                    value={easyConfigText}
                    onChange={(event) => {
                      setEasyConfigText(event.target.value);
                      setEasyConfigDirty(true);
                    }}
                  />
                </div>
              </div>

              <div className={styles.easySubRow}>
                <p className={styles.altInstallLinks}>
                  Or get images for <Link to="/docs/installation/cloud-servers/">Public Cloud</Link> or <Link to="/docs/installation/edge-devices/">Edge Devices</Link>
                </p>
                <button
                  type="button"
                  className={styles.exampleConfigCta}
                  onClick={() => {
                    setMode('medium');
                    setDrawerOpen(true);
                    setActiveTab('config');
                  }}>
                  Or pick one of our <span className={styles.orAccent}>example configs</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className={styles.easyDivider} />

              <div className={styles.row}>
                <label>Install</label>
                <div className={styles.installButtons}>
                  <Link className={styles.installButton} to="/quickstart/">
                    On a Virtual Machine
                  </Link>
                  <Link className={styles.installButton} to="/docs/installation/bare-metal/">
                    On Bare-metal
                  </Link>
                </div>
              </div>

              {(effectiveHostOs === 'macos' || effectiveHostOs === 'linux') && (
                <div className={styles.manualKairosLabCta}>
                  <button type="button" className={styles.byoiAction} onClick={() => setPreferManualFlow(false)}>
                    Use kairos-lab guided setup instead (only for macOS and Linux)
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}

              {canRestoreDetectedOs && (
                <div className={styles.manualKairosLabCta}>
                  <button type="button" className={styles.byoiAction} onClick={restoreDetectedOs}>
                    Use detected OS setup instead
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {drawerOpen && (
          <div className={styles.drawerBackdrop}>
            <div className={styles.drawer}>
              <div className={styles.drawerHeader}>
                <strong>Image Builder</strong>
                <div className={styles.inlineActions}>
                  <button type="button" className={styles.ghostBtn} onClick={() => setMode((prev) => (prev === 'expert' ? 'medium' : 'expert'))}>
                    {mode === 'expert' ? 'Less options' : 'More options'}
                  </button>
                  <button type="button" className={styles.ghostBtn} onClick={() => setDrawerOpen(false)}>Close</button>
                </div>
              </div>

              <div className={styles.layout}>
                <div className={styles.panel}>
                  <h3>Options</h3>

                  <div className={styles.rowSplit2}>
                    <div className={styles.row}>
                      <label htmlFor="baseFamily">Base image family</label>
                      <select
                        id="baseFamily"
                        value={options.baseFamily}
                        onChange={(event) =>
                          setOptions((prev) => ({...prev, baseFamily: event.target.value as BaseFamily, baseTag: DEFAULT_BASE_TAGS[event.target.value as BaseFamily]}))
                        }>
                        <option value="hadron">Hadron</option>
                        <option value="ubuntu">Ubuntu</option>
                        <option value="debian">Debian</option>
                        <option value="fedora">Fedora</option>
                        <option value="alpine">Alpine</option>
                        <option value="rocky">Rocky</option>
                        <option value="opensuse">openSUSE</option>
                      </select>
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="k8sDistro">Kubernetes distro</label>
                      <select
                        id="k8sDistro"
                        value={options.kubernetesDistro}
                        onChange={(event) => {
                          const kubernetesDistro = event.target.value as BuilderOptions['kubernetesDistro'];
                          setOptions((prev) => ({
                            ...prev,
                            kubernetesDistro,
                            kubernetesVersion:
                              kubernetesDistro === 'k3s'
                                ? effectiveK3sVersion
                                : kubernetesDistro === 'k0s'
                                  ? effectiveK0sVersion
                                  : prev.kubernetesVersion,
                          }));
                        }}>
                        <option value="none">None</option>
                        <option value="k3s">k3s</option>
                        <option value="k0s">k0s</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <label htmlFor="kairosVersion">Kairos version</label>
                    <input
                      id="kairosVersion"
                      value={options.kairosVersion}
                      onChange={(event) => setOptions((prev) => ({...prev, kairosVersion: event.target.value}))}
                    />
                  </div>

                  {mode === 'expert' && (
                    <div className={styles.row}>
                      <label htmlFor="k8sVersion">Kubernetes version</label>
                      <input
                        id="k8sVersion"
                        value={options.kubernetesVersion}
                        onChange={(event) => setOptions((prev) => ({...prev, kubernetesVersion: event.target.value}))}
                      />
                    </div>
                  )}

                  {mode === 'expert' && (
                    <>
                      <div className={styles.rowSplit2}>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={options.trustedBoot}
                            disabled={options.baseFamily === 'hadron' && options.cloud && options.fips}
                            onChange={(event) => setOptions((prev) => ({...prev, trustedBoot: event.target.checked}))}
                          />
                          Trusted Boot
                        </label>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={options.fips}
                            disabled={options.baseFamily === 'hadron' && options.cloud && options.trustedBoot}
                            onChange={(event) => setOptions((prev) => ({...prev, fips: event.target.checked}))}
                          />
                          FIPS
                        </label>
                      </div>

                      <div className={styles.rowSplit2}>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={options.cloud}
                            disabled={options.baseFamily !== 'hadron'}
                            onChange={(event) => setOptions((prev) => ({...prev, cloud: event.target.checked}))}
                          />
                          Cloud variant
                        </label>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={options.extendSystem}
                            onChange={(event) => setOptions((prev) => ({...prev, extendSystem: event.target.checked}))}
                          />
                          Extend system stage
                        </label>
                      </div>
                    </>
                  )}

                  {mode === 'expert' && (
                    <div className={styles.rowSplit2}>
                      <div className={styles.row}>
                        <label htmlFor="model">Model</label>
                        <input id="model" value={options.model} onChange={(event) => setOptions((prev) => ({...prev, model: event.target.value}))} />
                      </div>
                      <div className={styles.row}>
                        <label htmlFor="kairosInitVersion">kairos-init version (docs)</label>
                        <input id="kairosInitVersion" value={kairosInitVersion} readOnly />
                      </div>
                    </div>
                  )}

                  {invalidCombo && <div className={styles.warning}>Cloud + Trusted Boot + FIPS is intentionally disallowed for now.</div>}
                </div>

                <div className={styles.editorShell}>
                  <div className={styles.exampleRow}>
                    <div className={styles.row}>
                      <label htmlFor="configExample">Example config</label>
                      <select id="configExample" value={selectedExampleId} onChange={(event) => applyConfigExample(event.target.value)}>
                        {CONFIG_EXAMPLES.map((example) => (
                          <option key={example.id} value={example.id}>
                            {example.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Link className={styles.exampleDocsLink} to={selectedExample.docsPath}>
                      View docs
                    </Link>
                  </div>
                  <div className={styles.tabBar}>
                    <div className={styles.tabs}>
                      <button
                        type="button"
                        className={`${styles.tab} ${activeTab === 'dockerfile' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('dockerfile')}>
                        Dockerfile
                      </button>
                      <button
                        type="button"
                        className={`${styles.tab} ${activeTab === 'config' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('config')}>
                        config.yaml
                      </button>
                      {activeTab === 'dockerfile' && dockerfileDirty && <span className={styles.dirtyTag}>edited manually</span>}
                      {activeTab === 'config' && configDirty && <span className={styles.dirtyTag}>edited manually</span>}
                    </div>
                    <div className={styles.tabActions}>
                      <button type="button" className={styles.ghostBtn} onClick={() => copyText(activeTab, activeTab === 'dockerfile' ? dockerfileText : configText)}>
                        {copiedKey === activeTab ? 'Copied' : activeTab === 'dockerfile' ? 'Copy Dockerfile' : 'Copy config.yaml'}
                      </button>
                    </div>
                  </div>
                  {activeTab === 'dockerfile' ? (
                    <textarea
                      className={styles.codeArea}
                      value={dockerfileText}
                      onChange={(event) => {
                        setDockerfileText(event.target.value);
                        setDockerfileDirty(true);
                      }}
                    />
                  ) : (
                    <textarea
                      className={styles.codeArea}
                      value={configText}
                      onChange={(event) => {
                        setConfigText(event.target.value);
                        setConfigDirty(true);
                      }}
                    />
                  )}
                </div>
                <p className={styles.editorHint}>Edit config first, Dockerfile and commands update automatically.</p>
              </div>

              <div className={styles.commandSection}>
                <div className={styles.panel}>
                  <h3>Build Command</h3>
                  <div className={styles.rowSplit4}>
                    <div className={styles.row}>
                      <label htmlFor="dockerImageName">Image name</label>
                      <input id="dockerImageName" value={dockerImageName} onChange={(event) => setDockerImageName(event.target.value)} />
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="dockerImageTag">Image tag</label>
                      <input id="dockerImageTag" value={dockerImageTag} onChange={(event) => setDockerImageTag(event.target.value)} />
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="dockerfilePath">Dockerfile path</label>
                      <input id="dockerfilePath" value={dockerfilePath} onChange={(event) => setDockerfilePath(event.target.value)} />
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="buildContextPath">Build context</label>
                      <input id="buildContextPath" value={buildContextPath} onChange={(event) => setBuildContextPath(event.target.value)} />
                    </div>
                  </div>
                  <div className={styles.inlineActions}>
                    <button type="button" className={styles.ghostBtn} onClick={() => copyText('build-command', buildCommandText)}>
                      {copiedKey === 'build-command' ? 'Copied' : 'Copy build command'}
                    </button>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => {
                        setBuildCommandText(generatedBuildCommand);
                        setBuildCommandDirty(false);
                      }}>
                      Regenerate
                    </button>
                    {buildCommandDirty && <span className={styles.dirtyTag}>edited manually</span>}
                  </div>
                  <textarea
                    className={styles.commandArea}
                    value={buildCommandText}
                    onChange={(event) => {
                      setBuildCommandText(event.target.value);
                      setBuildCommandDirty(true);
                    }}
                  />
                </div>

                <div className={styles.panel}>
                  <h3>AuroraBoot command (ISO for VM)</h3>
                  <div className={styles.rowSplit2}>
                    <div className={styles.row}>
                      <label htmlFor="auroraVersion">AuroraBoot version</label>
                      <input
                        id="auroraVersion"
                        value={auroraOptions.auroraBootVersion}
                        onChange={(event) => setAuroraOptions((prev) => ({...prev, auroraBootVersion: event.target.value}))}
                      />
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="outputDir">Host output directory</label>
                      <input id="outputDir" value={auroraOptions.outputDir} onChange={(event) => setAuroraOptions((prev) => ({...prev, outputDir: event.target.value}))} />
                    </div>
                  </div>

                  {mode === 'expert' && (
                    <>
                      <div className={styles.rowSplit2}>
                        <div className={styles.row}>
                          <label htmlFor="auroraPreset">Artifact type</label>
                          <select
                            id="auroraPreset"
                            value={auroraOptions.preset}
                            onChange={(event) => setAuroraOptions((prev) => ({...prev, preset: event.target.value as AuroraBootOptions['preset']}))}>
                            <option value="iso">ISO</option>
                            <option value="raw-efi">RAW EFI</option>
                            <option value="raw-bios">RAW BIOS</option>
                            <option value="raw-gce">RAW GCE</option>
                            <option value="raw-vhd">RAW VHD</option>
                            <option value="netboot">Netboot</option>
                            <option value="container">Container artifact</option>
                            <option value="uki-iso">Trusted Boot UKI ISO</option>
                            <option value="uki-container">Trusted Boot UKI Container</option>
                          </select>
                        </div>
                        <div className={styles.row}>
                          <label htmlFor="stateDir">state_dir</label>
                          <input id="stateDir" value={auroraOptions.stateDir} onChange={(event) => setAuroraOptions((prev) => ({...prev, stateDir: event.target.value}))} />
                        </div>
                      </div>

                      <div className={styles.row}>
                        <label htmlFor="additionalSet">Additional --set entries (key=value per line)</label>
                        <textarea
                          id="additionalSet"
                          className={styles.inputArea}
                          value={auroraOptions.additionalSet}
                          onChange={(event) => setAuroraOptions((prev) => ({...prev, additionalSet: event.target.value}))}
                        />
                      </div>
                    </>
                  )}

                  <div className={styles.inlineActions}>
                    <button type="button" className={styles.ghostBtn} onClick={() => copyText('aurora-command', auroraCommandText)}>
                      {copiedKey === 'aurora-command' ? 'Copied' : 'Copy AuroraBoot command'}
                    </button>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => {
                        setAuroraCommandText(generatedAuroraCommand);
                        setAuroraCommandDirty(false);
                      }}>
                      Regenerate
                    </button>
                    {auroraCommandDirty && <span className={styles.dirtyTag}>edited manually</span>}
                  </div>
                  <textarea
                    className={styles.commandArea}
                    value={auroraCommandText}
                    onChange={(event) => {
                      setAuroraCommandText(event.target.value);
                      setAuroraCommandDirty(true);
                    }}
                  />

                  <p className={styles.muted}>
                    VM flow next step: <Link to="/quickstart/">follow Quickstart</Link> after generating your artifact.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
