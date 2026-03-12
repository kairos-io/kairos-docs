import type {ReactNode} from 'react';
import {useMemo} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';

import {communityCopy, events, getNextEvent, pressItems} from '../components/designs/content';
import styles from './design-b.module.css';

export default function DesignSixPage(): ReactNode {
  const base = useBaseUrl('/');
  const nextEvent = getNextEvent();
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      .filter((item) => new Date(`${item.dateISO}T00:00:00`) >= now)
      .slice(0, 3);
  }, []);

  return (
    <Layout
      title="Design 6 — Hadron + Kairos = The Cloud Native OS"
      description="Hadron + Kairos makes machine operations feel cloud-native by default.">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.wrap}>
            <div className={styles.heroLayout}>
              <div>
                <p className={styles.kicker}>Design 6 — Vision concept</p>
                <Heading as="h1">The Cloud Native OS</Heading>
                <p className={styles.lead}>
                  Linux, reimagined for fleet operations. Hadron provides the compact, security-first base. Kairos turns
                  that base into a continuous operating system delivery model.
                </p>
                <div className={styles.heroCtas}>
                  <a href="#mission" className={styles.primary}>Choose your mission</a>
                  <Link to="/quickstart/" className={styles.secondary}>Quick Start</Link>
                </div>
                <div className={styles.cncfHeroBadge}>
                  <a href="https://www.cncf.io/projects/kairos/" target="_blank" rel="noreferrer">
                    <img src={useBaseUrl('/img/logo_cloudnative.png')} alt="CNCF logo" />
                    <span>Sandbox Project</span>
                  </a>
                </div>
              </div>
              <aside className={styles.heroLogosPlain}>
                <img src="https://hadron-linux.io/images/hadron-logo.svg" alt="Hadron Linux" />
                <img src={useBaseUrl('/img/kairos-name-logo.png')} alt="Kairos" />
              </aside>
            </div>
          </div>
          <div className={styles.orbit} aria-hidden="true" />
        </section>

        <section className={styles.contract}>
          <div className={styles.wrap}>
            <Heading as="h2">The operating contract</Heading>
            <div className={styles.contractGrid}>
              <article><h3>Image-first installation</h3><p>Provision from OCI-defined machine state, not hand-tuned host mutation.</p></article>
              <article><h3>Registry-native upgrades</h3><p>Distribute upgrades through registries to every environment consistently.</p></article>
              <article><h3>Atomic fallback</h3><p>Rollback is a first-class primitive, not emergency manual surgery.</p></article>
              <article><h3>BYOI flexibility</h3><p>Use Hadron by default, or onboard your Linux base with the same lifecycle behavior.</p></article>
            </div>
          </div>
        </section>

        <section id="mission" className={styles.mission}>
          <div className={styles.wrapWide}>
            <div className={styles.missionHead}>
              <Heading as="h2">Choose your mission</Heading>
              <p>Start where you are. Keep one operating model.</p>
            </div>
            <div className={styles.missionLayout}>
              <div className={styles.missionStack}>
                <Link to="/docs/installation/cloud-servers/" className={styles.missionCard}><strong>Cloud Fleet</strong><span>Immutable VM images for public and private cloud workflows.</span></Link>
                <Link to="/docs/installation/edge-devices/" className={styles.missionCard}><strong>Edge Estate</strong><span>Raspberry Pi and Nvidia Orin class devices with predictable lifecycle operations.</span></Link>
                <Link to="/docs/installation/bare-metal/" className={styles.missionCard}><strong>Datacenter Metal</strong><span>Physical infrastructure with image-native upgrades and rollback safety.</span></Link>
              </div>
              <aside className={styles.defaultBundle}>
                <strong>Default build includes</strong>
                <div className={styles.bundlePills}>
                  <span>Hadron (minimal linux distribution)</span>
                  <span>k3s</span>
                  <span>edgevpn</span>
                  <span>A/B atomic upgrades</span>
                  <span>Immutable root filesystem</span>
                  <span>Recovery and reset workflows</span>
                  <span>OCI upgrades via registries</span>
                </div>
              </aside>
            </div>

            <div className={styles.downloadSubsection}>
              <h3>Download Alternatives</h3>
              <div className={styles.altGrid}>
                <Link to="/docs/examples/multi-node/" className={styles.altCard}>
                  <strong>k0s edition</strong>
                  <span>Prefer k0s as your Kubernetes distribution? We got your back.</span>
                </Link>
                <Link to="/docs/reference/byoi/" className={styles.altCard}>
                  <strong>Bring Your Own OS</strong>
                  <span>Kairos Ubuntu, Kairos Fedora, Kairos Alpine and other BYOI paths.</span>
                </Link>
                <Link to="/docs/installation/trustedboot/" className={styles.altCard}>
                  <strong>Trusted Boot</strong>
                  <span>The most secured way to run Kairos when a device includes a TPM.</span>
                </Link>
                <Link to="/quickstart/" className={styles.altCard}>
                  <strong>Withouto Kubernetes</strong>
                  <span>Run Kairos as an immutable Linux framework when your workload does not need Kubernetes.</span>
                </Link>
                <Link to="/docs/development/" className={styles.altCard}>
                  <strong>Development images</strong>
                  <span>Build and iterate with custom image pipelines and development workflows.</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.mediaBand}>
          <div className={styles.wrapTwo}>
            <article className={styles.videoIntro}>
              <Heading as="h2">Smaller footprint, stronger baseline security, better operational consistency</Heading>
              <p>
                Technically, Hadron provides a purpose-built minimal Linux base optimized for immutable deployments,
                secure boot paths, and efficient image distribution in modern cloud-native operations.
              </p>
              <p className={styles.subtle}>Hadron provides the base. Kairos provides the lifecycle brain.</p>
              <img src="https://hadron-linux.io/images/hadron-logo.svg" alt="Hadron Linux" className={styles.hadronMark} />
            </article>
            <iframe
              src="https://www.youtube.com/embed/DszxjGjkJXE"
              title="Rawcode Academy"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>

        <section className={styles.proofGrid}>
          <div className={styles.wrapGrid}>
            <article>
              <Heading as="h2">Hot off the press</Heading>
              <div className={styles.pressList}>
                {pressItems.map((item) => (
                  <a key={item.title} href={item.href} target="_blank" rel="noreferrer">
                    <img
                      src={
                        item.title.includes('Spectro Cloud announces Hadron')
                          ? useBaseUrl('/img/spectrocloud-dark.svg')
                          : `${base}${item.logo.replace(/^\//, '')}`
                      }
                      alt={item.logoAlt}
                    />
                    <div>
                      <span>{item.title}</span>
                    </div>
                  </a>
                ))}
              </div>
              <Link to="/press/" className={styles.pressLink}>See all press</Link>
            </article>

            <article>
              <Heading as="h2">Kairos on the road</Heading>
              {upcomingEvents.length > 0 ? (
                <div className={styles.eventsList}>
                  {upcomingEvents.map((event) => (
                    <div key={event.title} className={styles.event}>
                      <strong>{event.dateLabel}</strong>
                      <p>{event.title}</p>
                      <span>{event.conference} — {event.location}</span>
                      <a href={event.url} target="_blank" rel="noreferrer">Event details</a>
                    </div>
                  ))}
                </div>
              ) : nextEvent ? (
                <div className={styles.event}>
                  <strong>{nextEvent.dateLabel}</strong>
                  <p>{nextEvent.title}</p>
                  <span>{nextEvent.conference} — {nextEvent.location}</span>
                  <a href={nextEvent.url} target="_blank" rel="noreferrer">Event details</a>
                </div>
              ) : (
                <div className={styles.event}><p>There is nothing planned for the moment but keep checking our events page for news.</p></div>
              )}
              <Link to="/events/">See all events</Link>
            </article>
          </div>
        </section>

        <section className={styles.finalBand}>
          <div className={styles.wrapFinal}>
            <div>
              <Heading as="h2">Build the next generation of Linux operations</Heading>
              <p>Not another immutable distro. A complete machine lifecycle framework designed for cloud-native reality.</p>
              <div className={styles.heroCtas}>
                <Link to="/quickstart/" className={styles.primary}>Start now</Link>
                <Link to="/docs/reference/byoi/" className={styles.secondary}>Explore BYOI</Link>
                <a href="https://github.com/kairos-io/kairos" className={styles.ghost}>Read the source</a>
              </div>
            </div>
            <div className={styles.carousel}>
              <div className={styles.carouselTrack}>
                <article className={styles.carouselCard}>
                  <h3>From package drift to image intent</h3>
                  <p>Cloud Native OS fleets stay aligned to promoted image revisions.</p>
                </article>
                <article className={styles.carouselCard}>
                  <h3>From node maintenance to release flow</h3>
                  <p>Build, sign, promote, observe, and recover machines like modern software.</p>
                </article>
                <article className={styles.carouselCard}>
                  <h3>From edge special-casing to one control model</h3>
                  <p>Use the same lifecycle semantics for cloud VMs, datacenter metal, and edge devices.</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.communityEnterprise}>
          <div className={styles.wrapTwoColumn}>
            <article>
              <Heading as="h2">Join our community</Heading>
              <p>{communityCopy}</p>
              <div className={styles.communityList}>
                <a href="https://github.com/kairos-io/kairos" target="_blank" rel="noreferrer" className={styles.communityItem}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.37 0 0 5.37 0 12a12 12 0 0 0 8.2 11.4c.6.11.82-.25.82-.57v-2c-3.34.73-4.04-1.41-4.04-1.41-.55-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.08 1.83 1.22 1.83 1.22 1.06 1.8 2.8 1.28 3.48.98.1-.76.42-1.28.76-1.57-2.67-.3-5.47-1.32-5.47-5.9 0-1.31.47-2.38 1.23-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.6 11.6 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.59-2.8 5.59-5.48 5.88.43.37.81 1.09.81 2.2v3.26c0 .32.22.69.83.57A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
                  </svg>
                  <div>
                    <strong>GitHub</strong>
                    <span>Sources, Issues, PRs and discussions</span>
                  </div>
                </a>
                <a href="https://www.linkedin.com/company/kairos-oss/" target="_blank" rel="noreferrer" className={styles.communityItem}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.48 1s2.5 1.12 2.5 2.5ZM.4 8h4.16v13.5H.4V8ZM8.2 8h3.98v1.84h.06c.56-1.06 1.92-2.18 3.95-2.18 4.22 0 5 2.78 5 6.39v7.45H17v-6.6c0-1.57-.03-3.59-2.18-3.59-2.18 0-2.52 1.7-2.52 3.47v6.72H8.2V8Z" />
                  </svg>
                  <div>
                    <strong>LinkedIn</strong>
                    <span>Socials and announcements</span>
                  </div>
                </a>
                <a href="https://slack.cncf.io/#kairos" target="_blank" rel="noreferrer" className={styles.communityItem}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9.6 1.2a2.4 2.4 0 1 0-4.8 0v2.4h4.8V1.2ZM12 1.2a2.4 2.4 0 1 1 4.8 0v2.4H12V1.2ZM1.2 9.6a2.4 2.4 0 1 1 0-4.8h2.4v4.8H1.2ZM1.2 12a2.4 2.4 0 1 0 0 4.8h2.4V12H1.2ZM9.6 22.8a2.4 2.4 0 1 1-4.8 0v-2.4h4.8v2.4ZM12 22.8a2.4 2.4 0 1 0 4.8 0v-2.4H12v2.4ZM22.8 9.6a2.4 2.4 0 1 0 0-4.8h-2.4v4.8h2.4ZM22.8 12a2.4 2.4 0 1 1 0 4.8h-2.4V12h2.4ZM8.4 4.8h7.2V12H8.4V4.8ZM8.4 12h7.2v7.2H8.4V12Z" />
                  </svg>
                  <div>
                    <strong>Slack</strong>
                    <span>CNCF Slack channel</span>
                  </div>
                </a>
              </div>
            </article>

            <article>
              <Heading as="h2">Enterprise support</Heading>
              <p>Need a hand? For enterprise support, <strong>get in touch</strong> with companies ready to help you tackle the toughest challenges.</p>
              <p><strong>Spectro Cloud</strong> is the main supporter behind Kairos and provides enterprise-grade Kubernetes management through its platform, Palette, which allows organizations to deploy, manage, and scale Kubernetes across various environments, including public clouds, data centers, bare metal, and edge computing.</p>
              <div className={styles.enterpriseActionRow}>
                <img src={useBaseUrl('/img/spectrocloud-dark.svg')} alt="Spectro Cloud" className={styles.spectro} />
                <a className={styles.enterpriseLink} href="https://www.spectrocloud.com/solutions/kairos-support">Learn more</a>
              </div>
            </article>
          </div>
        </section>
      </main>
    </Layout>
  );
}
