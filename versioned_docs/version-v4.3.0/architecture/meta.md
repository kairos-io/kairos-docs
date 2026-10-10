---
title: "Meta-Distribution"
sidebar_label: "Meta-Distribution"
sidebar_position: 4
date: 2022-11-13
---

We like to define Kairos as a meta-Linux Distribution, as its goal is to convert other distros to an immutable layout with Kubernetes Native components.

## Kairos

Kairos is a software stack is composed of the following:

- A core OS image release for each flavor in ISO, qcow2, and other similar formats (see [the list of supported distributions](/docs/reference/image_matrix)) provided for user convenience
- A standard release with provider-based Kubernetes support (officially maintained provider supports `k3s` and `k0s`, optional).
- An agent installed into the nodes to manage the node lifecycle.

Every component is extensible and modular such as it can be customized and replaced in the stack and built off either locally or with Kubernetes.

### Requirements

In order to convert a Linux Distribution to Kairos, the distribution must meet the following requirements:

- Trusted Boot Images
  - Use a recent enough version of `systemd` (256+) as init system
  - Use `systemd-boot` as bootloader
- Secure Boot Only Images
  - Either use `systemd` or `openrc` init system
  - Use `grub` as bootloader
- All
  - If the system is meant to be used with EFI, the kernel needs to have enabled the `CONFIG_EFI_STUB` option ( see: https://docs.kernel.org/admin-guide/efi-stub.html)

To build Kairos from scratch, see [the documentation](/docs/reference/build-from-scratch) section.

### Internal components

The Kairos artifacts are composed by a base OS (an upstream Linux distribution, like _Ubuntu_, _Alpine_, ...) and a set of components that are installed on top of it. The components are:

Internal (all live in the [`kairos-io/kairos`](https://github.com/kairos-io/kairos) monorepo starting with the v4.3 release):
- [`kairos-init/`](https://github.com/kairos-io/kairos/tree/master/kairos-init) builds Kairos OS images on top of a stock upstream distribution and pins the components below at build time.
- [`immucore/`](https://github.com/kairos-io/kairos/tree/master/immucore) is the immutability management interface.
- [`agent/`](https://github.com/kairos-io/kairos/tree/master/agent) manages the installation, reset, and upgrade of the Kairos nodes.
- [system packages](https://github.com/kairos-io/packages) contains additional packages, cross-distro.
- [`kcrypt/discovery/`](https://github.com/kairos-io/kairos/tree/master/kcrypt/discovery) is the component responsible for encryption and decryption of data at rest.
- [`kcrypt/challenger/`](https://github.com/kairos-io/kairos/tree/master/kcrypt/challenger) is the KMS side that pairs with the TPM chip to unlock LUKS partitions.
- [`installer/`](https://github.com/kairos-io/kairos/tree/master/installer) is the interactive terminal-UI installer that `kairos-agent interactive-install` execs into on livecd boot.

The runtime `kairos-agent`, `immucore` and `kcrypt-discovery-challenger` binaries are all served by one multi-call `kairos` executable that dispatches on `argv[0]`; the historical binary names are symlinks to it. The `kairos-installer` binary is separate (it runs as its own process, invoked by `kairos-agent interactive-install`, and lives at `/system/installer/kairos-installer` inside the image). See the [monorepo README](https://github.com/kairos-io/kairos#repository-layout) for the full layout.

Optional/External:
- [K3s](https://k3s.io) as a Kubernetes distribution
- [edgevpn](https://mudler.github.io/edgevpn) (optional) as fabric for the distributed network, node coordination and bootstrap. Provides also embedded DNS capabilities for the cluster. Internally uses [libp2p](https://github.com/libp2p/go-libp2p) for the P2P mesh capabilities.
- [nohang](https://github.com/hakavlad/nohang) A sophisticated low memory handler for Linux.
- [entangle](https://github.com/kairos-io/entangle) a CRD to interconnect Kubernetes clusters
- [entangle-proxy](https://github.com/kairos-io/entangle-proxy) a CRD to control interconnected clusters
- [osbuilder](https://github.com/kairos-io/osbuilder) is used to build bootable artifacts from container images
- [AuroraBoot](https://github.com/kairos-io/AuroraBoot) is the Kairos Node bootstrapper

For an architecture-focused overview of providers and how they integrate with kairos-agent, see [Providers](/docs/architecture/providers).
