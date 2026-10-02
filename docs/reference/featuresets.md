---
title: "Feature sets"
sidebar_label: "Feature sets"
sidebar_position: 4
slug: /reference/featuresets
description: One table per base distribution showing which Kairos feature sets it supports, with links to the details.
---

This page answers "what does this base give me" at a glance: pick a base distribution and read across. Every column links to the page with the details. For image naming and how the tested matrix is built, see the [Image support matrix](./image_matrix.md).

The rows are the bases Kairos builds and tests in CI on master. Kubernetes (k3s and k0s, through `provider-kairos`) does not depend on the base, see [Choosing a Kubernetes distribution](../examples/choosing-kubernetes-distribution.md).

:::note Release status
CIS L1 hardening and SELinux are on kairos master and ship with the next kairos release after v4.3.0. Images built with v4.3.0 have neither.
:::

## By base distribution

| Base | [amd64](./image_matrix.md) | [arm64](./image_matrix.md) | [Trusted Boot (UKI)](../installation/trustedboot.mdx) | [SELinux](#selinux) | [CIS L1](../security/cis.md) | [FIPS](../examples/fips.md) | [NVIDIA GPU](#nvidia-gpu) | [System extensions](../advanced/sys-extensions.md) |
|---|---|---|---|---|---|---|---|---|
| Hadron | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ Driver modules through an example build | ✅ |
| Ubuntu 20.04 | ✅ | ✅ | 🧪 | ❌ | ✅ | ⚠️ Needs Ubuntu Pro | ❓ | ❌ |
| Ubuntu 22.04 | ✅ | ✅ | 🧪 | ❌ | ✅ | ⚠️ Needs Ubuntu Pro | ❓ | ❌ |
| Ubuntu 24.04 | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ Needs Ubuntu Pro | ❓ | ✅ |
| Ubuntu 25.10 | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ Needs Ubuntu Pro | ❓ | ✅ |
| Ubuntu 26.04 | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ Needs Ubuntu Pro | ❓ | ✅ |
| Debian 12 | ✅ | ✅ | 🧪 | ❌ | ✅ | 🧪 | ❓ | ❌ |
| Debian 13 | ✅ | ✅ | 🧪 | ❌ | ✅ | 🧪 | ❓ | ✅ |
| Fedora 41 | ✅ | 🧪 | ✅ | ✅ | ✅ | ✅ | ❓ | ✅ |
| Fedora 42, 43 | ✅ | ✅ | 🧪 | ✅ | ✅ | 🧪 | ❓ | ✅ |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 9 | ✅ | ✅ | 🧪 | ✅ | ✅ | 🧪 | ❓ | ❌ |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 10 | ✅ | ✅ | 🧪 | ✅ | ✅ | 🧪 | ❓ | ✅ |
| openSUSE Leap 16.0 | ✅ | ✅ | 🧪 | ✅ | ✅ | 🧪 | ❓ | ✅ |
| Alpine 3.21, 3.23 | ✅ | ✅ | 🧪 | ❌ | ✅ | 🧪 | ❓ | ❌ |

## Boards

All boards are arm64 only. Each column links to the board's install page.

| Base | [Raspberry Pi 3](../installation/edge-devices/raspberry.md) | [Raspberry Pi 4](../installation/edge-devices/raspberry.md) | [Jetson AGX Orin](../installation/edge-devices/nvidia_agx_orin.md) | [Jetson Orin NX](../installation/edge-devices/nvidia_orin_nx.md) | [Jetson AGX Thor](../installation/edge-devices/nvidia_agx_thor.md) | [DGX Spark](../installation/edge-devices/nvidia_dgx_spark.md) |
|---|---|---|---|---|---|---|
| Hadron | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ubuntu 20.04 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ubuntu 22.04 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ubuntu 24.04 | ❓ | ❓ | ❌ | ❌ | ✅ | ✅ |
| openSUSE Leap 15.6, Tumbleweed | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Alpine 3.19 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

## Key

- ✅ **Yes**: supported and built or tested in CI, or documented on the linked page.
- ❌ **No**: not supported, or not documented for that base.
- ⚠️ **With conditions**: works, with the condition written in the cell.
- 🧪 **Not tested**: `kairos-init` does not block it, but CI does not build or test that combination.
- ❓ **Not documented**: no code, CI job or docs page covers it.

### SELinux

Set at install time with the `install.selinux` cloud-config block, `mode` is `permissive` or `enforcing`. The policy packages are installed on the RHEL and SUSE families only; CI tests Rocky 9 and openSUSE Leap 16.0. SELinux on Trusted Boot (UKI) images is added for Fedora in AuroraBoot ([kairos-io/AuroraBoot#846](https://github.com/kairos-io/AuroraBoot/pull/846)), merged after the latest AuroraBoot release.

```yaml
#cloud-config
install:
  selinux:
    enabled: true
    mode: enforcing
```

### NVIDIA GPU

GPU workloads on generic hardware, as opposed to the boards above. Hadron has an example that builds the NVIDIA kernel modules for amd64 ([`examples/add-packages/Dockerfile.nvidia`](https://github.com/kairos-io/hadron/blob/main/examples/add-packages/Dockerfile.nvidia)); it does not add the NVIDIA container toolkit. `kairos-init` has no NVIDIA driver handling outside the Jetson and DGX models.

### System extensions

System extensions need systemd 255 or newer. Alpine uses OpenRC, so it has no system extensions.

| Base | systemd | System extensions |
|---|---|---|
| Hadron | 262 | ✅ |
| Ubuntu 20.04 | 245 | ❌ |
| Ubuntu 22.04 | 249 | ❌ |
| Ubuntu 24.04 | 255 | ✅ |
| Ubuntu 25.10 | 257 | ✅ |
| Ubuntu 26.04 | 259 | ✅ |
| Debian 12 | 252 | ❌ |
| Debian 13 | 257 | ✅ |
| Fedora 41 | 256 | ✅ |
| Fedora 42 | 257 | ✅ |
| Fedora 43 | 258 | ✅ |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 9 | 252 | ❌ |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 10 | 257 | ✅ |
| openSUSE Leap 16.0 | 257 | ✅ |
| Alpine 3.21, 3.23 | None (OpenRC) | ❌ |
