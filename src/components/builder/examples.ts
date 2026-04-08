import type {ExampleTemplate} from './types';

export const CONFIG_EXAMPLES: ExampleTemplate[] = [
  {
    id: 'blank',
    label: 'Blank config',
    docsPath: '/docs/examples/core/',
    config: `#cloud-config
`,
  },
  {
    id: 'without-kubernetes',
    label: 'Without Kubernetes',
    docsPath: '/docs/examples/without-kubernetes/',
    config: `#cloud-config
install:
  device: "auto"
  auto: true
  reboot: true

users:
  - name: kairos
    passwd: kairos
`,
  },
  {
    id: 'k3s',
    label: 'Kubernetes (k3s)',
    docsPath: '/docs/examples/choosing-kubernetes-distribution/#k3s',
    config: `#cloud-config
install:
  device: "auto"
  auto: true
  reboot: true

k3s:
  enabled: true
`,
  },
  {
    id: 'k0s',
    label: 'Kubernetes (k0s)',
    docsPath: '/docs/examples/choosing-kubernetes-distribution/#k0s',
    config: `#cloud-config
install:
  device: "auto"
  auto: true
  reboot: true

k0s:
  enabled: true
`,
  },
  {
    id: 'fips',
    label: 'FIPS oriented',
    docsPath: '/docs/examples/fips/',
    config: `#cloud-config
install:
  device: "auto"
  auto: true
  reboot: true

stages:
  initramfs:
    - name: "Enable stricter crypto profile"
      commands:
        - "echo 'FIPS profile expected from image build time'"
`,
  },
];

export function getExampleById(id: string): ExampleTemplate {
  return CONFIG_EXAMPLES.find((item) => item.id === id) ?? CONFIG_EXAMPLES[0];
}
