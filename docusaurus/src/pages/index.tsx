import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';


import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const latestVersion = String(siteConfig.customFields?.latestVersion ?? 'v3.7.2');
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className={styles.heroContainer}>
        <div className={styles.heroContent}>
          <Heading as="h1" className={styles.heroTitle}>
            More than an <span className={styles.heroAccent}>edge OS</span>
          </Heading>
          <p className={styles.heroSubtitle}>
            Transform your Linux system and preferred Kubernetes distribution into a secure bootable image for your edge devices.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className={clsx('button button--primary button--lg', styles.quickStartButton)}
              to="/getting-started/">
              Quick Start
            </Link>
            <Link
              className={styles.githubButton}
              href="https://github.com/kairos-io/kairos"
              target="_blank">
              <span className={styles.githubStar} aria-hidden="true">
                <img src={useBaseUrl('/index/star.svg')} alt="" />
              </span>
              <span className={styles.githubText}>Star us on GitHub</span>
            </Link>
          </div>
        </div>
        <div className={styles.heroImage}>
            <img src={useBaseUrl('/img/armadillo.png')} alt="Kairos Logo" width="318" />
            <div className={styles.latestRelease}>
              Check out
              <p>our latest release</p>
              <div className={styles.latestReleaseVersion}>
                <div>Latest release</div>
                <div>
                  <a href={`https://github.com/kairos-io/kairos/releases/tag/${latestVersion}`} target="_blank" rel="noreferrer">
                    {latestVersion}
                  </a>
                </div>
              </div>
            </div>
        </div>
      </div>
    </header>
  );
}

function WelcomeSection() {
  return (
    <section className={styles.welcomeSection}>
      <div className="container">
        <div className={styles.welcomeContent}>
          <div className={styles.welcomeImage}>
              <img src={useBaseUrl('/img/wrapped-armadillo.png')} alt="Kairos Logo" width="318" />
          </div>
          <div className={styles.welcomeText}>
            <Heading as="h2">Welcome to Kairos</Heading>
            <p>Build custom bootable-OS images for your edge devices from your choice of OS and Kubernetes distribution.</p>
            <Link
              href="https://www.cncf.io/online-programs/cncf-on-demand-webinar-meet-kairos-an-oss-project-building-the-immutable-kubernetes-edge/"
              target="_blank"
              className={styles.videoLink}>
              Watch this CNCF Webinar to meet Kairos
              <img src={useBaseUrl('/img/play-button.png')} alt="Play" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: 'Customizable to Your Needs',
      description: "With Kairos, you're in the driver's seat. Build custom bootable-OS images for your edge devices from your choice of OS and Kubernetes distribution. These images are delivered as container images, and can be customized and extended to your needs. Kairos fits neatly into your CI/CD pipelines and lets you use the container engine of choice.",
      icon: '/img/swirl.png',
    },
    {
      title: 'Consistent and Secure',
      description: 'Say goodbye to inconsistencies across your clusters as each node boots from the same immutable image, ensuring uniformity. It also reduces the risk of malicious attacks, and with data encryption, your stored data remains protected, providing enhanced security for your clusters.',
      icon: '/img/security.png',
    },
    {
      title: 'Easy to Install',
      description: 'Set up nodes via QR code, manually, remotely via SSH, interactively or with Kubernetes. We believe in making things simple.',
      icon: '/img/rocket.png',
    },
    {
      title: 'Optimized for Kubernetes',
      description: 'Kairos is optimized for running Kubernetes workloads. Upgrades can be done via Kubernetes. However, it can also be used as a standard Linux distribution.',
      icon: '/img/box.png',
    },
  ];

  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <Heading as="h2" className={styles.featuresTitle}>
          What makes <span className={styles.accent}>Kairos</span> different?
        </Heading>
        <div className={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.feature}>
              <img src={useBaseUrl(feature.icon)} alt="" />
              <Heading as="h3">{feature.title}</Heading>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HotOfPressSection() {
    return (
        <section className={styles.hotPressSection}>
            <div className={styles.hotPressWrap}>
                    <h2>Hot off the press</h2>
                    <div className={styles.pressCards}>
                        <div className={styles.pressCard}>
                            <p>How to integrate Kairos architecturally into an edge AI platform</p>
                            <div className={styles.pressCardImg}>
                                <img src={useBaseUrl('/img/logo_cloudnative.png')} alt="CNCF logo" loading="lazy" />
                            </div>
                            <a href="https://www.cncf.io/blog/2025/12/29/how-to-integrate-kairos-architecturally-into-an-edge-ai-platform/"
                               target="_blank">
                                Read more
                                <i className="fa-solid fa-chevron-right"></i>
                            </a>
                        </div>
                        <div className={styles.pressCard}>
                            <p>Building secure Kubernetes edge images with Kairos and K0s</p>
                            <div className={styles.pressCardImg}>
                                <img src={useBaseUrl('/img/logo_cloudnative.png')} alt="CNCF logo" loading="lazy" />
                            </div>
                            <a href="https://www.cncf.io/blog/2025/03/25/building-secure-kubernetes-edge-images-with-kairos-and-k0s/"
                               target="_blank">
                                Read more
                                <i className="fa-solid fa-chevron-right"></i>
                            </a>
                        </div>
                        <div className={styles.pressCard}>
                            <p>Spectro Cloud announces Hadron, a lightweight, security-first Linux base for modern enterprise edge deployments</p>
                            <div className={styles.pressCardImg}>
                                <img src={useBaseUrl('/img/spectro-intel.png')} alt="Press logo" loading="lazy" />
                            </div>
                            <a href="https://www.businesswire.com/news/home/20260128584925/en/Spectro-Cloud-Announces-Hadron-A-Lightweight-Security-First-Linux-Base-for-Modern-Enterprise-Edge-Deployments"
                               target="_blank">
                                Read more
                                <i className="fa-solid fa-chevron-right"></i>
                            </a>
                        </div>
                    </div>
                    <div className={styles.pressMore}>
                      <Link to="/press/">See more</Link>
                    </div>
                </div>
        </section>
    );
}


function CNCFSection() {
    return (
        <section className={styles.cncfSection}>
            <div className="container">
                <div className={styles.cncfContent}>
                    <Heading as="h2">We are a Cloud Native Computing Foundation sandbox project.</Heading>
                    <img
                        src="https://www.cncf.io/wp-content/uploads/2022/07/cncf-white-logo.svg"
                        alt="CNCF Logo"
                        width="300"
                        height="auto"
                    />
                    <p>The Linux Foundation® (TLF) has registered trademarks and uses trademarks. For a list of TLF
                        trademarks, see <a href="https://www.linuxfoundation.org/trademark-usage/" target="_blank">Trademark
                            Usage</a>.</p>
                </div>
            </div>
        </section>
    );
}

function EventsSection() {
  return (
    <section className={styles.eventsSection}>
      <div className={styles.eventsWrap}>
        <Heading as="h2">Kairos on the road</Heading>
        <p>Come and visit us at one of our upcoming events.</p>
        <div className={styles.eventsCta}>
          <Link to="/events/">See all events</Link>
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
    return (
        <section className={styles.communitySection}>
            <div className="container">
                <Heading as="h2">Join our community</Heading>
                <p className={styles.communityDescription}>
                    Whether you're a part of a DevOps team, an IT engineer, a hobbyist, or a maker, we welcome you to
                    join us in driving forward our vision of a secure, decentralized, and containerized edge.
                </p>
                <div className={styles.communityLinks}>
                    <Link href="https://github.com/kairos-io/kairos" target="_blank" className={styles.communityCard}>
                        <div className={styles.communityIcon}>🐙</div>
                        <p>Contribute on GitHub</p>
                    </Link>
                    <Link href="https://www.linkedin.com/company/kairos-oss/" target="_blank"
                          className={styles.communityCard}>
                        <div className={styles.communityIcon}>💼</div>
                        <p>Follow us on LinkedIn</p>
                    </Link>
                    <Link href="https://slack.cncf.io/#kairos" target="_blank" className={styles.communityCard}>
                        <div className={styles.communityIcon}>💬</div>
                        <p>Join the conversation</p>
                    </Link>
                </div>
            </div>
        </section>
    );
}

function EnterpriseSection() {
    return (
        <section className={styles.enterpriseSection}>
            <div className="container">
                <Heading as="h2">Enterprise Support</Heading>
                <p className={styles.enterpriseDescription}>
                    Need a hand? For enterprise support, <strong>get in touch</strong> with companies ready to help you tackle the toughest challenges.
        </p>
        <div className={styles.enterpriseCard}>
          <div className={styles.enterpriseLogoContainer}>
            <img src={useBaseUrl('/img/spectrocloud-light.svg')} alt="Spectro Cloud Logo" className={styles.enterpriseLogo} />
          </div>
          <p>
            <strong>Spectro Cloud</strong> is the main supporter behind Kairos and provides enterprise-grade Kubernetes management through its platform, Palette, which allows organizations to deploy, manage, and scale Kubernetes across various environments, including public clouds, data centers, bare metal, and edge computing.
          </p>
          <Link
            href="https://www.spectrocloud.com/solutions/kairos-support"
            className="button button--primary button--lg">
            Learn more
          </Link>
        </div>
      </div>
    </section>
  );
}

function AdoptersSection() {
  return (
    <section className={styles.adoptersSection}>
      <div className={styles.adoptersWrap}>
        <Heading as="h2">Adopters</Heading>
        <div className={styles.adoptersCards}>
          <div className={styles.adopterCard}>
            <p>DeEEP Network uses Kairos under the hood of their device to offer a highly secure system with trusted boot.</p>
            <div className={styles.adopterCardImg}>
              <img src={useBaseUrl('/img/deeep-network.png')} alt="DeEEP Network" />
            </div>
            <a href="https://www.deeep.network" target="_blank" rel="noreferrer">Read more</a>
          </div>
          <div className={styles.adopterCard}>
            <p>Are you using Kairos for your product or within your company? <strong>We want to hear from you!</strong></p>
            <div className={styles.adopterCardImg}>
              <img src={useBaseUrl('/img/logo.svg')} alt="Your logo here" />
            </div>
            <a href="mailto:members@kairos.io">Contact us</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function BasicsSection() {
  const basics = [
    {
      title: 'Installation',
      description: 'See how to get up and running with Kairos, in less than 15 minutes!',
      icon: '📦',
      href: '/docs/Installation',
    },
    {
      title: 'Architecture',
      description: 'Get inside Kairos, from the factory to P2P mesh capabilities.',
      icon: '🏗️',
      href: '/docs/Architecture',
    },
    {
      title: 'Examples',
      description: 'Stretch your wings with best practices of common tasks after installing Kairos.',
      icon: '🚀',
      href: '/docs/Examples',
    },
  ];

  return (
    <section className={styles.basicsSection}>
      <div className="container">
        <div className={styles.basicsGrid}>
          {basics.map((item, idx) => (
            <Link key={idx} href={item.href} className={styles.basicCard}>
              <div className={styles.basicIcon}>{item.icon}</div>
              <div>
                <Heading as="h3">{item.title}</Heading>
                <p>{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="More than an edge OS"
      description="Transform your Linux system and preferred Kubernetes distribution into a secure bootable image for your edge devices">
      <HomepageHeader />
      <main>
        <WelcomeSection />
        <HotOfPressSection />
        <FeaturesSection />
        <CNCFSection />
        <EventsSection />
        <CommunitySection />
        <EnterpriseSection />
        <AdoptersSection />
        <BasicsSection />
      </main>
    </Layout>
  );
}
