import type {ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import {buildKairosImageName} from '@site/src/components/kairos-image-name';
import {useVersionedCustomFields} from '@site/src/utils/versionedCustomFields';

import styles from './ImageConfigBuilder.module.css';

type HostOs = 'macos' | 'linux' | 'windows' | 'unknown';

type AlternativeTrack = {
  title: string;
  description: string;
  href: string;
};

type ImageConfigBuilderProps = {
  alternatives?: AlternativeTrack[];
};

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

export default function ImageConfigBuilder({alternatives = []}: ImageConfigBuilderProps): ReactNode {
  const alternativesRef = useRef<HTMLDivElement | null>(null);
  const easyCardRef = useRef<HTMLDivElement | null>(null);
  const {
    k3sVersion,
    kairosVersion,
    hadronFlavorRelease,
  } = useVersionedCustomFields();
  const effectiveKairosVersion = kairosVersion || DEFAULT_KAIROS_VERSION;
  const effectiveK3sVersion = k3sVersion || DEFAULT_K3S_VERSION;
  const effectiveHadronVersion = (hadronFlavorRelease ?? DEFAULT_HADRON_VERSION).replace(/^v/, '');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hostOs, setHostOs] = useState<HostOs>('unknown');
  const [hostOsOverride, setHostOsOverride] = useState<HostOs | null>(null);
  const [preferManualFlow, setPreferManualFlow] = useState(false);
  const kairosLabCommandRef = useRef<HTMLTextAreaElement | null>(null);

  const effectiveHostOs = hostOsOverride ?? hostOs;
  const kairosLabCommand = useMemo(() => {
    if (effectiveHostOs === 'macos') {
      return `brew install kairos-io/kairos/kairos-lab
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
  const easyIsoArtifacts = useMemo(() => {
    const hadronTag = effectiveHadronVersion.startsWith('v') ? effectiveHadronVersion : `v${effectiveHadronVersion}`;

    const buildIsoName = (arch: 'amd64' | 'arm64'): string => {
      const baseName = buildKairosImageName({
        variant: 'standard',
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
  }, [effectiveK3sVersion, effectiveHadronVersion, effectiveKairosVersion]);

  useEffect(() => {
    setHostOs(detectHostOs());
  }, []);

  useEffect(() => {
    if (!copiedKey) return;
    const timeout = window.setTimeout(() => setCopiedKey(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [copiedKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stackedMediaQuery = window.matchMedia('(max-width: 996px)');

    const resizeTextarea = (textarea: HTMLTextAreaElement | null): void => {
      if (!textarea) {
        return;
      }

      if (!stackedMediaQuery.matches) {
        textarea.style.height = '';
        return;
      }

      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    const resizeAll = (): void => {
      resizeTextarea(kairosLabCommandRef.current);
    };

    resizeAll();

    const onMediaChange = (): void => resizeAll();
    stackedMediaQuery.addEventListener('change', onMediaChange);
    window.addEventListener('resize', resizeAll);

    return () => {
      stackedMediaQuery.removeEventListener('change', onMediaChange);
      window.removeEventListener('resize', resizeAll);
    };
  }, [kairosLabCommand]);

  useEffect(() => {
    if (!easyCardRef.current || !alternativesRef.current) return;

    const syncHeight = (): void => {
      if (!easyCardRef.current || !alternativesRef.current) return;
      const easyCardHeight = easyCardRef.current.offsetHeight;
      alternativesRef.current.style.height = `${easyCardHeight}px`;
    };

    syncHeight();
    window.addEventListener('resize', syncHeight);

    return () => {
      window.removeEventListener('resize', syncHeight);
    };
  }, [showKairosLabFlow, showManualFlow]);

  const copyText = async (key: string, text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
  };

  const onHostOsSelect = (value: Exclude<HostOs, 'unknown'>): void => {
    setHostOsOverride(value);
    setPreferManualFlow(value === 'windows');
  };

  const restoreDetectedOs = (): void => {
    setHostOsOverride(null);
    setPreferManualFlow(hostOs === 'windows' || hostOs === 'unknown');
  };

  useEffect(() => {
    if (!alternativesRef.current || alternatives.length === 0) return;

    const container = alternativesRef.current;
    let animationId: number;
    let isPaused = false;

    const scroll = (): void => {
      if (isPaused) {
        animationId = requestAnimationFrame(scroll);
        return;
      }

      container.scrollTop += 0.5;

      if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
        container.scrollTop = 0;
      }

      animationId = requestAnimationFrame(scroll);
    };

    const handleMouseEnter = (): void => {
      isPaused = true;
    };

    const handleMouseLeave = (): void => {
      isPaused = false;
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [alternatives]);

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.downloadLayout}>
          <div className={styles.downloadMain}>
            <div className={styles.head}>
              <Heading as="h2">Download Kairos with Hadron Linux and k3s</Heading>
            </div>

            <div className={styles.easyCard} ref={easyCardRef}>
              {showKairosLabFlow && (
                <div className={styles.kairosLabGrid}>
                  <p className={styles.superSimpleIntro}>
                    <a href="https://github.com/kairos-io/kairos-lab" target="_blank" rel="noreferrer">kairos-lab</a> is the easiest way to get started on{' '}
                    <button type="button" className={styles.inlineOsLink} onClick={() => onHostOsSelect('macos')}>macOS</button> and{' '}
                    <button type="button" className={styles.inlineOsLink} onClick={() => onHostOsSelect('linux')}>Linux</button>.
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
                    <textarea
                      ref={kairosLabCommandRef}
                      readOnly
                      className={`${styles.commandArea} ${styles.superSimpleCommand}`}
                      value={kairosLabCommand}
                    />
                  </div>

                  <button type="button" className={styles.byoiAction} onClick={() => setPreferManualFlow(true)}>
                    You can always use your preferred virtualization software instead
                    <span aria-hidden="true">→</span>
                  </button>

                  <div className={styles.easyDivider} />

                  <div className={styles.row}>
                    <Link className={styles.installButton} to="/quickstart/#installing-the-os">
                      Install
                    </Link>
                  </div>
                </div>
              )}

              {showManualFlow && (
                <>
                  <p className={styles.superSimpleIntro}>Choose an architecture for your ISO</p>

                  <div className={styles.row}>
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

                    {(effectiveHostOs === 'macos' || effectiveHostOs === 'linux') && (
                      <div className={styles.manualKairosLabCta}>
                        <button type="button" className={styles.byoiAction} onClick={() => setPreferManualFlow(false)}>
                          Use kairos-lab guided setup instead (only for macOS and Linux)
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={styles.easyDivider} />

                  <div className={styles.row}>
                    <Link className={styles.installButton} to="/quickstart/#installing-the-os">
                      Install
                    </Link>
                  </div>

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

          {alternatives.length > 0 && (
            <div className={styles.downloadAlternatives}>
              <div className={styles.head}>
                <Heading as="h2">Alternatives</Heading>
              </div>
              <div className={styles.alternativesScroller} ref={alternativesRef}>
                <div className={styles.altGrid}>
                  {alternatives.map((item) => (
                    <Link key={item.title} to={item.href} className={styles.altItem}>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
