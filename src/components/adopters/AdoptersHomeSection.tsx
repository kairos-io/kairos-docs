import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import {adopters} from '../designs/content';
import {AdopterLogo} from './shared';
import styles from './adopters-home.module.css';

export function AdoptersHomeSection(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <Heading as="h2">Organizations using Kairos</Heading>
        <p className={styles.lead}>
          Real-world adoption across bare metal, edge, and distributed infrastructure as we pursue CNCF Incubation.
        </p>
        <div className={styles.logos}>
          {adopters.map((adopter) => (
            <Link
              key={adopter.id}
              to="/adopters/"
              className={`${styles.logoItem} ${adopter.logoBg === 'dark' ? styles.logoItemDark : styles.logoItemLight}`}
              aria-label={`${adopter.name} — view adopters`}>
              <AdopterLogo adopter={adopter} className={styles.logoImg} />
            </Link>
          ))}
        </div>
        <Link to="/adopters/" className={styles.more}>
          Read adoption stories →
        </Link>
      </div>
    </section>
  );
}
