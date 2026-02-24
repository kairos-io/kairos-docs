import Layout from '@theme/Layout';

type EventItem = {
  date: string;
  location: string;
  title: string;
  conference: string;
  url: string;
};

const events: EventItem[] = [
  {
    date: 'Mar 26',
    location: 'Amsterdam, NL',
    title: 'Cloud Native at the Far(m) Edge: Running Kubernetes and AI on Tractors',
    conference: 'KubeCon EU',
    url: 'https://kccnceu2026.sched.com/event/2CW75/cloud-native-at-the-farm-edge-running-kubernetes-and-ai-on-tractors-mauro-morales-spectro-cloud-jordan-karapanagiotis-aurea-imaging',
  },
  {
    date: 'Mar 23',
    location: 'Amsterdam, NL',
    title: "Project Lightning Talk: What's New In Kairos, 2026 Edition",
    conference: 'KubeCon EU',
    url: 'https://kccnceu2026.sched.com/event/2EFx4/project-lightning-talk-whats-new-in-kairos-2026-edition-mauro-morales-maintainer',
  },
  {
    date: 'Feb 04',
    location: 'Ghent, BE',
    title: 'From Zero to Immutable Kubernetes',
    conference: 'CfgMgmtCamp',
    url: 'https://cfp.cfgmgmtcamp.org/ghent2026/talk/W9LUC3/',
  },
  {
    date: 'Feb 02',
    location: 'Ghent, BE',
    title: 'Cloud Native at the Far(m) Edge: Running Kubernetes and AI on Tractors',
    conference: 'CfgMgmtCamp',
    url: 'https://cfp.cfgmgmtcamp.org/ghent2026/talk/UYXXAQ/',
  },
  {
    date: 'Jan 31',
    location: 'Brussels, BE',
    title: 'What Image-Based Systems Taught Us About Linux Distributions',
    conference: 'FOSDEM',
    url: 'https://fosdem.org/2026/schedule/event/YQRYB7-hadron-linux/',
  },
];

export default function EventsPage(): JSX.Element {
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
              <div className="events-list-item" key={`${event.date}-${event.title}`}>
                <div className="events-list-meta">
                  <span className="events-date">{event.date}</span>
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
