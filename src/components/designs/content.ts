export type PressItem = {
  title: string;
  logo: string;
  logoAlt: string;
  href: string;
};

export type EventItem = {
  dateISO: string;
  dateLabel: string;
  location: string;
  title: string;
  conference: string;
  url: string;
};

export const heroHeadline = 'The Immutable Linux Framework to Operate at Scale.';

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
    title: 'Development images',
    description: 'Use development pipelines to build and iterate quickly.',
    href: '/docs/development/',
  },
];

export const pressItems: PressItem[] = [
  {
    title: 'How to integrate Kairos architecturally into an edge AI platform',
    logo: '/img/logo_cloudnative.png',
    logoAlt: 'CNCF logo',
    href: 'https://www.cncf.io/blog/2025/12/29/how-to-integrate-kairos-architecturally-into-an-edge-ai-platform/',
  },
  {
    title: 'Building secure Kubernetes edge images with Kairos and K0s',
    logo: '/img/logo_cloudnative.png',
    logoAlt: 'CNCF logo',
    href: 'https://www.cncf.io/blog/2025/03/25/building-secure-kubernetes-edge-images-with-kairos-and-k0s/',
  },
  {
    title:
      'Spectro Cloud announces Hadron, a lightweight, security-first Linux base for modern enterprise edge deployments',
    logo: '/img/spectro-intel.png',
    logoAlt: 'Spectro Cloud and Intel logo',
    href: 'https://www.businesswire.com/news/home/20260128584925/en/Spectro-Cloud-Announces-Hadron-A-Lightweight-Security-First-Linux-Base-for-Modern-Enterprise-Edge-Deployments',
  },
];

export const events: EventItem[] = [
  {
    dateISO: '2026-03-23',
    dateLabel: 'Mar 23, 2026',
    location: 'Amsterdam, NL',
    title: "Project Lightning Talk: What's New In Kairos, 2026 Edition",
    conference: 'KubeCon EU',
    url: 'https://kccnceu2026.sched.com/event/2EFx4/project-lightning-talk-whats-new-in-kairos-2026-edition-mauro-morales-maintainer',
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
    dateISO: '2026-02-04',
    dateLabel: 'Feb 04, 2026',
    location: 'Ghent, BE',
    title: 'From Zero to Immutable Kubernetes',
    conference: 'CfgMgmtCamp',
    url: 'https://cfp.cfgmgmtcamp.org/ghent2026/talk/W9LUC3/',
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
  "Whether you're a part of a DevOps team, an IT engineer, a hobbyist, or a maker, we welcome you to join us in driving forward our vision of a secure, decentralized, and containerized edge.";

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
