---
title: Kairos Provision
sidebar_position: 1
---

# Kairos Provision

Install machines at scale without touching each one individually. Provision covers network boot (PXE / iPXE), USB mass-install, P2P discovery, cloud user-data, and edge-device flashing — the delivery layer that turns a built artifact into a running node.

## How it fits

Provision consumes the ISOs and raw images produced by [Builder](/docs/products/builder/) and places them on target hardware, VMs, or cloud instances. Once a node is installed and booted, day-two lifecycle moves to the [Operator](/docs/products/operator/) or to [Fleet](/docs/products/fleet/) for multi-cluster scope.

Under the hood, Provision is powered by the AuroraBoot engine. See the [AuroraBoot reference](/docs/reference/auroraboot) for CLI details.

## Level 1 — Guided

- [Interactive install](/docs/installation/interactive) — Boot the ISO and walk through the installer.
- [Manual install](/docs/installation/manual) — Step-by-step install for one machine at a time.
- [Bare-metal install](/docs/installation/bare-metal) — Get a physical box up from media.

## Level 2 — Automate

- [PXE / netboot](/docs/installation/netboot) — Serve boot artifacts over the network to unattended targets.
- [Zero-touch install](/docs/installation/automated) — Drive a full install with cloud-config, no operator present.
- [P2P provisioning](/docs/installation/p2p) — Discover peers and provision without a central boot server.
- [AWS](/docs/installation/aws) — Provision Kairos nodes on AWS.
- [Azure](/docs/installation/azure) — Provision Kairos nodes on Azure.
- [GCE](/docs/installation/gce) — Provision Kairos nodes on Google Compute Engine.
- [Hetzner](/docs/installation/hetzner) — Provision Kairos nodes on Hetzner.

## Level 3 — Extend

- [Trusted Boot](/docs/installation/trustedboot) — Measured, signed boot chain with UKI images.
- [Takeover](/docs/installation/takeover) — Convert an existing OS in place.
- [Jetson AGX Orin](/docs/installation/nvidia_agx_orin) — Flash Kairos to NVIDIA AGX Orin.
- [Jetson AGX Thor](/docs/installation/nvidia_agx_thor) — Flash Kairos to NVIDIA AGX Thor.
- [Jetson Orin NX](/docs/installation/nvidia_orin_nx) — Flash Kairos to NVIDIA Orin NX.
- [Raspberry Pi](/docs/installation/raspberry) — Write Kairos to SD or eMMC for Raspberry Pi boards.

## Reference

- [AuroraBoot](/docs/reference/auroraboot) — CLI, config, and serving modes for the provisioning engine.
- [Kairos Factory](/docs/reference/kairos-factory) — Image and artifact production pipeline that feeds Provision.

## See also

- [Builder](/docs/products/builder/) — Produce the artifacts that Provision installs.
- [Installer](/docs/products/installer/) — In-node installer flow that Provision drives.
- [Factory & Shipper](/docs/start/factory-shipper) — End-to-end model from build to delivery.
