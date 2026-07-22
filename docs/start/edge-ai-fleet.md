---
title: Edge AI fleet operator
sidebar_position: 1
---

# Edge AI fleet operator

Remote sensing and inference devices — Jetson-class boards and similar accelerated hardware — deployed in the field on a decade-long product life. Connectivity is flaky, technicians cannot be dispatched, and the vendor stack (Ubuntu base, GPU drivers, CUDA, JetPack) must be frozen and then upgraded in place. This persona keeps a familiar Dockerfile-authored base, ships it as an immutable image with A/B fallback, and drives upgrades from a private registry.

## Product mapping

The factory workflow bakes the vendor stack into an OCI image with [Kairos Factory](/docs/products/factory/) using a Dockerfile plus `kairos-init`. [Kairos Builder](/docs/products/builder/) turns that image into board-specific boot artifacts. [Kairos Provision](/docs/products/provision/) mass-flashes those artifacts at manufacturing time or first boot. [Kairos Operator](/docs/products/operator/) then drives remote upgrades from a private registry against the running fleet. [Kairos Lab](/docs/products/lab/) covers early exploration before committing to a factory pipeline.

## Level 1 — Guided

- [Jetson AGX Orin](/docs/installation/nvidia_agx_orin) — Flash and boot Kairos on Jetson AGX Orin.
- [Jetson AGX Thor](/docs/installation/nvidia_agx_thor) — Flash and boot on Jetson AGX Thor.
- [Jetson Orin NX](/docs/installation/nvidia_orin_nx) — Flash and boot on Jetson Orin NX.

## Level 2 — Automate

- [Kairos Factory reference](/docs/reference/kairos-factory) — Bake the vendor stack into an OCI image with `kairos-init`.
- [Kairos Operator upgrades](/docs/upgrade/kairos-operator) — Registry-driven remote upgrades via the Kairos Operator.
- [NodeOpUpgrade CRD](/operator-docs/nodeop-upgrade) — Reference for the CRD that models an upgrade run.

## Level 3 — Extend

- [Kairos on Jetson ARM](/docs/development/nvidia) — Engineering notes on booting Kairos on Nvidia Jetson ARM.
- [Custom cloud images](/docs/advanced/creating_custom_cloud_images) — Customise cloud images for hardware fleets.

## Proof

This persona is based on real edge AI deployments described in the CNCF write-up [How to integrate Kairos architecturally into an edge AI platform](https://www.cncf.io/blog/2025/12/29/how-to-integrate-kairos-architecturally-into-an-edge-ai-platform/).

## See also

- [Kairos Factory](/docs/products/factory/)
- [Kairos Operator](/docs/products/operator/)
