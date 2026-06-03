import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import {events} from '@site/src/components/designs/content';

export default function EventsPage(): ReactNode {
  return (
    <Layout
      title="Events"
      description="Upcoming and recent events featuring Kairos and its maintainers">
      <main>
        <div className="events-page">
          <h1>Events</h1>
          <div className="lead">
            Upcoming and recent events featuring Kairos and its maintainers
          </div>
          <div className="events-list">
            {events.map((event) => (
              <div className="events-list-item" key={`${event.dateISO}-${event.title}`}>
                <div className="events-list-meta">
                  <span className="events-date">{event.dateLabel}</span>
                  <span className="events-location">{event.location}</span>
                </div>
                <div className="events-list-text">
                  <p className="events-title">{event.title}</p>
                  <p className="events-conference">{event.conference}</p>
                  <a className="events-link" href={event.url} target="_blank" rel="noreferrer">
                    Event details
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
