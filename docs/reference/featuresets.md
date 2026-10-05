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

| Base | [Trusted Boot (UKI)](../installation/trustedboot.mdx) | [SELinux](../security/selinux.md) | [CIS L1](../security/cis.md) | [FIPS](../examples/fips.md) | [System extensions](../advanced/sys-extensions.md) |
|---|---|---|---|---|---|
| Hadron | ✅ | ❌ | ✅ | ✅ | ✅ |
| Ubuntu 20.04 | 🧪 | ❌ | ✅ | ⚠️[^ubuntu-pro] | ❌ |
| Ubuntu 22.04 | 🧪 | ❌ | ✅ | ⚠️[^ubuntu-pro] | ❌ |
| Ubuntu 24.04 | ✅ | ❌ | ✅ | ⚠️[^ubuntu-pro] | ✅ |
| Ubuntu 25.10 | ✅ | ❌ | ✅ | ⚠️[^ubuntu-pro] | ✅ |
| Ubuntu 26.04 | ✅ | ❌ | ✅ | ⚠️[^ubuntu-pro] | ✅ |
| Debian 12 | 🧪 | ❌ | ✅ | 🧪 | ❌ |
| Debian 13 | 🧪 | ❌ | ✅ | 🧪 | ✅ |
| Fedora 41 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fedora 42, 43 | 🧪 | ✅ | ✅ | 🧪 | ✅ |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 9 | 🧪 | ✅ | ✅ | 🧪 | ❌ |
| Rocky, AlmaLinux, Oracle Linux, CentOS Stream 10 | 🧪 | ✅ | ✅ | 🧪 | ✅ |
| openSUSE Leap 16.0 | 🧪 | ✅ | ✅ | 🧪 | ✅ |
| Alpine 3.21, 3.23 | ❌ | ❌ | ✅ | 🧪 | ❌ |

## Boards

All boards are arm64 only. Each column links to the board's install page.

| Base | [Raspberry Pi 3](../installation/edge-devices/raspberry.md) | [Raspberry Pi 4](../installation/edge-devices/raspberry.md) | [Jetson AGX Orin](../installation/edge-devices/nvidia_agx_orin.md) | [Jetson Orin NX](../installation/edge-devices/nvidia_orin_nx.md) | [Jetson AGX Thor](../installation/edge-devices/nvidia_agx_thor.md) | [DGX Spark](../installation/edge-devices/nvidia_dgx_spark.md) |
|---|---|---|---|---|---|---|
| Hadron | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ubuntu 20.04 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ubuntu 22.04 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ubuntu 24.04 | 🧪 | 🧪 | ❌ | ❌ | ✅ | ✅ |
| openSUSE Leap 15.6, Tumbleweed | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Alpine 3.19 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

## Key

- ✅ **Yes**: supported and built or tested in CI, or documented on the linked page.
- ❌ **No**: not supported, or not documented for that base.
- ⚠️ **With conditions**: works, with the condition in the footnote.
- 🧪 **Not tested**: supported by `kairos-init`, but CI does not build or test that combination.

[^ubuntu-pro]: FIPS on Ubuntu needs an Ubuntu Pro subscription and extra packages, so `kairos-init --fips` refuses Ubuntu. Build it from the [Ubuntu FIPS example](https://github.com/kairos-io/kairos/blob/master/examples/builds/ubuntu-fips/Dockerfile) instead.
