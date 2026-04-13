import type {ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import {buildKairosImageName} from '@site/src/components/kairos-image-name';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

import styles from './ImageConfigBuilder.module.css';

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

const DEFAULT_KAIROS_VERSION = 'v4.0.1';
const DEFAULT_K3S_VERSION = 'latest';
const DEFAULT_HADRON_VERSION = '0.0.4';

function getEasyConfig(profile: 'k3s' | 'none'): string {
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

  return `#cloud-config
users:
  - name: kairos
    passwd: kairos
    groups: [admin]
`;
}

export default function ImageConfigBuilder(): ReactNode {
  const {
    k3sVersion,
    kairosVersion,
    hadronFlavorRelease,
  } = useVersionedCustomFields();
  const effectiveKairosVersion = kairosVersion || DEFAULT_KAIROS_VERSION;
  const effectiveK3sVersion = k3sVersion || DEFAULT_K3S_VERSION;
  const effectiveHadronVersion = (hadronFlavorRelease ?? DEFAULT_HADRON_VERSION).replace(/^v/, '');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [easyProfile, setEasyProfile] = useState<EasyProfile>('none');
  const [hostOs, setHostOs] = useState<HostOs>('unknown');
  const [hostOsOverride, setHostOsOverride] = useState<HostOs | null>(null);
  const [preferManualFlow, setPreferManualFlow] = useState(false);

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
    const hadronTag = effectiveHadronVersion.startsWith('v') ? effectiveHadronVersion : `v${effectiveHadronVersion}`;
    const variant = easyProfile === 'none' ? 'core' : 'standard';

    const buildIsoName = (arch: 'amd64' | 'arm64'): string => {
      const baseName = buildKairosImageName({
        variant,
        arch,
        model: 'generic',
        kairosVersion: effectiveKairosVersion,
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
      amd64Url: `https://github.com/kairos-io/kairos/releases/download/${effectiveKairosVersion}/${amd64}`,
      arm64Url: `https://github.com/kairos-io/kairos/releases/download/${effectiveKairosVersion}/${arm64}`,
    };
  }, [easyProfile, effectiveK3sVersion, effectiveHadronVersion, effectiveKairosVersion]);

  const easyGeneratedConfig = useMemo(() => getEasyConfig(easyProfile), [easyProfile]);
  const [easyConfigText, setEasyConfigText] = useState(easyGeneratedConfig);
  const [easyConfigDirty, setEasyConfigDirty] = useState(false);

  // kairos-lab flow always shows k3s config
  const kairosLabGeneratedConfig = getEasyConfig('k3s');
  const [kairosLabConfigText, setKairosLabConfigText] = useState(kairosLabGeneratedConfig);
  const [kairosLabConfigDirty, setKairosLabConfigDirty] = useState(false);

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

  const copyText = async (key: string, text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
  };

  const onEasyProfileChange = (value: EasyProfile): void => {
    setEasyProfile(value);
    setEasyConfigDirty(false);
  };

  const onHostOsSelect = (value: Exclude<HostOs, 'unknown'>): void => {
    setHostOsOverride(value);
    setPreferManualFlow(value === 'windows');
  };

  const restoreDetectedOs = (): void => {
    setHostOsOverride(null);
    setPreferManualFlow(hostOs === 'windows' || hostOs === 'unknown');
  };

  const osTabs = (
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
  );

  const configEditor = (
    <div className={styles.downloadConfigCol}>
      <p className={styles.configLabel}>Use this cloud config when installing Kairos</p>
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
  );

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <Heading as="h2">Download</Heading>
        </div>

        <div className={styles.easyCard}>
          {showKairosLabFlow && (
            <div className={styles.kairosLabGrid}>
              {/* Row 1: OS tabs | config label */}
              {osTabs}
              <p className={styles.configLabel}>Use this cloud config when installing Kairos</p>

              {/* Row 2: intro text | (spacer) */}
              <p className={styles.superSimpleIntro}>
                Install <a href="https://github.com/kairos-io/kairos-lab" target="_blank" rel="noreferrer">kairos-lab</a> and get a working local VM setup in a few commands.
              </p>
              <div aria-hidden="true" />

              {/* Row 3: textareas — aligned by the 200px grid row */}
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
              <div className={styles.easyConfigShell}>
                <button
                  type="button"
                  className={styles.iconCopyBtn}
                  aria-label="Copy config.yaml"
                  title={copiedKey === 'kairos-lab-config' ? 'Copied' : 'Copy config.yaml'}
                  onClick={() => copyText('kairos-lab-config', kairosLabConfigText)}>
                  <span className={styles.copyIcon} aria-hidden="true" />
                </button>
                <textarea
                  className={`${styles.commandArea} ${styles.easyConfigArea}`}
                  value={kairosLabConfigText}
                  onChange={(event) => {
                    setKairosLabConfigText(event.target.value);
                    setKairosLabConfigDirty(true);
                  }}
                />
              </div>

              {/* Row 4: switch button | k3s note */}
              <button type="button" className={styles.byoiAction} onClick={() => setPreferManualFlow(true)}>
                Prefer your virtualization software instead
                <span aria-hidden="true">→</span>
              </button>
              <p className={styles.kairosLabNote}>
                To enable k3s make sure you use a &apos;standard&apos; image. Core images do not include k3s.
              </p>
            </div>
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
                    <Link
                      className={styles.byoiAction}
                      to="/docs/reference/kairos-factory/">
                      Or build your own image based on your preferred <span className={styles.orAccent}>Linux distribution</span>
                      <span aria-hidden="true">→</span>
                    </Link>
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

                {configEditor}
              </div>

              <div className={styles.easySubRow}>
                <p className={styles.altInstallLinks}>
                  Or get images for <Link to="/docs/installation/cloud-servers/">Public Cloud</Link> or <Link to="/docs/installation/edge-devices/">Edge Devices</Link>
                </p>
                <Link
                  className={styles.exampleConfigCta}
                  to="/docs/reference/kairos-factory/">
                  Or build your own image in the <span className={styles.orAccent}>Kairos Factory</span>
                  <span aria-hidden="true">→</span>
                </Link>
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
      </div>
    </section>
  );
}
