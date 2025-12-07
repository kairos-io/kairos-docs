import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
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
              className="button button--primary button--lg"
              to="/docs/_index">
              Quick Start
            </Link>
            <Link
              className={clsx('button button--secondary button--lg', styles.githubButton)}
              href="https://github.com/kairos-io/kairos"
              target="_blank">
              ⭐ Star us on GitHub
            </Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          <img src="/img/armadillo.png" alt="Kairos Logo" width="318" />
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
            <img src="/img/armadillo.png" alt="Kairos Armadillo" />
          </div>
          <div className={styles.welcomeText}>
            <Heading as="h2">Welcome to Kairos</Heading>
            <p>Build custom bootable-OS images for your edge devices from your choice of OS and Kubernetes distribution.</p>
            <Link
              href="https://www.cncf.io/online-programs/cncf-on-demand-webinar-meet-kairos-an-oss-project-building-the-immutable-kubernetes-edge/"
              target="_blank"
              className={styles.videoLink}>
              Watch this CNCF Webinar to meet Kairos →
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
      description: 'Build custom bootable-OS images for your edge devices from your choice of OS and Kubernetes distribution. These images are delivered as container images, and can be customized and extended to your needs.',
      icon: '🔄',
    },
    {
      title: 'Consistent and Secure',
      description: 'Each node boots from the same immutable image, ensuring uniformity. It reduces the risk of malicious attacks, and with data encryption, your stored data remains protected.',
      icon: '🔒',
    },
    {
      title: 'Easy to Install',
      description: 'Set up nodes via QR code, manually, remotely via SSH, interactively or with Kubernetes. We believe in making things simple.',
      icon: '⚡',
    },
    {
      title: 'Optimized for Kubernetes',
      description: 'Kairos is optimized for running Kubernetes workloads. Upgrades can be done via Kubernetes. However, it can also be used as a standard Linux distribution.',
      icon: '☸️',
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
              <div className={styles.featureIcon}>{feature.icon}</div>
              <Heading as="h3">{feature.title}</Heading>
              <p>{feature.description}</p>
            </div>
          ))}
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
          <Heading as="h2">We are a Cloud Native Computing Foundation sandbox project</Heading>
          <img
            src="https://www.cncf.io/wp-content/uploads/2022/07/cncf-white-logo.svg"
            alt="CNCF Logo"
            width="300"
            height="auto"
          />
          <p>The Linux Foundation® (TLF) has registered trademarks and uses trademarks. For a list of TLF trademarks, see <a href="https://www.linuxfoundation.org/trademark-usage/" target="_blank">Trademark Usage</a>.</p>
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
          Whether you're a part of a DevOps team, an IT engineer, a hobbyist, or a maker, we welcome you to join us in driving forward our vision of a secure, decentralized, and containerized edge.
        </p>
        <div className={styles.communityLinks}>
          <Link href="https://github.com/kairos-io/kairos" target="_blank" className={styles.communityCard}>
            <div className={styles.communityIcon}>🐙</div>
            <p>Contribute on GitHub</p>
          </Link>
          <Link href="https://www.linkedin.com/company/kairos-oss/" target="_blank" className={styles.communityCard}>
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
            <img src="/img/spectrocloud-light.svg" alt="Spectro Cloud Logo" className={styles.enterpriseLogo} />
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
        <FeaturesSection />
        <CNCFSection />
        <EnterpriseSection />
        <BasicsSection />
        <CommunitySection />
      </main>
    </Layout>
  );
}
