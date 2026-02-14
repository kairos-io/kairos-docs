import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './community.module.css';

type CommunityLink = {
  name: string;
  url: string;
  desc: string;
  icon: string;
};

const userLinks: CommunityLink[] = [
  {
    name: 'GitHub discussions',
    url: 'https://github.com/kairos-io/kairos/discussions',
    desc: 'Questions?',
    icon: '💬',
  },
  {
    name: 'Kairos community events calendar',
    url: 'https://zoom-lfx.platform.linuxfoundation.org/meetings/kairos?view=week',
    desc: 'Join our planning, office hours and other community meetings!',
    icon: '📅',
  },
  {
    name: 'Kairos community',
    url: 'https://github.com/kairos-io/community',
    desc: 'Kairos community content',
    icon: '🐙',
  },
  {
    name: 'Slack',
    url: 'https://slack.cncf.io/#kairos',
    desc: 'Join us on Slack!',
    icon: '💬',
  },
  {
    name: 'Mailing List',
    url: 'mailto:cncf-kairos-maintainers@lists.cncf.io',
    desc: 'Send us an email!',
    icon: '✉️',
  },
];

const developerLinks: CommunityLink[] = [
  {
    name: 'GitHub',
    url: 'https://github.com/kairos-io/kairos',
    desc: 'Development takes place here!',
    icon: '🐙',
  },
];

function CommunityLinksList({links}: {links: CommunityLink[]}) {
  return (
    <ul className={styles.linkList}>
      {links.map((link) => (
        <li key={link.name} title={link.name}>
          <a target="_blank" rel="noopener noreferrer" href={link.url}>
            <span className={styles.linkIcon} aria-hidden="true">
              {link.icon}
            </span>{' '}
            {link.name}
          </a>
          : {link.desc}
        </li>
      ))}
    </ul>
  );
}

export default function CommunityPage(): React.JSX.Element {
  return (
    <Layout title="Community" description="Join the Kairos community">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Join the Kairos community</h1>
          <p className={styles.heroText}>
            Kairos is an open source project that anyone in the community can use, improve, and enjoy.
            We&apos;d love you to join us! Here&apos;s a few ways to find out what&apos;s happening and get involved.
          </p>
        </div>
      </section>

      <section className={styles.linkBoxSection}>
        <div className={styles.linkBoxGrid}>
          <div className={styles.column}>
            <h2>Learn and Connect</h2>
            <p className={styles.columnIntro}>Using or want to use Kairos? Find out more here:</p>
            <CommunityLinksList links={userLinks} />
          </div>

          <div className={styles.column}>
            <h2>Develop and Contribute</h2>
            <p className={styles.columnIntro}>
              If you want to get more involved by contributing to Kairos, join us here:
            </p>
            <CommunityLinksList links={developerLinks} />
            <p className={styles.contributeLine}>
              You can find out how to contribute to Kairos in our{' '}
              <Link to="/docs/contribution-guidelines">Contribution Guidelines</Link>.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
