import type {ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';

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
type BuilderMode = 'medium' | 'expert';

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

function getConfigForDistro(distro: BuilderOptions['kubernetesDistro']): string {
  if (distro === 'k3s') {
    return `#cloud-config
users:
  - name: kairos
    passwd: kairos
    groups: [admin]
k3s:
  enabled: true
`;
  }
  if (distro === 'k0s') {
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

export default function ImageBuilderDrawer(): ReactNode {
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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<BuilderMode>('medium');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dockerfile');
  const [selectedExampleId, setSelectedExampleId] = useState('blank');

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

  const configGenerated = useMemo(() => getConfigForDistro(options.kubernetesDistro), [options.kubernetesDistro]);
  const [configText, setConfigText] = useState(configGenerated);
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

  useEffect(() => {
    if (!dockerfileDirty) setDockerfileText(generatedDockerfile);
  }, [dockerfileDirty, generatedDockerfile]);

  useEffect(() => {
    if (!configDirty) setConfigText(configGenerated);
  }, [configDirty, configGenerated]);

  useEffect(() => {
    if (!buildCommandDirty) setBuildCommandText(generatedBuildCommand);
  }, [buildCommandDirty, generatedBuildCommand]);

  useEffect(() => {
    if (!auroraCommandDirty) setAuroraCommandText(generatedAuroraCommand);
  }, [auroraCommandDirty, generatedAuroraCommand]);

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

  const applyConfigExample = (id: string): void => {
    const example = getExampleById(id);
    setSelectedExampleId(id);
    setConfigText(example.config);
    setConfigDirty(false);
    setActiveTab('config');
  };

  return (
    <>
      <button
        type="button"
        className={styles.openBuilderBtn}
        onClick={() => setDrawerOpen(true)}>
        Open Image Builder
      </button>

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
                    <label htmlFor="builderBaseFamily">Base image family</label>
                    <select
                      id="builderBaseFamily"
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
                    <label htmlFor="builderK8sDistro">Kubernetes distro</label>
                    <select
                      id="builderK8sDistro"
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
                  <label htmlFor="builderKairosVersion">Kairos version</label>
                  <input
                    id="builderKairosVersion"
                    value={options.kairosVersion}
                    onChange={(event) => setOptions((prev) => ({...prev, kairosVersion: event.target.value}))}
                  />
                </div>

                {mode === 'expert' && (
                  <div className={styles.row}>
                    <label htmlFor="builderK8sVersion">Kubernetes version</label>
                    <input
                      id="builderK8sVersion"
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
                      <label htmlFor="builderModel">Model</label>
                      <input id="builderModel" value={options.model} onChange={(event) => setOptions((prev) => ({...prev, model: event.target.value}))} />
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="builderKairosInitVersion">kairos-init version (docs)</label>
                      <input id="builderKairosInitVersion" value={kairosInitVersion} readOnly />
                    </div>
                  </div>
                )}

                {invalidCombo && <div className={styles.warning}>Cloud + Trusted Boot + FIPS is intentionally disallowed for now.</div>}
              </div>

              <div className={styles.editorShell}>
                <div className={styles.exampleRow}>
                  <div className={styles.row}>
                    <label htmlFor="builderConfigExample">Example config</label>
                    <select id="builderConfigExample" value={selectedExampleId} onChange={(event) => applyConfigExample(event.target.value)}>
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
                    <label htmlFor="builderDockerImageName">Image name</label>
                    <input id="builderDockerImageName" value={dockerImageName} onChange={(event) => setDockerImageName(event.target.value)} />
                  </div>
                  <div className={styles.row}>
                    <label htmlFor="builderDockerImageTag">Image tag</label>
                    <input id="builderDockerImageTag" value={dockerImageTag} onChange={(event) => setDockerImageTag(event.target.value)} />
                  </div>
                  <div className={styles.row}>
                    <label htmlFor="builderDockerfilePath">Dockerfile path</label>
                    <input id="builderDockerfilePath" value={dockerfilePath} onChange={(event) => setDockerfilePath(event.target.value)} />
                  </div>
                  <div className={styles.row}>
                    <label htmlFor="builderBuildContextPath">Build context</label>
                    <input id="builderBuildContextPath" value={buildContextPath} onChange={(event) => setBuildContextPath(event.target.value)} />
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
                    <label htmlFor="builderAuroraVersion">AuroraBoot version</label>
                    <input
                      id="builderAuroraVersion"
                      value={auroraOptions.auroraBootVersion}
                      onChange={(event) => setAuroraOptions((prev) => ({...prev, auroraBootVersion: event.target.value}))}
                    />
                  </div>
                  <div className={styles.row}>
                    <label htmlFor="builderOutputDir">Host output directory</label>
                    <input id="builderOutputDir" value={auroraOptions.outputDir} onChange={(event) => setAuroraOptions((prev) => ({...prev, outputDir: event.target.value}))} />
                  </div>
                </div>

                {mode === 'expert' && (
                  <>
                    <div className={styles.rowSplit2}>
                      <div className={styles.row}>
                        <label htmlFor="builderAuroraPreset">Artifact type</label>
                        <select
                          id="builderAuroraPreset"
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
                        <label htmlFor="builderStateDir">state_dir</label>
                        <input id="builderStateDir" value={auroraOptions.stateDir} onChange={(event) => setAuroraOptions((prev) => ({...prev, stateDir: event.target.value}))} />
                      </div>
                    </div>

                    <div className={styles.row}>
                      <label htmlFor="builderAdditionalSet">Additional --set entries (key=value per line)</label>
                      <textarea
                        id="builderAdditionalSet"
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
    </>
  );
}
