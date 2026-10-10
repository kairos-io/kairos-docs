import type {ReactNode} from 'react';
import Layout from '@theme/Layout';

import {pressItems} from '../../components/designs/content';

export default function PressPage(): ReactNode {
  return (
    <Layout
      title="Press"
      description="Press releases and coverage featuring Kairos and its maintainers">
      <main>
        <div className="press-page">
          <h1>Press</h1>
          <div className="lead">
            Press releases and coverage featuring Kairos and its maintainers
          </div>
          <div className="press-list">
            {pressItems.map((item) => (
              <div className="press-list-item" key={`${item.dateISO}-${item.url}`}>
                <div className="press-list-text">
                  <div className="press-list-meta">
                    <time dateTime={item.dateISO}>{item.dateLabel}</time>
                    <span>{item.source}</span>
                  </div>
                  <p>{item.text}</p>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer">
                  Read more
                  <span aria-hidden="true">›</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
