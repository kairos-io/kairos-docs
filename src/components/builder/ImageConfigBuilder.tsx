import type {ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

import {CONFIG_EXAMPLES, getExampleById} from './examples';
import {generateDockerfile, hasInvalidHadronCombination} from './logic';
import type {BaseFamily, BuilderOptions} from './types';
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
  const {kairosInitVersion} = useVersionedCustomFields();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dockerfile');
  const [copiedTab, setCopiedTab] = useState<ActiveTab | null>(null);
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
    if (copiedTab) {
      const timeout = window.setTimeout(() => setCopiedTab(null), 1200);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [copiedTab]);

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
    setCopiedTab(activeTab);
  };

  const resetDockerfile = (): void => {
    setDockerfileText(generatedDockerfile);
    setDockerfileDirty(false);
  };

  const resetConfig = (): void => {
    setConfigText(generatedConfig);
    setConfigDirty(false);
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
                  {copiedTab === activeTab ? 'Copied' : activeTab === 'dockerfile' ? 'Copy Dockerfile' : 'Copy config.yaml'}
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
      </div>
    </section>
  );
}
