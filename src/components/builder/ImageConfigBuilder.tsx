import type {ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

import {CONFIG_EXAMPLES, getExampleById} from './examples';
import {
  generateAuroraBootDockerCommand,
  generateDockerBuildCommand,
  generateDockerfile,
  hasInvalidHadronCombination,
} from './logic';
import type {AuroraBootOptions, BaseFamily, BuilderOptions} from './types';
import styles from './ImageConfigBuilder.module.css';

type ActiveTab = 'dockerfile' | 'config';

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

export default function ImageConfigBuilder(): ReactNode {
  const {kairosInitVersion, auroraBootVersion} = useVersionedCustomFields();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dockerfile');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string>('blank');
  const [options, setOptions] = useState<BuilderOptions>({
    baseFamily: 'hadron',
    baseTag: DEFAULT_BASE_TAGS.hadron,
    hadronVersion: '0.0.4',
    kairosVersion: DEFAULT_KAIROS_VERSION,
    model: 'generic',
    trustedBoot: false,
    cloud: false,
    fips: false,
    kubernetesDistro: 'none',
    kubernetesVersion: 'latest',
    extendSystem: false,
  });

  const generatedDockerfile = useMemo(() => generateDockerfile(options, kairosInitVersion), [options, kairosInitVersion]);
  const generatedConfig = useMemo(() => getExampleById(selectedExample).config, [selectedExample]);

  const [dockerfileText, setDockerfileText] = useState<string>(generatedDockerfile);
  const [configText, setConfigText] = useState<string>(generatedConfig);
  const [dockerfileDirty, setDockerfileDirty] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  const [dockerImageName, setDockerImageName] = useState('my-kairos-image');
  const [dockerImageTag, setDockerImageTag] = useState(DEFAULT_KAIROS_VERSION);
  const [dockerfilePath, setDockerfilePath] = useState('./Dockerfile');
  const [buildContextPath, setBuildContextPath] = useState('.');

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

  const imageRef = useMemo(() => `${dockerImageName}:${dockerImageTag}`, [dockerImageName, dockerImageTag]);
  const generatedBuildCommand = useMemo(
    () => generateDockerBuildCommand(dockerImageName, dockerImageTag, dockerfilePath, buildContextPath),
    [dockerImageName, dockerImageTag, dockerfilePath, buildContextPath],
  );
  const generatedAuroraCommand = useMemo(
    () => generateAuroraBootDockerCommand(imageRef, auroraOptions),
    [imageRef, auroraOptions],
  );

  const [buildCommandText, setBuildCommandText] = useState(generatedBuildCommand);
  const [auroraCommandText, setAuroraCommandText] = useState(generatedAuroraCommand);
  const [buildCommandDirty, setBuildCommandDirty] = useState(false);
  const [auroraCommandDirty, setAuroraCommandDirty] = useState(false);

  useEffect(() => {
    if (!dockerfileDirty) {
      setDockerfileText(generatedDockerfile);
    }
  }, [generatedDockerfile, dockerfileDirty]);

  useEffect(() => {
    if (!configDirty) {
      setConfigText(generatedConfig);
    }
  }, [generatedConfig, configDirty]);

  useEffect(() => {
    if (copiedKey) {
      const timeout = window.setTimeout(() => setCopiedKey(null), 1200);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [copiedKey]);

  useEffect(() => {
    setAuroraOptions((prev) => ({...prev, auroraBootVersion}));
  }, [auroraBootVersion]);

  useEffect(() => {
    if (!buildCommandDirty) {
      setBuildCommandText(generatedBuildCommand);
    }
  }, [buildCommandDirty, generatedBuildCommand]);

  useEffect(() => {
    if (!auroraCommandDirty) {
      setAuroraCommandText(generatedAuroraCommand);
    }
  }, [auroraCommandDirty, generatedAuroraCommand]);

  useEffect(() => {
    if (options.baseFamily !== 'hadron' && options.cloud) {
      setOptions((prev) => ({...prev, cloud: false}));
    }
  }, [options.baseFamily, options.cloud]);

  const invalidCombo = hasInvalidHadronCombination(options);
  const activeExample = getExampleById(selectedExample);

  const onBaseFamilyChange = (value: BaseFamily): void => {
    setOptions((prev) => ({
      ...prev,
      baseFamily: value,
      baseTag: DEFAULT_BASE_TAGS[value],
    }));
  };

  const onToggleTrusted = (value: boolean): void => {
    setOptions((prev) => {
      if (prev.baseFamily === 'hadron' && prev.cloud && prev.fips && value) {
        return prev;
      }
      return {...prev, trustedBoot: value};
    });
  };

  const onToggleFips = (value: boolean): void => {
    setOptions((prev) => {
      if (prev.baseFamily === 'hadron' && prev.cloud && prev.trustedBoot && value) {
        return prev;
      }
      return {...prev, fips: value};
    });
  };

  const copyCurrentTab = async (): Promise<void> => {
    const content = activeTab === 'dockerfile' ? dockerfileText : configText;
    await navigator.clipboard.writeText(content);
    setCopiedKey(activeTab);
  };

  const copyCommand = async (content: string, key: string): Promise<void> => {
    await navigator.clipboard.writeText(content);
    setCopiedKey(key);
  };

  const resetDockerfile = (): void => {
    setDockerfileText(generatedDockerfile);
    setDockerfileDirty(false);
  };

  const resetConfig = (): void => {
    setConfigText(generatedConfig);
    setConfigDirty(false);
  };

  const resetBuildCommand = (): void => {
    setBuildCommandText(generatedBuildCommand);
    setBuildCommandDirty(false);
  };

  const resetAuroraCommand = (): void => {
    setAuroraCommandText(generatedAuroraCommand);
    setAuroraCommandDirty(false);
  };

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <Heading as="h2">Build your Kairos image</Heading>
          <p>
            Create a Dockerfile and cloud-config from options, then tweak both files directly before building.
            This builder is designed to be reusable across Kairos docs, installer flows, and other projects.
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.panel}>
            <h3>Options</h3>

            <div className={styles.row}>
              <label htmlFor="baseFamily">Base image family</label>
              <select
                id="baseFamily"
                value={options.baseFamily}
                onChange={(event) => onBaseFamilyChange(event.target.value as BaseFamily)}>
                <option value="hadron">Hadron</option>
                <option value="ubuntu">Ubuntu</option>
                <option value="debian">Debian</option>
                <option value="fedora">Fedora</option>
                <option value="alpine">Alpine</option>
                <option value="rocky">Rocky</option>
                <option value="opensuse">openSUSE</option>
              </select>
            </div>

            <div className={styles.rowSplit}>
              <div className={styles.row}>
                <label htmlFor="baseTag">Base tag</label>
                <input
                  id="baseTag"
                  value={options.baseTag}
                  onChange={(event) => setOptions((prev) => ({...prev, baseTag: event.target.value}))}
                />
              </div>
              <div className={styles.row}>
                <label htmlFor="hadronVersion">Hadron version</label>
                <input
                  id="hadronVersion"
                  value={options.hadronVersion}
                  onChange={(event) => setOptions((prev) => ({...prev, hadronVersion: event.target.value}))}
                />
              </div>
            </div>

            <div className={styles.rowSplit}>
              <div className={styles.row}>
                <label htmlFor="kairosVersion">Kairos version</label>
                <input
                  id="kairosVersion"
                  value={options.kairosVersion}
                  onChange={(event) => setOptions((prev) => ({...prev, kairosVersion: event.target.value}))}
                />
              </div>
              <div className={styles.row}>
                <label htmlFor="kairosInitVersion">kairos-init version (docs)</label>
                <input id="kairosInitVersion" value={kairosInitVersion} readOnly />
              </div>
            </div>

            <div className={styles.rowSplit}>
              <div className={styles.row}>
                <label htmlFor="k8sDistro">Kubernetes distro</label>
                <select
                  id="k8sDistro"
                  value={options.kubernetesDistro}
                  onChange={(event) =>
                    setOptions((prev) => ({...prev, kubernetesDistro: event.target.value as BuilderOptions['kubernetesDistro']}))
                  }>
                  <option value="none">None</option>
                  <option value="k3s">k3s</option>
                  <option value="k0s">k0s</option>
                </select>
              </div>
              <div className={styles.row}>
                <label htmlFor="k8sVersion">Kubernetes version</label>
                <input
                  id="k8sVersion"
                  value={options.kubernetesVersion}
                  onChange={(event) => setOptions((prev) => ({...prev, kubernetesVersion: event.target.value}))}
                />
              </div>
            </div>

            <div className={styles.row}>
              <label htmlFor="model">Model</label>
              <input id="model" value={options.model} onChange={(event) => setOptions((prev) => ({...prev, model: event.target.value}))} />
            </div>

            <div className={styles.rowSplit}>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={options.trustedBoot}
                  disabled={options.baseFamily === 'hadron' && options.cloud && options.fips}
                  onChange={(event) => onToggleTrusted(event.target.checked)}
                />
                Trusted Boot
              </label>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={options.fips}
                  disabled={options.baseFamily === 'hadron' && options.cloud && options.trustedBoot}
                  onChange={(event) => onToggleFips(event.target.checked)}
                />
                FIPS
              </label>
            </div>

            <div className={styles.rowSplit}>
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

            <div className={styles.row}>
              <label htmlFor="example">Config example</label>
              <select id="example" value={selectedExample} onChange={(event) => setSelectedExample(event.target.value)}>
                {CONFIG_EXAMPLES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.muted}>
              {options.extendSystem
                ? 'Extend system uses an additional hadron-toolchain stage that includes build tooling (for example C compiler and related utilities) so you can prepare artifacts before copying them into the final image.'
                : 'Enable Extend system when you need build tooling in an extra stage (for example compiling binaries and copying them into the final image).'}
              <br />
              Example source: <Link to={activeExample.docsPath}>{activeExample.label}</Link>
            </div>

            {invalidCombo && (
              <div className={styles.warning}>
                Cloud + Trusted Boot + FIPS is intentionally disallowed for now.
              </div>
            )}
          </div>

          <div className={styles.editorShell}>
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
                <button type="button" className={styles.ghostBtn} onClick={copyCurrentTab}>
                  {copiedKey === activeTab ? 'Copied' : activeTab === 'dockerfile' ? 'Copy Dockerfile' : 'Copy config.yaml'}
                </button>
                {activeTab === 'dockerfile' ? (
                  <button type="button" className={styles.ghostBtn} onClick={resetDockerfile}>Regenerate Dockerfile</button>
                ) : (
                  <button type="button" className={styles.ghostBtn} onClick={resetConfig}>Reset config.yaml</button>
                )}
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
              <button type="button" className={styles.ghostBtn} onClick={() => copyCommand(buildCommandText, 'build-command')}>
                {copiedKey === 'build-command' ? 'Copied' : 'Copy build command'}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={resetBuildCommand}>Regenerate command</button>
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
            <h3>AuroraBoot Command Builder</h3>
            <div className={styles.rowSplit4}>
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
              <div className={styles.row}>
                <label htmlFor="stateDir">state_dir</label>
                <input id="stateDir" value={auroraOptions.stateDir} onChange={(event) => setAuroraOptions((prev) => ({...prev, stateDir: event.target.value}))} />
              </div>
            </div>

            <div className={styles.rowSplit4}>
              <div className={styles.row}>
                <label htmlFor="cloudConfigPath">cloud_config path</label>
                <input
                  id="cloudConfigPath"
                  value={auroraOptions.cloudConfigPath}
                  onChange={(event) => setAuroraOptions((prev) => ({...prev, cloudConfigPath: event.target.value}))}
                />
              </div>
              <div className={styles.row}>
                <label htmlFor="diskStateSize">disk.state_size (MB)</label>
                <input
                  id="diskStateSize"
                  value={auroraOptions.diskStateSize}
                  onChange={(event) => setAuroraOptions((prev) => ({...prev, diskStateSize: event.target.value}))}
                />
              </div>
              <div className={styles.row}>
                <label htmlFor="netbootHttpPort">netboot_http_port</label>
                <input
                  id="netbootHttpPort"
                  value={auroraOptions.netbootHttpPort}
                  onChange={(event) => setAuroraOptions((prev) => ({...prev, netbootHttpPort: event.target.value}))}
                />
              </div>
              <div className={styles.row}>
                <label htmlFor="netbootCmdline">netboot.cmdline</label>
                <input
                  id="netbootCmdline"
                  value={auroraOptions.netbootCmdline}
                  onChange={(event) => setAuroraOptions((prev) => ({...prev, netbootCmdline: event.target.value}))}
                />
              </div>
            </div>

            <div className={styles.rowSplit2}>
              <div className={styles.row}>
                <label htmlFor="overlayIsoPath">iso.overlay_iso</label>
                <input
                  id="overlayIsoPath"
                  value={auroraOptions.overlayIsoPath}
                  onChange={(event) => setAuroraOptions((prev) => ({...prev, overlayIsoPath: event.target.value}))}
                />
              </div>
              <div className={styles.row}>
                <label htmlFor="overlayRootfsPath">iso.overlay_rootfs</label>
                <input
                  id="overlayRootfsPath"
                  value={auroraOptions.overlayRootfsPath}
                  onChange={(event) => setAuroraOptions((prev) => ({...prev, overlayRootfsPath: event.target.value}))}
                />
              </div>
            </div>

            <div className={styles.row}>
              <label htmlFor="additionalSet">Additional --set entries (one key=value per line)</label>
              <textarea
                id="additionalSet"
                className={styles.inputArea}
                value={auroraOptions.additionalSet}
                onChange={(event) => setAuroraOptions((prev) => ({...prev, additionalSet: event.target.value}))}
              />
            </div>

            <div className={styles.inlineActions}>
              <button type="button" className={styles.ghostBtn} onClick={() => copyCommand(auroraCommandText, 'aurora-command')}>
                {copiedKey === 'aurora-command' ? 'Copied' : 'Copy AuroraBoot command'}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={resetAuroraCommand}>Regenerate command</button>
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
          </div>
        </div>
      </div>
    </section>
  );
}
