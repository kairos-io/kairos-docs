---
authors:
  - mauro-morales
description: Kairos v4.1.0 tightens the path from image build to managed nodes via kairos-agent phone-home and AuroraBoot v0.20.0’s web UI and fleet server mode, with supporting updates across Hadron, Ubuntu 26.04, boot, install, distros, and release automation.
slug: 2026/05/15/kairos-v4-1-0-hadron-ubuntu-boot-install-foundations
tags:
  - kairos
title: "Kairos v4.1.0: From Image Build to Managed Nodes with AuroraBoot"
---

Kairos v4.1.0 is now available.

This release improves the path from building a Kairos image to deploying and managing real nodes. **`kairos-agent` now includes phone-home support**, which works together with **[AuroraBoot](https://github.com/kairos-io/AuroraBoot) v0.20.0** and its web UI when you run it in fleet server mode. Nodes produced through that flow can come online, report back after first boot using phone-home, and show up in AuroraBoot’s node manager.

Behind that story, v4.1.0 also ships **Hadron v0.2.0** for Hadron-based Kairos images, **Ubuntu 26.04** support in `kairos-init`, boot and install/disk hardening, broader distro compatibility, and release automation improvements. These layers all support the same operational direction: a dependable lifecycle around immutable images.

{/* truncate */}

## From image creation to managed nodes

Kairos v4.1.0 adds phone-home support in `kairos-agent`. On its own, that gives nodes a way to signal back after installation or first boot. **AuroraBoot v0.20.0**, which is a separate project that works alongside Kairos, adds an end-to-end node build and deployment flow through its **web UI**.

AuroraBoot can run as a **self-hosted fleet server**: a single deployment that brings together a **dashboard**, **REST API**, **node manager**, **SecureBoot key store**, and **netboot** server. The web UI walks you through building an artifact, deploying it, and managing nodes after they appear.

Nodes built through AuroraBoot can **phone home automatically on first boot** (via `kairos-agent`) and land in the **Nodes** list in AuroraBoot. From there, you can drive actions such as upgrade, reboot, reset, applying cloud-config, or running allowed commands.

That combination matters because image-based systems are not only about producing a bootable image. They also need a **reliable operational path** from image creation through installation, first boot, registration, and ongoing lifecycle management. `kairos-agent` and AuroraBoot address that gap as complementary pieces: Kairos on the node, AuroraBoot in the control plane you choose to run.

## Hadron-based images now use Hadron v0.2.0

Hadron-based Kairos images move to **Hadron v0.2.0**, updating the minimal Linux foundation those images are built on. This is an important supporting change for anyone using the official Hadron-based artifacts, but it sits alongside the broader provisioning and lifecycle work above.

Hadron remains the upstream-first base we use for a smaller, more controlled foundation while lifecycle, provisioning, and Kubernetes integration stay in the Kairos layer.

Hadron v0.2.0 includes updates such as:

- Linux kernel updated to `7.0.6`
- DirtyFrag mitigation by blocklisting the affected `nf_defrag_ipv4` and `nf_defrag_ipv6` kernel modules by default
- Thor GPU image example and documentation
- Additional ARM64 Nvidia kernel configuration
- GRUB SMBIOS support
- Parameterized Dockerfile base image and tag support
- RISC-V images included in Hadron’s multi-architecture manifests

**RISC-V caveat:** Hadron v0.2.0 publishes RISC-V in its multi-architecture manifests as groundwork for the ecosystem. **Kairos does not publish RISC-V artifacts yet**, so this is not a user-testable Kairos target today—only preparation for future work.

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

Kairos v4.1.0 puts a **clearer path from building images to deploying and managing nodes** at the center of the story. **`kairos-agent` phone-home support** and **AuroraBoot v0.20.0’s web UI and fleet server mode** are the most visible parts of that arc.

**Hadron v0.2.0**, **Ubuntu 26.04** support in `kairos-init`, boot improvements, disk and install fixes, distro compatibility, and release automation all push in the same direction: an image-based OS is **not only an image**. It is the **lifecycle** around that image—**build**, **install**, **boot**, **register**, **upgrade**, **recover**, and **operate**—and v4.1.0 advances each of those layers.

You can find the full release notes here: [Kairos v4.1.0 on GitHub](https://github.com/kairos-io/kairos/releases/tag/v4.1.0).

Thanks to everyone who contributed to this release.
