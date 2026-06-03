export type PressItem = {
  dateISO: string;
  dateLabel: string;
  source: string;
  text: string;
  url: string;
  logo: string;
  logoAlt: string;
  hideFromHomepage?: boolean;
};

export type EventItem = {
  dateISO: string;
  dateLabel: string;
  location: string;
  title: string;
  conference: string;
  url: string;
};

export const heroHeadline = 'The Immutable OS to Operate at Scale.';

export const heroDescription =
  'Kairos is a Linux Framework managing the full lifecycle of machines — from installation to upgrades and recovery. It makes large numbers of machines predictable, reproducible, and easy to operate over time. Kairos brings strong operational guarantees to Linux — from the edge to the datacenter.';

export const heroTechnicalDescription =
  'Under the hood, Kairos uses OCI image-based deployments, immutable root filesystems, and atomic upgrades distributed via image registries — without locking you to a specific Linux distribution.';

export const downloadTracks = [
  {
    key: 'cloud',
    title: 'Kairos Linux Cloud',
    description: 'Deploy reproducible images for cloud VMs and virtualized infrastructure.',
    href: '/docs/installation/cloud-servers/',
  },
  {
    key: 'edge',
    title: 'Kairos Linux on Edge',
    description: 'Run on devices such as Raspberry Pi and Nvidia Orin with the same lifecycle model.',
    href: '/docs/installation/edge-devices/',
  },
  {
    key: 'baremetal',
    title: 'Kairos on Baremetal',
    description: 'Install directly on physical machines with immutable upgrades and recovery guarantees.',
    href: '/docs/installation/bare-metal/',
  },
];

export const alternativeTracks = [
  {
    title: 'Bring Your Own OS',
    description: 'Kairos Ubuntu, Kairos Fedora, Kairos Alpine, and more with BYOI.',
    href: '/docs/reference/byoi/',
  },
  {
    title: 'Trusted Boot',
    description: 'Secure Boot + Measured Boot + encrypted data paths.',
    href: '/docs/installation/trustedboot/',
  },
  {
    title: 'Kairos without Kubernetes',
    description: 'Use Kairos as a standalone Linux system with core image workflows.',
    href: '/quickstart/',
  },
  {
    title: 'Public Cloud',
    description: 'Deploy reproducible images for cloud VMs and virtualized infrastructure.',
    href: '/docs/installation/cloud-servers/',
  },
  {
    title: 'Edge Devices',
    description: 'Run on devices such as Raspberry Pi and Nvidia Orin with the same lifecycle model.',
    href: '/docs/installation/edge-devices/',
  },
];

export const pressItems: PressItem[] = [
  {
    dateISO: '2026-05-13',
    dateLabel: 'May 13, 2026',
    source: 'CNCF Blog',
    text: 'Building a cloud-native platform from the ground up with Kairos, k0rdent, and Bindy',
    url: 'https://www.cncf.io/blog/2026/05/13/building-a-cloud-native-platform-from-the-ground-up-with-kairos-k0rdent-and-bindy/',
    logo: '/img/logo_cloudnative.png',
    logoAlt: 'CNCF logo',
  },
  {
    dateISO: '2026-01-28',
    dateLabel: 'Jan 28, 2026',
    source: 'Business Wire',
    text: 'Spectro Cloud announces Hadron, a lightweight, security-first Linux base for modern enterprise edge deployments',
    url: 'https://www.businesswire.com/news/home/20260128584925/en/Spectro-Cloud-Announces-Hadron-A-Lightweight-Security-First-Linux-Base-for-Modern-Enterprise-Edge-Deployments',
    logo: '/img/spectrocloud-dark.svg',
    logoAlt: 'Spectro Cloud logo',
    hideFromHomepage: true,
  },
  {
    dateISO: '2026-01-28',
    dateLabel: 'Jan 28, 2026',
    source: 'Spectro Cloud',
    text: 'Spectro Cloud announces Hadron, a lightweight, security-first Linux base for modern enterprise edge deployments',
    url: 'https://www.spectrocloud.com/news/announcing-hadron-a-lightweight-security-first-linux-distribution',
    logo: '/img/spectrocloud-dark.svg',
    logoAlt: 'Spectro Cloud logo',
    hideFromHomepage: true,
  },
  {
    dateISO: '2025-12-29',
    dateLabel: 'Dec 29, 2025',
    source: 'CNCF Blog',
    text: 'How to integrate Kairos architecturally into an edge AI platform',
    url: 'https://www.cncf.io/blog/2025/12/29/how-to-integrate-kairos-architecturally-into-an-edge-ai-platform/',
    logo: '/img/logo_cloudnative.png',
    logoAlt: 'CNCF logo',
  },
  {
    dateISO: '2025-03-25',
    dateLabel: 'Mar 25, 2025',
    source: 'CNCF Blog',
    text: 'Building secure Kubernetes edge images with Kairos and K0s',
    url: 'https://www.cncf.io/blog/2025/03/25/building-secure-kubernetes-edge-images-with-kairos-and-k0s/',
    logo: '/img/logo_cloudnative.png',
    logoAlt: 'CNCF logo',
  },
  {
    dateISO: '2025-03-10',
    dateLabel: 'Mar 10, 2025',
    source: 'Palark Blog',
    text: 'CNCF Sandbox 2024 H1: Kairos in the CNCF Sandbox roundup',
    url: 'https://palark.com/blog/cncf-sandbox-2024-h1/',
    logo: '/img/logo_cloudnative.png',
    logoAlt: 'CNCF logo',
  },
  {
    dateISO: '2024-03-14',
    dateLabel: 'Mar 14, 2024',
    source: 'The New Stack',
    text: 'Check us out in this The New Stack article by our maintainer, Ettore di Giacinto',
    url: 'https://thenewstack.io/honey-i-secured-your-boot-edge-trusted-boot-with-kairos/',
    logo: '/img/theNewStack.png',
    logoAlt: 'The New Stack logo',
  },
  {
    dateISO: '2023-04-18',
    dateLabel: 'Apr 18, 2023',
    source: 'Spectro Cloud',
    text: "See how we're collaborating with Intel and Spectro Cloud on the new Secure Edge-Native Architecture",
    url: 'https://www.spectrocloud.com/news/spectro-cloud-launches-the-secure-edge-native-architecture-sena',
    logo: '/img/spectrocloud-dark.svg',
    logoAlt: 'Spectro Cloud logo',
  },
  {
    dateISO: '2023-03-28',
    dateLabel: 'Mar 28, 2023',
    source: 'The New Stack',
    text: 'Learn how to use the famous OSS project, LocalAI, with Kairos and K3s on your nodes',
    url: 'https://thenewstack.io/looking-for-a-k3os-alternative-choosing-a-container-os-for-edge-k8s/',
    logo: '/img/theNewStack.png',
    logoAlt: 'The New Stack logo',
  },
];

export const events: EventItem[] = [
  {
    dateISO: '2026-06-16',
    dateLabel: 'Jun 16, 2026',
    location: 'Barcelona, ES',
    title: 'Ver, no tocar, y mucho menos desconfigurar: sistemas operativos inmutables',
    conference: 'DevBCN',
    url: 'https://www.devbcn.com/2026/talks/1148879',
  },
  {
    dateISO: '2026-03-26',
    dateLabel: 'Mar 26, 2026',
    location: 'Amsterdam, NL',
    title: 'Project Pavilion - Booth P18A (12:30-14:00)',
    conference: 'KubeCon EU',
    url: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/features-add-ons/project-engagement/#project-pavilion-directory',
  },
  {
    dateISO: '2026-03-26',
    dateLabel: 'Mar 26, 2026',
    location: 'Amsterdam, NL',
    title: 'Cloud Native at the Far(m) Edge: Running Kubernetes and AI on Tractors',
    conference: 'KubeCon EU',
    url: 'https://kccnceu2026.sched.com/event/2CW75/cloud-native-at-the-farm-edge-running-kubernetes-and-ai-on-tractors-mauro-morales-spectro-cloud-jordan-karapanagiotis-aurea-imaging',
  },
  {
    dateISO: '2026-03-24',
    dateLabel: 'Mar 24, 2026',
    location: 'Amsterdam, NL',
    title: 'Project Pavilion - Booth P18A (10:15-14:40)',
    conference: 'KubeCon EU',
    url: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/features-add-ons/project-engagement/#project-pavilion-directory',
  },
  {
    dateISO: '2026-03-23',
    dateLabel: 'Mar 23, 2026',
    location: 'Amsterdam, NL',
    title: "Project Lightning Talk: What's New In Kairos, 2026 Edition",
    conference: 'KubeCon EU',
    url: 'https://kccnceu2026.sched.com/event/2EFx4/project-lightning-talk-whats-new-in-kairos-2026-edition-mauro-morales-maintainer',
  },
  {
    dateISO: '2026-02-04',
    dateLabel: 'Feb 04, 2026',
    location: 'Ghent, BE',
    title: 'From Zero to Immutable Kubernetes',
    conference: 'CfgMgmtCamp',
    url: 'https://cfp.cfgmgmtcamp.org/ghent2026/talk/W9LUC3/',
  },
  {
    dateISO: '2026-02-02',
    dateLabel: 'Feb 02, 2026',
    location: 'Ghent, BE',
    title: 'Cloud Native at the Far(m) Edge: Running Kubernetes and AI on Tractors',
    conference: 'CfgMgmtCamp',
    url: 'https://cfp.cfgmgmtcamp.org/ghent2026/talk/UYXXAQ/',
  },
  {
    dateISO: '2026-01-31',
    dateLabel: 'Jan 31, 2026',
    location: 'Brussels, BE',
    title: 'What Image-Based Systems Taught Us About Linux Distributions',
    conference: 'FOSDEM',
    url: 'https://fosdem.org/2026/schedule/event/YQRYB7-hadron-linux/',
  },
];

export const communityLinks = [
  {
    label: 'Contribute on GitHub',
    href: 'https://github.com/kairos-io/kairos',
  },
  {
    label: 'Follow us on LinkedIn',
    href: 'https://www.linkedin.com/company/kairos-oss/',
  },
  {
    label: 'Join the conversation',
    href: 'https://slack.cncf.io/#kairos',
  },
];

export const communityCopy =
  'Stay up to date with releases, give and get feedback, and contribute by joining our different community channels.';

export const enterpriseIntroCopy =
  'Need a hand? For enterprise support, get in touch with companies ready to help you tackle the toughest challenges.';

export const enterpriseBodyCopy =
  'Spectro Cloud is the main supporter behind Kairos and provides enterprise-grade Kubernetes management through its platform, Palette, which allows organizations to deploy, manage, and scale Kubernetes across various environments, including public clouds, data centers, bare metal, and edge computing.';

export const adopterLogos = [
  {
    src: '/img/deeep-network.png',
    alt: 'DeEEP Network',
    href: 'https://www.deeep.network',
  },
  {
    src: '/img/logo.svg',
    alt: 'Kairos logo',
    href: 'mailto:members@kairos.io',
  },
];

export function getNextEvent(): EventItem | null {
  const now = new Date();
  const sorted = [...events].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return sorted.find((item) => new Date(`${item.dateISO}T00:00:00`) >= now) ?? null;
}
