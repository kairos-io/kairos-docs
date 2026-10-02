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

| Base | [Trusted Boot (UKI)](../installation/trustedboot.mdx) | [SELinux](#selinux) | [CIS L1](../security/cis.md) | [FIPS](../examples/fips.md) | [System extensions](../advanced/sys-extensions.md) | [Arches](./image_matrix.md) |
|---|---|---|---|---|---|---|
| Hadron | ✅ | ❌ | ✅ | ✅ | ✅ | amd64, arm64 |
| Ubuntu 20.04 | 🧪 | ❌ | ✅ | ⚠️[^ubuntu-pro] | ❌ | amd64, arm64 |
| Ubuntu 22.04 | 🧪 | ❌ | ✅ | ⚠️[^ubuntu-pro] | ❌ | amd64, arm64 |
| Ubuntu 24.04 | ✅ | ❌ | ✅ | ⚠️[^ubuntu-pro] | ✅ | amd64, arm64 |
| Ubuntu 25.10 | ✅ | ❌ | ✅ | ⚠️[^ubuntu-pro] | ✅ | amd64, arm64 |
| Ubuntu 26.04 | ✅ | ❌ | ✅ | ⚠️[^ubuntu-pro] | ✅ | amd64, arm64 |
| Debian 12 | 🧪 | ❌ | ✅ | 🧪 | ❌ | amd64, arm64 |
| Debian 13 | 🧪 | ❌ | ✅ | 🧪 | ✅ | amd64, arm64 |
| Fedora 41 | ✅ | ✅ | ✅ | ✅ | ✅ | amd64[^fedora-arm64] |
| Fedora 42, 43 | 🧪 | ✅ | ✅ | 🧪 | ✅ | amd64, arm64 |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 9 | 🧪 | ✅ | ✅ | 🧪 | ❌ | amd64, arm64 |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 10 | 🧪 | ✅ | ✅ | 🧪 | ✅ | amd64, arm64 |
| openSUSE Leap 16.0 | 🧪 | ✅ | ✅ | 🧪 | ✅ | amd64, arm64 |
| Alpine 3.21, 3.23 | 🧪 | ❌ | ✅ | 🧪 | ❌ | amd64, arm64 |

## Boards

All boards are arm64 only. Each column links to the board's install page.

| Base | [Raspberry Pi 3](../installation/edge-devices/raspberry.md) | [Raspberry Pi 4](../installation/edge-devices/raspberry.md) | [Jetson AGX Orin](../installation/edge-devices/nvidia_agx_orin.md) | [Jetson Orin NX](../installation/edge-devices/nvidia_orin_nx.md) | [Jetson AGX Thor](../installation/edge-devices/nvidia_agx_thor.md) | [DGX Spark](../installation/edge-devices/nvidia_dgx_spark.md) |
|---|---|---|---|---|---|---|
| Hadron | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ubuntu 20.04 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ubuntu 22.04 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ubuntu 24.04 | ❌[^ubuntu-rpi] | ❌[^ubuntu-rpi] | ❌ | ❌ | ✅ | ✅ |
| openSUSE Leap 15.6, Tumbleweed | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Alpine 3.19 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

## Key

- ✅ **Yes**: supported and built or tested in CI, or documented on the linked page.
- ❌ **No**: not supported, or not documented for that base.
- ⚠️ **With conditions**: works, with the condition in the footnote.
- 🧪 **Not tested**: supported by `kairos-init`, but CI does not build or test that combination.

### SELinux

Set at install time with the `install.selinux` cloud-config block, `mode` is `permissive` or `enforcing`. The policy packages are installed on the RHEL and SUSE families only; CI tests Rocky 9 and openSUSE Leap 16.0. SELinux on Trusted Boot (UKI) images is added for Fedora in AuroraBoot ([kairos-io/AuroraBoot#846](https://github.com/kairos-io/AuroraBoot/pull/846)), merged after the latest AuroraBoot release.

```yaml
#cloud-config
install:
  selinux:
    enabled: true
    mode: enforcing
```

[^ubuntu-pro]: FIPS on Ubuntu needs an Ubuntu Pro subscription and extra packages, so `kairos-init --fips` refuses Ubuntu. Build it from the [Ubuntu FIPS example](https://github.com/kairos-io/kairos/blob/master/examples/builds/ubuntu-fips/Dockerfile) instead.
[^fedora-arm64]: arm64 is not built or tested in CI for Fedora 41.
[^ubuntu-rpi]: Ubuntu releases newer than 22.04 do not work on Raspberry Pi. Ubuntu turned off `CONFIG_EFI` in its `linux-raspi` kernel, and Kairos boots the Pi through U-Boot and GRUB, which needs an EFI-capable kernel. Ubuntu closed the request to turn it back on, see [kairos-io/kairos#2249](https://github.com/kairos-io/kairos/issues/2249) and [Launchpad bug 2053147](https://bugs.launchpad.net/ubuntu/+source/linux-raspi/+bug/2053147). Use Ubuntu 22.04 or another base on Raspberry Pi.
