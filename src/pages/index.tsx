import type {ReactNode} from 'react';
import {useMemo} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';

import {
  alternativeTracks,
  communityCopy,
  downloadTracks,
  events,
  getNextEvent,
  heroDescription,
  heroHeadline,
  heroTechnicalDescription,
  pressItems,
} from '../components/designs/content';
import styles from './design-a.module.css';

export default function DesignThreePage(): ReactNode {
  const base = useBaseUrl('/');
  const nextEvent = getNextEvent();
  const mottoWords = ['Edge', 'Baremetal', 'Public Cloud', 'VMs'];

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      .filter((item) => new Date(`${item.dateISO}T00:00:00`) >= now)
      .slice(0, 3);
  }, []);

  const design3AlternativeTracks = [
    ...alternativeTracks.map((item) => {
      if (item.title === 'Trusted Boot') {
        return {
          ...item,
          description: 'The most secured way to run Kairos when your device includes a TPM.',
        };
      }

      if (item.title === 'Kairos without Kubernetes') {
        return {
          ...item,
          title: 'Without Kubernetes',
          description: 'Run Kairos as an immutable Linux framework when your workload does not need Kubernetes.',
          href: '/docs/examples/without-kubernetes/',
        };
      }

      return item;
    }),
    {
      title: 'k0s edition',
      description: 'Prefer k0s as your Kubernetes distribution? We got your back.',
      href: '/docs/examples/choosing-kubernetes-distribution/#k0s',
    },
    {
      title: 'FIPS ready',
      description: 'Build Kairos images with FIPS 140-2 compliance packages enabled.',
      href: '/docs/examples/fips/',
    },
  ];

  const downloadTitleByKey: Record<string, string> = {
    cloud: 'For Public Cloud',
    edge: 'For Edge Devices',
    baremetal: 'For Baremetal',
  };

  const downloadBadgesByKey: Record<string, string[]> = {
    cloud: ['AWS', 'Azure', 'GCP'],
    edge: ['RPI', 'NVIDIA'],
    baremetal: ['x86', 'arm64'],
  };

  const supportedDistributions = [
    {name: 'Alpine', src: useBaseUrl('/img/kairos-alpine-logo.png')},
    {name: 'Debian', src: 'https://cdn.simpleicons.org/debian/A81DFA'},
    {name: 'Fedora', src: useBaseUrl('/img/kairos-fedora-logo.png')},
    {name: 'Hadron', src: 'https://hadron-linux.io/images/hadron-logo.svg'},
    {name: 'openSUSE', src: 'https://cdn.simpleicons.org/opensuse/73BA25'},
    {name: 'Rocky', src: 'https://cdn.simpleicons.org/rockylinux/10B981'},
    {name: 'Ubuntu', src: useBaseUrl('/img/kairos-ubuntu-logo.png')},
  ];

  const stackFeatures = [
    {
      label: 'Hadron Linux',
      to: '/blog/2025/12/17/introducing-hadron-the-minimal-upstream-first-linux-base-for-kairos/',
    },
    {label: 'k3s', href: 'https://docs.k3s.io/', newTab: true},
    {label: 'P2P Network', to: '/docs/architecture/network/'},
    {label: 'A/B atomic upgrades', href: 'https://kairos.io/docs/architecture/container/#ab-upgrades'},
    {label: 'Immutable root filesystem', to: '/docs/architecture/immutable/'},
    {label: 'Cloud Init Based', to: '/docs/architecture/cloud-init/'},
    {label: 'Dockerfile Definition', to: '/docs/reference/kairos-factory/'},
    {label: 'Recovery', to: '/docs/reference/recovery_mode/'},
    {label: 'Reset', to: '/docs/reference/reset/'},
    {label: 'OCI upgrades via registries', href: 'https://kairos.io/docs/architecture/container/'},
  ];

  return (
    <Layout title="Kairos - The Cloud Native OS to Operate at Scale" description={heroDescription}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.wrap}>
            <Heading as="h1">{heroHeadline}</Heading>
            <p>{heroDescription}</p>
            <p className={styles.tech}>{heroTechnicalDescription}</p>
            <p className={styles.motto}>
              <span>The Cloud Native OS for</span>
              <span className={styles.wordCarousel} aria-label="Deployment targets">
                <span className={styles.wordCarouselTrack}>
                  {mottoWords.map((word) => (
                    <span key={word}>{word}</span>
                  ))}
                  <span aria-hidden="true">{mottoWords[0]}</span>
                </span>
              </span>
            </p>
          </div>
        </section>

        <section className={styles.socialProof}>
          <div className={styles.wrap}>
            <div className={styles.socialProofRow}>
              <a href="https://www.cncf.io/projects/kairos/" target="_blank" rel="noreferrer" className={styles.cncfInlineLink}>
                <img src={useBaseUrl('/img/logo_cloudnative.png')} alt="CNCF logo" />
                <strong>Sandbox Project</strong>
              </a>
              <div className={styles.socialProofDivider} aria-hidden="true" />
              <div className={styles.quickStartCta}>
                <span>Spin up kairos on a VM in the time you drink a coffee.</span>
                <Link to="/quickstart/" className={styles.quickStartButton}>Quick Start</Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.catalog} id="download">
          <div className={styles.wrap}>
            <Heading as="h2">Download Kairos</Heading>
            <div className={styles.downloadLayout}>
              {downloadTracks.map((track) => {
                return (
                  <Link
                    key={track.key}
                    to={track.href}
                    id={track.key === 'baremetal' ? 'baremetal' : track.key}
                    className={styles.downloadCardActive}>
                    <header>
                      <h3>{downloadTitleByKey[track.key] ?? track.title}</h3>
                      <div className={styles.downloadBadges}>
                        {(downloadBadgesByKey[track.key] ?? [track.key.toUpperCase()]).map((badge) => (
                          <span key={badge}>{badge}</span>
                        ))}
                      </div>
                    </header>
                    <p>{track.description}</p>
                  </Link>
                );
              })}
              <aside className={styles.defaultStack}>
                <strong>What's inside</strong>
                <div className={styles.stackPills}>
                  {stackFeatures.map((feature) => (
                    <Link
                      key={feature.label}
                      to={feature.to}
                      href={feature.href}
                      target={feature.newTab ? '_blank' : undefined}
                      rel={feature.newTab ? 'noreferrer' : undefined}>
                      {feature.label}
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
            <div className={styles.downloadSubsection}>
              <h3>Download Alternatives</h3>
              <div className={styles.altGrid}>
                {design3AlternativeTracks.map((item) => (
                  <Link key={item.title} to={item.href}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.unique}>
          <div className={styles.wrap}>
            <Heading as="h2">What makes Kairos unique</Heading>
            <p>
              Kairos is the only immutable Linux framework in this category that can run across Linux distributions via
              BYOI while keeping one repeatable lifecycle model.
            </p>
            <div className={styles.distroLogos}>
              {supportedDistributions.map((item) => (
                <div key={item.name} className={styles.distroLogoItem}>
                  <img src={item.src} alt={`${item.name} logo`} loading="lazy" />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.compareSection}>
          <div className={styles.wrap}>
            <Heading as="h2">Why Kairos and not ...?</Heading>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th aria-hidden="true" />
                  <th>Kairos</th>
                  <th>Configuration Management Systems</th>
                  <th>Other Special Purpose OSes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>You need predictable operations at fleet scale</td>
                  <td>Kairos keeps machine behavior consistent release after release</td>
                  <td>Consistency depends on ongoing playbook and drift-control discipline</td>
                  <td>Can be consistent, but often coupled to a narrower distro or workflow</td>
                </tr>
                <tr>
                  <td>You want faster maintenance windows</td>
                  <td>Kairos lets teams update and recover nodes with less downtime risk</td>
                  <td>Patch cycles and reconciliation tend to be slower across large fleets</td>
                  <td>Update speed varies by vendor tooling and image pipeline constraints</td>
                </tr>
                <tr>
                  <td>You need one model across cloud, edge and datacenter</td>
                  <td>Kairos uses the same lifecycle approach in every environment</td>
                  <td>Different modules and environment-specific tuning are typically required</td>
                  <td>Many options focus on one environment and need custom work to bridge others</td>
                </tr>
                <tr>
                  <td>You want platform flexibility without lock-in</td>
                  <td>BYOI lets you keep your preferred Linux base while standardizing operations</td>
                  <td>Flexible, but still tied to long-term config ownership and imperative changes</td>
                  <td>Can introduce lock-in through fixed images, tooling, or platform assumptions</td>
                </tr>
                <tr>
                  <td>You need to run cloud-native and non-cloud-native workloads side by side</td>
                  <td>Kairos is optimized for Kubernetes while still supporting standard Linux workloads</td>
                  <td>Possible, but operators usually need extra layers to keep both models consistent</td>
                  <td>Often optimized for one workload model, requiring trade-offs for mixed environments</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.hadron}>
          <div className={styles.wrapTwo}>
            <div>
              <Heading as="h2">Smaller footprint, stronger baseline security, better operational consistency</Heading>
              <p>
                Technically, Hadron provides a purpose-built minimal Linux base optimized for immutable deployments,
                secure boot paths, and efficient image distribution in modern cloud-native operations.
              </p>
              <img src="https://hadron-linux.io/images/hadron-logo.svg" alt="Hadron Linux" />
            </div>
            <iframe
              src="https://www.youtube.com/embed/DszxjGjkJXE"
              title="Rawcode Academy"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>

        <section className={styles.stackSection}>
          <div className={styles.wrapStack}>
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
                    <div key={event.title} className={styles.eventBox}>
                      <strong>{event.dateLabel}</strong>
                      <p>{event.title}</p>
                      <span>{event.conference} — {event.location}</span>
                      <a href={event.url} target="_blank" rel="noreferrer">Event details</a>
                    </div>
                  ))}
                </div>
              ) : nextEvent ? (
                <div className={styles.eventBox}>
                  <strong>{nextEvent.dateLabel}</strong>
                  <p>{nextEvent.title}</p>
                  <span>{nextEvent.conference} — {nextEvent.location}</span>
                  <a href={nextEvent.url} target="_blank" rel="noreferrer">Event details</a>
                </div>
              ) : (
                <div className={styles.eventBox}><p>There is nothing planned for the moment but keep checking our events page for news.</p></div>
              )}
              <Link to="/events/">See all events</Link>
            </article>
          </div>
        </section>

        <section className={styles.cncf}>
          <div className={styles.wrap}>
            <Heading as="h2">We are a Cloud Native Computing Foundation sandbox project.</Heading>
            <img src="https://www.cncf.io/wp-content/uploads/2022/07/cncf-white-logo.svg" alt="CNCF" />
            <p>
              The Linux Foundation (TLF) has registered trademarks and uses trademarks. For a list of TLF trademarks,
              see <a href="https://www.linuxfoundation.org/trademark-usage/" target="_blank" rel="noreferrer">Trademark Usage</a>.
            </p>
          </div>
        </section>

        <section className={styles.community}>
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
