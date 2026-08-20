---
authors:
  - mauro-morales
description: Kairos v4.2.0 adds RAM-only boot with persistent OEM/user storage, the first Hadron extension layers, MaaS support, and initial NVIDIA DGX Spark support, alongside a Hadron STIG hardening baseline and progress on confidential computing.
slug: 2026/08/18/kairos-v4-2-0-in-memory-boot-maas-extension-layers
tags:
  - kairos
title: "Kairos v4.2.0: In-Memory Boot, MaaS Support, and Hadron Extension Layers"
---

Kairos v4.2.0 is now available.

This release opens up new places to run Kairos and new ways to extend it: **boot entirely from RAM** while still keeping persistent config and data on disk, deploy through **Canonical MaaS**, and extend Hadron images with the first **extension layers**. It also brings initial **NVIDIA DGX Spark** support, a hardening baseline for Hadron, and steady progress on confidential computing.

{/* truncate */}

## Boot entirely from RAM

Kairos can now boot with its root filesystem copied entirely into RAM, so nothing on the boot disk is touched at runtime — closer to how ESXi boots than to a typical live CD, but with persistent state still available if you want it.

It's enabled with the `kairos.ram` boot parameter. On its own, that's a fully diskless boot. Add-on flags let you keep real `COS_OEM` and `COS_PERSISTENT` partitions on disk, so configuration and user data survive a reboot even though the OS itself runs from memory:

- `kairos.ram.create_partitions[=/dev/sdX]` — provision OEM/persistent partitions on first boot
- `kairos.ram.wipe` — explicit consent to touch a disk that has foreign partitions on it
- `kairos.ram.oem=<MiB>` / `kairos.ram.persistent=<MiB>` — size the partitions

This is aimed at appliances and edge nodes where you want zero disk wear and a boot that's effectively a fresh, known-good state every time, without giving up persistent configuration. It shipped across `kairos-sdk` (in-RAM detection) and `immucore` (the boot workflow itself, plus a clearer failure screen if something goes wrong), and it's documented in the [netboot guide](https://kairos.io/docs/installation/netboot).

## The first Hadron extension layers

Hadron images can now be extended with **extension layers**: official packages and host-bound components — think firmware, kernel modules, things that don't belong as generic OS packages — delivered either as **sysexts** you can add or remove at runtime without rebuilding the image, or as **build-time layers** baked in when the image is built.

The layers themselves live in [hadron-layers](https://github.com/kairos-io/hadron-layers) (currently `drbd`, `fwupd`, `git`, and `gpg`), with a matching `hadron-firmware` repo for firmware. They're published as OCI images and listed on [hadron-linux.io/components](https://hadron-linux.io/components/).

This is the first version of the system, and we're treating it as **experimental**: try it, and tell us what layers you need. Community-contributed layers are the direction we want to take this next.

## MaaS support

Kairos now supports deployment through **Canonical MaaS (Metal as a Service)**, with a dedicated MaaS data source for pulling configuration during provisioning. If you already manage bare metal through MaaS, you can bring Kairos into that same workflow instead of running a separate provisioning path for it. See the [MaaS installation guide](https://kairos.io/docs/installation/maas) for setup.

## NVIDIA DGX Spark support

Kairos adds initial support for **NVIDIA DGX Spark** boards (GB10 Grace-Blackwell), including bundled signing keys, board-specific console options, and package mappings in `kairos-init`.

This lands alongside a broader cleanup of how Kairos builds NVIDIA images: AuroraBoot now emits individual partition images for flashing directly, replacing per-board custom scripts with one standard flow — the same work that already made building for boards like the AGX Orin more uniform. See the [DGX Spark build guide](https://kairos.io/docs/installation/nvidia_dgx_spark) for the steps.

## A hardening baseline for Hadron

Hadron images now ship a real STIG-inspired hardening baseline: an sshd configuration drop-in, around 30 sysctl settings aligned with GPOS guidance, SYN cookies enabled by default, a blocklist for legacy network-protocol kernel modules, and tightened `login.defs` (password aging, UMASK, login logging).

This is a baseline, not full STIG compliance — PAM hardening (password complexity, history, `pam_wheel`) and a few other findings didn't make it into this release, and are left for derivative images and your own cloud-config to add on top.

## Confidential computing: real progress, not there yet on Hadron

Confidential computing support without Hadron is done and documented in this release. Getting it working on Hadron itself is a separate, harder problem: our Hadron-built kernel doesn't currently boot under AMD SEV-SNP, and we haven't been able to pin down why on cloud VMs alone. We're actively trying to get our hands on dedicated SEV-SNP-capable bare metal to debug it properly. If you have access to hardware like this and want to help, reach out — this is exactly the kind of thing that needs a real machine, not another cloud VM.

## Cloud-config changes

Two smaller but useful additions to what you can do in a Kairos cloud-config:

- **Templating for `config_url`** — the URL Kairos fetches its config from at boot can now use templating, useful when the same image needs to resolve a different config per machine.
- **`gid` for users** — you can now specify a group ID alongside a user, not just the username and UID.

## Kairos v3 reaches end of life

With this release, we've also retired the last Kairos v3 documentation still published on the site (`v3.7.2`) — see [kairos-docs#668](https://github.com/kairos-io/kairos-docs/pull/668). We keep the latest patch of the three most recent major.minor lines, and v4.2.0 pushes v3 out of that window. If you're still running a v3.x deployment, now is a good time to plan your upgrade to v4.

## And more

This release also includes a long tail of fixes worth knowing about if you're upgrading: manual-partition sizing now checks against the disk's actual size, control planes are sorted first during node upgrades even without a node selector, AuroraBoot's reported image size is corrected, a user-UID regression is fixed, duplicate extra-partition handling between ISO and user-data sources is resolved, and unformatted extra-partitions no longer fail with an "unsupported filesystem type" error. Reading directly from `/etc/elemental/config.yaml` is now deprecated.

## Looking ahead

Kairos v4.2.0 is about giving you more ways to run Kairos and more ways to shape it: **boot from RAM** when you want a disk-light appliance, reach for **MaaS** or **DGX Spark** when that's where your hardware lives, and use the first **Hadron extension layers** when the base image doesn't have quite what you need. The Hadron hardening baseline and continued confidential-computing work point at the same underlying goal — Kairos as a foundation you can trust on hardware you don't fully control.

You can find the full release notes here: [Kairos v4.2.0 on GitHub](https://github.com/kairos-io/kairos/releases/tag/v4.2.0).

Thanks to everyone who contributed to this release.
