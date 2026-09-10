---
title: Kairos Fleet
sidebar_position: 1
---

# Kairos Fleet

Kairos Fleet tracks, registers, and operates a running fleet of Kairos nodes. It is the fleet-scope surface for a dashboard, API, node manager, and Secure Boot key store that coordinate day-2 work across every node built by the rest of the pipeline.

Kairos Fleet is the name for the planned fleet-scope surface built on the AuroraBoot engine. The dashboard, node manager, and API are on the roadmap and under active development — nothing ships under this name yet. Today the closest available Kubernetes-native day-2 surface is the [Kairos Operator](/docs/products/operator/). This page will grow as the Fleet surfaces ship.

## How it fits

Fleet consumes nodes provisioned via [Kairos Provision](/docs/products/provision/) and coordinates day-2 operations through the [Kairos Operator](/docs/products/operator/). It reads image and artifact outputs produced by [Kairos Builder](/docs/products/builder/) to drive upgrades, reconciliation, and key material distribution across the running estate.

Under the hood, Fleet is powered by the AuroraBoot engine. See the [AuroraBoot reference](/docs/reference/auroraboot) for CLI details.

## Level 1 — Guided

- [Kairos Operator](/docs/products/operator/) — Use the Operator today for Kubernetes-native day-2 on Kairos nodes.
- [NodeOpUpgrade CRD](/operator-docs/nodeop-upgrade) — Declarative upgrades for a set of nodes.

## Level 2 — Automate

- [NodeOp CRD](/operator-docs/nodeop) — Run arbitrary maintenance jobs across selected nodes.
- [OSArtifact CRD](/operator-docs/osartifact) — Feed Fleet with Builder-produced OS artifacts.
- [Private registries](/operator-docs/private-registries) — Registry authentication for Operator-driven flows.

## Level 3 — Extend

- [Operator-driven upgrades](/docs/upgrade/kairos-operator) — Upgrade flows paired with Fleet build outputs.
- [AuroraBoot reference](/docs/reference/auroraboot) — Fleet is the AuroraBoot fleet-scope surface.

## Reference

- [Operator documentation](/operator-docs/)
- [AuroraBoot reference](/docs/reference/auroraboot)

## See also

- [Kairos Operator](/docs/products/operator/)
- [Kairos Provision](/docs/products/provision/)
- [Edge AI fleet quickstart](/docs/start/edge-ai-fleet)
