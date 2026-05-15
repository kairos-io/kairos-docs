---
authors:
  - mauro-morales
description: Kairos v4.1.0 updates Hadron to v0.2.0, adds Ubuntu 26.04 in kairos-init, and improves boot flows, install reliability, and release automation.
slug: 2026/05/15/kairos-v4-1-0-hadron-ubuntu-boot-install-foundations
tags:
  - kairos
title: "Kairos v4.1.0: Hadron v0.2.0, Ubuntu 26.04, and stronger boot/install foundations"
---

Kairos v4.1.0 is now available.

This release continues work across the lower layers that matter for running an image-based operating system in Kubernetes environments: base image updates, broader OS support, boot improvements, install reliability, and release automation.

A key part of this release is the update of the Hadron-based Kairos images to **Hadron v0.2.0**, bringing in a newer kernel, security mitigation work, GPU-related enablement, and continued multi-architecture groundwork. Kairos v4.1.0 also adds Ubuntu 26.04 support in `kairos-init`, improves several install and disk workflows, and includes updates across core components such as `kairos-agent`, `immucore`, `provider-kairos`, `yip`, and `edgevpn`.

{/* truncate */}

## Hadron-based images now use Hadron v0.2.0

Kairos v4.1.0 updates the Hadron-based images to **Hadron v0.2.0**.

Hadron is the minimal Linux foundation we are building for image-based Kubernetes systems. In Kairos, it gives us a smaller and more controlled base while still keeping the lifecycle, provisioning, and Kubernetes integration in the Kairos layer.

Hadron v0.2.0 brings several notable updates:

- Linux kernel updated to `7.0.6`
- DirtyFrag mitigation by blocklisting the affected `nf_defrag_ipv4` and `nf_defrag_ipv6` kernel modules by default
- Thor GPU image example and documentation
- Additional ARM64 Nvidia kernel configuration
- GRUB SMBIOS support
- Parameterized Dockerfile base image and tag support
- RISC-V images included in Hadron’s multi-architecture manifests

The RISC-V work is worth calling out carefully. Hadron v0.2.0 now includes RISC-V images in its multi-architecture manifests, which is an important foundation for future Kairos work. Kairos RISC-V artifacts are not published yet, so this should be understood as groundwork rather than a user-testable Kairos target today.

## Ubuntu 26.04 support

For users building Kairos from existing distribution bases, v4.1.0 adds support for **Ubuntu 26.04** in `kairos-init`.

This continues one of the core Kairos ideas: users should be able to bring their own base image while still getting an image-based, Kubernetes-native lifecycle model on top.

Kairos is not tied to a single Linux distribution. Instead, it provides the tooling and lifecycle model around different bases, whether that is Ubuntu, Fedora, Alpine, openSUSE, Debian, Rocky, or Hadron.

## Better boot flows

Kairos v4.1.0 includes several boot-related improvements.

`immucore` now includes TPM kernel module support during UKI boot, and `kairos-agent` improves `systemd-boot` support with assessment suffix handling.

These are lower-level changes, but they matter for the direction of the project. Image-based systems are not only about producing a bootable artifact. They also need reliable boot flows, recovery paths, and support for more trusted and measured boot scenarios.

## More robust install and disk handling

This release also includes a set of practical improvements around installation and disk handling.

Notable changes include:

- support for resolving `script://` disk paths through the `yip` helper
- JSON schema updates for the new `script://` disk schema
- flexible disk improvements in `yip`
- a fix for bytes-vs-sectors mismatch in partition expansion
- support for handling more than only NVMe devices
- loopback detach fixes during install flows

These are the kinds of changes that are easy to miss in a changelog but important in real deployments. Installation reliability depends on a long tail of hardware, disk layouts, bootloaders, and provisioning paths. v4.1.0 improves several of those edges.

## Broader distro compatibility

Kairos v4.1.0 also improves compatibility across different Linux bases.

This includes:

- adjusted network module detection for RHEL 9.0
- Oracle Linux detection as part of the RHEL-family matching logic
- a more resilient RHEL install flow that tries the `epel-release` package first and falls back to a URL
- machine-id generation fixes for OpenRC systems in recovery mode

This is part of the ongoing work to keep Kairos usable across different base distributions and operating environments.

## New phone-home capability in kairos-agent

`kairos-agent` v2.29.1 includes a new phone-home feature.

This opens the door to better first-boot and provisioning workflows, where a node can signal back after installation or initialization. For image-based systems, this kind of capability is useful because installation, boot, and registration often need to be coordinated across infrastructure and management layers.

## Release and automation improvements

Kairos v4.1.0 also improves the release process itself.

The release includes:

- automated release notes diff changes
- idempotent GCP upload script behavior
- better import task timeout handling and error output
- non-blocking release behavior for k0s/k3s
- GitHub Actions updates
- least-privilege GitHub Actions workflow hardening

This kind of work is not always visible to end users, but it improves the reliability and maintainability of the project.

## Looking ahead

Kairos v4.1.0 is not a release built around one large user-facing feature. It is a foundation release.

It updates the Hadron-based images, adds Ubuntu 26.04 support, improves boot and install behavior, expands distro compatibility, and continues hardening the release machinery behind the project.

That matters because an image-based operating system is not only an image. It is the full lifecycle around that image: how it is built, installed, booted, upgraded, recovered, and operated.

Kairos v4.1.0 continues that work.

You can find the full release notes here: [Kairos v4.1.0 on GitHub](https://github.com/kairos-io/kairos/releases/tag/v4.1.0).

Thanks to everyone who contributed to this release.
