import Layout from '@theme/Layout';

type PressItem = {
  dateISO: string;
  dateLabel: string;
  source: string;
  text: string;
  url: string;
};

const pressItems: PressItem[] = [
  {
    dateISO: '2026-01-28',
    dateLabel: 'Jan 28, 2026',
    source: 'Business Wire',
    text: 'Spectro Cloud announces Hadron, a lightweight, security-first Linux base for modern enterprise edge deployments',
    url: 'https://www.businesswire.com/news/home/20260128584925/en/Spectro-Cloud-Announces-Hadron-A-Lightweight-Security-First-Linux-Base-for-Modern-Enterprise-Edge-Deployments',
  },
  {
    dateISO: '2026-01-28',
    dateLabel: 'Jan 28, 2026',
    source: 'Spectro Cloud',
    text: 'Spectro Cloud announces Hadron, a lightweight, security-first Linux base for modern enterprise edge deployments',
    url: 'https://www.spectrocloud.com/news/announcing-hadron-a-lightweight-security-first-linux-distribution',
  },
  {
    dateISO: '2025-12-29',
    dateLabel: 'Dec 29, 2025',
    source: 'CNCF Blog',
    text: 'How to integrate Kairos architecturally into an edge AI platform',
    url: 'https://www.cncf.io/blog/2025/12/29/how-to-integrate-kairos-architecturally-into-an-edge-ai-platform/',
  },
  {
    dateISO: '2025-03-25',
    dateLabel: 'Mar 25, 2025',
    source: 'CNCF Blog',
    text: 'Building secure Kubernetes edge images with Kairos and K0s',
    url: 'https://www.cncf.io/blog/2025/03/25/building-secure-kubernetes-edge-images-with-kairos-and-k0s/',
  },
  {
    dateISO: '2025-03-10',
    dateLabel: 'Mar 10, 2025',
    source: 'Palark Blog',
    text: 'CNCF Sandbox 2024 H1: Kairos in the CNCF Sandbox roundup',
    url: 'https://palark.com/blog/cncf-sandbox-2024-h1/',
  },
  {
    dateISO: '2024-03-14',
    dateLabel: 'Mar 14, 2024',
    source: 'The New Stack',
    text: 'Check us out in this The New Stack article by our maintainer, Ettore di Giacinto',
    url: 'https://thenewstack.io/honey-i-secured-your-boot-edge-trusted-boot-with-kairos/',
  },
  {
    dateISO: '2023-04-18',
    dateLabel: 'Apr 18, 2023',
    source: 'Spectro Cloud',
    text: "See how we're collaborating with Intel and Spectro Cloud on the new Secure Edge-Native Architecture",
    url: 'https://www.spectrocloud.com/news/spectro-cloud-launches-the-secure-edge-native-architecture-sena',
  },
  {
    dateISO: '2023-03-28',
    dateLabel: 'Mar 28, 2023',
    source: 'The New Stack',
    text: 'Learn how to use the famous OSS project, LocalAI, with Kairos and K3s on your nodes',
    url: 'https://thenewstack.io/looking-for-a-k3os-alternative-choosing-a-container-os-for-edge-k8s/',
  },
];

export default function PressPage(): JSX.Element {
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
