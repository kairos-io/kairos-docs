---
title: Regulated platform team
sidebar_position: 2
---

# Regulated platform team

## Who this is for

Platform teams running a large hybrid Kubernetes estate under compliance obligations: audit trails, no drift, and an approved enterprise Linux base that cannot be swapped out. OS images are treated like application containers — built in CI, signed, digest-pinned, and rolled out declaratively. Nodes are immutable in production; package managers are not part of the operating model.

## Product mapping

[Factory](/docs/products/factory/) produces the hardened OS image from the approved base with security hardening and enterprise auth baked in. [Builder](/docs/products/builder/) turns that image into the VM and cloud artifacts the estate consumes. [Operator](/docs/products/operator/) drives the rollout across clusters from Git, pinned by digest. Adjacent tools such as k0rdent and bindy sit around this stack for cluster and fleet concerns; they are not Kairos products.

## Level 1 — Guided

- [FIPS-mode build](/docs/examples/fips) — produce a FIPS-enabled image end to end.
- [Boot Kairos on AWS](/docs/installation/aws) — bring up a node on AWS to validate the image.
- [Boot Kairos on Azure](/docs/installation/azure) — same, on Azure.

## Level 2 — Automate

- [Kairos Factory](/docs/reference/kairos-factory) — full Factory pipeline against an approved base.
- [BYOI](/docs/reference/byoi) — own the release cadence by bringing your own image.
- [Private registry auth](/docs/advanced/private_registry_auth) — pull upgrade images from an internal registry.
- [Operator-driven upgrades](/docs/upgrade/kairos-operator) — GitOps rollouts through the Operator.
- [NodeOpUpgrade CRD](/operator-docs/nodeop-upgrade) — declarative, digest-pinned node upgrades.
- [OSArtifact CRD](/operator-docs/osartifact) — declare and track OS artifacts as first-class objects.

## Level 3 — Extend

- [Partition encryption](/docs/advanced/partition_encryption) — TPM-bound LUKS for at-rest audit.
- [Revoking Secure Boot access](/docs/advanced/revoking-secureboot-access) — rotate Secure Boot certificates.
- [Immutability model](/docs/architecture/immutable) — the guarantees the rest of the stack relies on.

## Proof

This persona is based on a production platform built on Kairos with k0rdent and bindy: [Building a cloud native platform from the ground up with Kairos, k0rdent and bindy](https://www.cncf.io/blog/2026/05/13/building-a-cloud-native-platform-from-the-ground-up-with-kairos-k0rdent-and-bindy/).

## See also

- [Factory](/docs/products/factory/) — the image build product this persona centres on.
- [Operator](/docs/products/operator/) — the rollout product this persona centres on.
- [Factory / OEM shipper](/docs/start/factory-shipper) — sibling persona for hardware-first shops.
- [Edge AI fleet operator](/docs/start/edge-ai-fleet) — sibling persona focused on remote fleet lifecycle.
