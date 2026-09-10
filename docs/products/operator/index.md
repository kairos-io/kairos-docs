---
title: Kairos Operator
sidebar_position: 1
---

# Kairos Operator

The Kairos Operator handles Kubernetes-native day-2 operations for Kairos nodes. It drives upgrades, runs arbitrary node operations, produces OS artifacts, and labels nodes — all reconciled from CRDs on the cluster the nodes already belong to.

## How it fits

The Operator consumes the images produced upstream by the [Factory](/docs/products/factory/) and the [Builder](/docs/products/builder/), then orchestrates them across a running cluster: rolling upgrades, one-off node jobs, and in-cluster OS artifact builds. It runs inside the target cluster, so nodes reconcile themselves against desired-state CRDs rather than being pushed from an external control plane. Until the fleet-scope surface described in [Fleet](/docs/products/fleet/) ships, the Operator is the Kubernetes-native answer for managing a fleet of Kairos machines.

## Level 1 — Guided

- [Operator overview](/operator-docs/) — what the Operator does and which CRDs it ships.
- [Install the Operator](/operator-docs/installation) — deploy it into an existing Kairos cluster.

## Level 2 — Automate

- [NodeOp CRD](/operator-docs/nodeop) — run arbitrary operations against selected nodes.
- [NodeOpUpgrade CRD](/operator-docs/nodeop-upgrade) — declarative rolling upgrades driven by an image reference.
- [OSArtifact CRD](/operator-docs/osartifact) — produce OS artifacts (ISO, raw, cloud images) from inside the cluster.
- [Private registries](/operator-docs/private-registries) — wire up pull credentials for upgrade and artifact images.

## Level 3 — Extend

- [Full upgrade flow](/docs/upgrade/kairos-operator) — end-to-end walkthrough of an Operator-driven upgrade.
- [Kubernetes upgrade path](/docs/upgrade/kubernetes) — coordinating Kubernetes version bumps alongside the OS.
- [system-upgrade-controller](/docs/upgrade/system-upgrade-controller) — deprecated legacy path, kept for migration off SUC.

## Reference

- [Operator documentation](/operator-docs/) — canonical CRD reference and behavior notes.

## See also

- [Fleet](/docs/products/fleet/) — the future fleet-scope surface this Operator anticipates.
- [Factory](/docs/products/factory/) — upstream source of the images the Operator rolls out.
- [Regulated platform quickstart](/docs/start/regulated-platform) — the persona most likely to run the Operator in production.
