import type {ReactNode} from 'react';

import {adopters, ADOPTER_APPLICATION_URL} from '../designs/content';
import {AdopterLogo} from './shared';
import styles from './adopters-page.module.css';

export function AdoptersPageContent(): ReactNode {
  return (
    <div className={styles.page}>
      <h1>Kairos adopters</h1>
      <p className={styles.lead}>Organizations using Kairos in real environments.</p>

      <div className={styles.cta}>
        <h2>Help us become incubated — become an adopter</h2>
        <p>
          Kairos is applying to move from CNCF Sandbox to Incubation. Organizations using Kairos can support this
          milestone and be recognized for real-world adoption.
        </p>
        <a href={ADOPTER_APPLICATION_URL} target="_blank" rel="noreferrer" className={styles.ctaButton}>
          Apply to become an adopter
        </a>
      </div>

      <div className={styles.list}>
        {adopters.map((adopter) => (
          <article key={adopter.id} className={styles.item} id={adopter.id}>
            <div className={`${styles.logo} ${adopter.logoBg === 'dark' ? styles.logoDark : styles.logoLight}`}>
              <AdopterLogo adopter={adopter} className={styles.logoImg} />
            </div>
            <div className={styles.body}>
              <h3>{adopter.name}</h3>
              {adopter.isServiceProvider && adopter.serviceProviderNotice ? (
                <p className={styles.notice}>{adopter.serviceProviderNotice}</p>
              ) : null}
              <p className={styles.useCase}>{adopter.useCase}</p>
              <div className={styles.links}>
                <a href={adopter.website} target="_blank" rel="noreferrer">
                  Visit website
                </a>
                {adopter.issueUrl ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    <a href={adopter.issueUrl} target="_blank" rel="noreferrer">
                      Adopter application
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
