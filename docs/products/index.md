---
title: Kairos products
sidebar_position: 1
---

Kairos ships as a suite of job-oriented products that share the same immutable OS foundation. Each product owns one step of the lifecycle — build, boot, install, operate — and composes with the others without lock-in.

| Product | The job | When to use it | Guide |
| --- | --- | --- | --- |
| Kairos Factory | Build and extend OCI images with kairos-init | You need a custom Kairos image with extra packages, drivers, or a specific K8s distribution | [Factory](/docs/products/factory/) |
| Kairos Builder | Produce boot artifacts (ISO / UKI / cloud / raw) | You have an OCI image and need bootable media for a target platform | [Builder](/docs/products/builder/) |
| Kairos Provision | Install machines at scale (netboot / USB / PXE / P2P) | You need to bring up nodes across a lab, a rack, or a fleet of edge sites | [Provision](/docs/products/provision/) |
| Kairos Fleet | Track and operate nodes across sites | You want a single pane over many clusters (roadmap; today use the Operator) | [Fleet](/docs/products/fleet/) |
| Kairos Operator | Kubernetes-native day-2 via CRDs | You manage upgrades, config, and drift from inside the cluster | [Operator](/docs/products/operator/) |
| Kairos Installer | Configure and install from live media | An operator is in front of the node and wants a guided install (WebUI on :8080) | [Installer](/docs/products/installer/) |
| Kairos Lab | Local VMs for demos and PoCs | You want to try Kairos on a laptop before touching real hardware | [Lab](/docs/products/lab/) |

:::info
AuroraBoot is the engine behind Builder, Provision, and Fleet. See the [AuroraBoot reference](/docs/reference/auroraboot) for CLI details.
:::

## How the products compose

Factory produces OCI images from a base and a kairos-init recipe; Builder turns those images into boot artifacts (ISO, UKI, cloud images, raw disks); Provision delivers those artifacts to machines over netboot, USB, PXE, or peer-to-peer; Fleet and the Operator take over once nodes are up, handling day-2 across clusters and inside each cluster respectively; Installer and Lab are onboarding surfaces — one for real hardware in front of an operator, one for local VMs on a laptop.

## See also

- [Get started](/docs/start/) — pick a path and boot your first node
- [Documentation home](/docs/) — full docs index
- [Reference](/docs/reference/) — CLI, APIs, and configuration
