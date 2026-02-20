---
title: "Meta-Distribution"
sidebar_label: "Meta-Distribution"
sidebar_position: 4
date: 2022-11-13
---

We like to define Kairos as a meta-Linux Distribution, as its goal is to convert other distros to an immutable layout with Kubernetes Native components.

## Kairos

Kairos is a software stack is composed of the following:

- A core OS image release for each flavor in ISO, qcow2, and other similar formats (see [the list of supported distributions](/docs/v3.5.7/reference/image_matrix/)) provided for user convenience
- A release with K3s embedded (optional).
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

To build Kairos from scratch, see [the documentation](/docs/v3.5.7/reference/build-from-scratch/) section.

### Internal components

The Kairos artifacts are composed by a base OS (an upstream Linux distribution, like _Ubuntu_, _Alpine_, ...) and a set of components that are installed on top of it. The components are:

Internal:
- [kairos](https://github.com/kairos-io/kairos) is the main repository, building the `kairos-agent` and containing the image definitions which runs on our CI pipelines.
- [immucore](https://github.com/kairos-io/immucore) is the immutability management interface.
- [kairos-agent](https://github.com/kairos-io/kairos-agent) manages the installation, reset, and upgrade of the Kairos nodes.
- [system packages](https://github.com/kairos-io/packages) contains additional packages, cross-distro
- [kcrypt](https://github.com/kairos-io/kcrypt) is the component responsible for encryption and decryption of data at rest
- [kcrypt-challenger](https://github.com/kairos-io/kcrypt-challenger) is the `kairos` plugin that works with the TPM chip to unlock LUKS partitions

Optional/External:
- [K3s](https://k3s.io) as a Kubernetes distribution
- [edgevpn](https://mudler.github.io/edgevpn) (optional) as fabric for the distributed network, node coordination and bootstrap. Provides also embedded DNS capabilities for the cluster. Internally uses [libp2p](https://github.com/libp2p/go-libp2p) for the P2P mesh capabilities.
- [nohang](https://github.com/hakavlad/nohang) A sophisticated low memory handler for Linux.
- [entangle](https://github.com/kairos-io/entangle) a CRD to interconnect Kubernetes clusters
- [entangle-proxy](https://github.com/kairos-io/entangle-proxy) a CRD to control interconnected clusters
- [osbuilder](https://github.com/kairos-io/osbuilder) is used to build bootable artifacts from container images
- [AuroraBoot](https://github.com/kairos-io/AuroraBoot) is the Kairos Node bootstrapper

