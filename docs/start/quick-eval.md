---
title: Greenfield evaluator
sidebar_position: 3
---

# Greenfield evaluator

Engineers and teams sizing up immutable Kubernetes before committing a pipeline to it. The goal is confidence: a working node on a local VM, an upgrade round-trip, and a clear line of sight from that first boot to a production build workflow. Local-VM-first is the intended path — no hardware, no lab wiring, just a laptop and a couple of hours.

## Product mapping

Start in [Kairos Lab](/docs/products/lab/) to spin a disposable VM against a stock [Hadron](/hadron-docs/) image, then graduate to the [Kairos Installer](/docs/products/installer/) once the model clicks and real hardware is on the table. The Kairos Fleet GUI is on the roadmap for multi-node evaluation and is not part of this path today.

## Level 1 — Guided

- [Hadron quickstart](/quickstart/) — primary entry point, boots a Hadron image on a local VM.
- [Extend the OS via Dockerfile](/quickstart/extending-the-system-dockerfile) — layer packages or drivers using a Dockerfile the same way container images are built.
- [Lifecycle management](/quickstart/lifecycle-management) — perform a first A/B upgrade and prove the immutable round-trip.
- [Interactive install](/docs/installation/interactive) — walk a real machine through installation from the console.
- [WebUI install](/docs/installation/webui) — drive the same install from the on-node web interface.

## Level 2 — Automate

- [Automated install](/docs/installation/automated) — zero-touch workflow driven by cloud-config.
- [Kairos Factory](/docs/reference/kairos-factory) — first automated image build tied to a repeatable pipeline.
- [Single-node cluster](/docs/examples/single-node) — smallest end-to-end cluster wired up with p2p bootstrap.

## Level 3 — Extend

- [Bring your own image](/docs/reference/byoi) — swap the base OS while keeping the Kairos toolchain.
- [Immutable architecture](/docs/architecture/immutable) — the A/B, read-only rootfs model that everything above depends on.
- [Trusted Boot](/docs/architecture/trustedboot) — measured-boot overview for hardware-anchored deployments.

## Proof

No external proof case — this persona is the direct-onboarding path.

## See also

- [Kairos Lab](/docs/products/lab/)
- [Kairos Installer](/docs/products/installer/)
- [Regulated platform team path](/docs/start/regulated-platform/)
- [Factory shipper path](/docs/start/factory-shipper/)
