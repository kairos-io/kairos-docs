---
title: Kairos Installer
sidebar_position: 1
---

# Kairos Installer

The Kairos Installer configures and installs Kairos from live media. It exposes an on-node WebUI on port 8080 and an interactive console for operators sitting at the terminal.

The Kairos Installer is the on-node install experience served on port 8080 when live media boots. This is distinct from the fleet-scope Kairos Fleet UI (see [/docs/products/fleet/](/docs/products/fleet/)).

## How it fits

The Installer consumes artifacts produced by the [Kairos Builder](/docs/products/builder/) — ISOs, raw disks, and netboot bundles. Once install completes, the running node becomes a target for the [Kairos Operator](/docs/products/operator/) or [Kairos Fleet](/docs/products/fleet/) for lifecycle and upgrade management.

## Level 1 — Guided

- [WebUI install](/docs/installation/webui) — point a browser at port 8080 and drive the install from the node's own UI.
- [QR-code assisted install](/docs/installation/qrcode) — scan the QR code from the boot screen to reach the WebUI without typing an IP.
- [Interactive console install](/docs/installation/interactive) — TTY-driven install for headless or air-gapped hardware.

## Level 2 — Automate

- [Automated install](/docs/installation/automated) — zero-touch install driven by cloud-config.
- [Manual install](/docs/installation/manual) — step-by-step install from a shell for custom flows and debugging.

## Level 3 — Extend

- [Takeover install](/docs/installation/takeover) — reinstall Kairos over a live, running OS with no bootable media.
- [Trusted Boot install](/docs/installation/trustedboot) — install into a measured-boot chain backed by TPM sealing.

## Reference

- [Configuration reference](/docs/reference/configuration) — cloud-config keys consumed at install time.
- [Reset](/docs/reference/reset) — factory-reset behavior and recovery entry points.

## See also

- [Kairos Builder](/docs/products/builder/) — produces the artifacts the Installer boots from.
- [Kairos Provision](/docs/products/provision/) — network-boot the Installer at scale.
- [Kairos Lab](/docs/products/lab/) — spin up an Installer target in a VM for evaluation.
- [Quick eval](/docs/start/quick-eval) — fastest path to a running node.
