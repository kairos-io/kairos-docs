---
title: "Nvidia AGX Thor"
sidebar_label: "Nvidia AGX Thor"
date: 2025-10-13
description: Install Kairos on Nvidia AGX Thor, a powerful edge device designed for AI workloads, to enable real-time data processing and analytics at the edge.
slug: /installation/nvidia_agx_thor
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This page describes the AGX Thor-specific image flow. After you have a Kairos Thor image, installation and lifecycle operations are the same as standard Kairos.

:::tip Prefer a plain Ubuntu 24.04 base?
The Ubuntu tab below shows the shortest path — a bare `kairos-init --model nvidia-jetson-thor`
build. The [NVIDIA Jetson (build image)](/docs/installation/nvidia-jetson-images/) guide covers
the same flow for all three Jetson models side by side; use it if you want to compare against
AGX Orin / Orin NX.
:::

:::warning Minimum versions
- `kairos-init` with Thor support requires `v0.9.0` or newer.
- `AuroraBootISO` with Thor support requires ` v0.20.0` or newer.
:::

## Build the base image

<Tabs groupId="source-image">
<TabItem value="hadron" label="Hadron" default>


Build your Thor base image using the reference file at the [Hadron repo](https://raw.githubusercontent.com/kairos-io/hadron/refs/heads/main/examples/add-packages/Dockerfile.thor)

This dockerfile builds an image that includes:
- A build-from-scratch Tegra-compatible kernel
- Tegra out-of-tree modules (including graphics driver modules)
- NVIDIA userspace runtime pieces required on Thor

For part of the NVIDIA userspace stack, source code is not available. For those components, we extract and use upstream NVIDIA packages directly. This provides firmware and userspace dependencies such as CUDA libraries, NVIDIA container libraries, and NVIDIA container binaries.

```bash
curl -L https://raw.githubusercontent.com/kairos-io/hadron/refs/heads/main/examples/add-packages/Dockerfile.thor -o Dockerfile.Thor
docker build -f Dockerfile.Thor -t quay.io/myrepo/nvidia:v1.0.0 .
```

## Kairosify the image


Now pass it through `kairos-init` with the Thor model as mentioned in the [Kairos factory](../../reference/kairos-factory.mdx) docs. The key requirement is to specify `--model nvidia-jetson-thor`:

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

FROM quay.io/myrepo/nvidia:v1.0.0
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init --version "${VERSION}" --model nvidia-jetson-thor
```

</TabItem>
<TabItem value="ubuntu" label="Ubuntu 24.04">


No extra base-image build or changes are required. Use the upstream Ubuntu 24.04 Thor image directly; `init` handles the Thor setup path and will deply the upstream NVIDIA L4T packages directly in the image.


## Kairosify the image

Now pass it through `kairos-init` with the Thor model as mentioned in the [Kairos factory](../../reference/kairos-factory.mdx) docs. The key requirement is to specify `--model nvidia-jetson-thor`:


```Dockerfile
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

FROM ubuntu:24.04
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init --version "${VERSION}" --model nvidia-jetson-thor
```


</TabItem>
</Tabs>

## Build and boot ISO

Build the ISO with AuroraBoot as usual, using your Thor kairosified image. For AuroraBoot usage, see [AuroraBoot reference](../../reference/auroraboot.md).

Boot from the ISO as in a normal Kairos workflow. The Thor live image omits the proprietary
NVIDIA drivers from its initramfs so it can boot when the board has older, but still
updatable, QSPI firmware.

## QSPI firmware compatibility

Thor boot firmware and the L4T release in the Kairos image must match. `kairos-init` pins a
release-matched L4T version for the Thor model and includes the corresponding UEFI capsule.
The pin is updated with new Thor L4T releases. Set `L4T_VERSION` while running `kairos-init`
only when you deliberately build the complete image for another matching L4T release.

During installation and OCI upgrades, Kairos compares the board firmware reported by UEFI
ESRT with the image's `nvidia-l4t-bootloader` version:

- If the versions match, installation or upgrade continues without changing the firmware.
- If the board firmware is older, Kairos stages the image's capsule on the EFI System
  Partition. UEFI applies it on the next boot before Linux starts.
- If the board firmware is newer, installation or upgrade stops. UEFI capsules cannot
  downgrade QSPI firmware. Build a Kairos image for the board's L4T release or fully reflash
  the board.
- Firmware older than L4T 38.0 cannot be updated in-band and requires a USB host flash.

Do not interrupt the next boot after a capsule has been staged. Firmware update progress is
shown by the board firmware before Kairos starts.

## Install, upgrade, and reset

AGX Thor follows normal Kairos operations, with the QSPI compatibility check above running
after both installation and upgrades:
- [Manual installation](../manual.md)
- [Manual upgrades](../../upgrade/manual.md)
- [Reset reference](../../reference/reset.md)

## Deploy the GPU Operator

Once the node is booted and joined to the cluster, wire up Kubernetes so pods can request
`nvidia.com/gpu` — see [GPU Operator on Jetson AGX Thor](/hadron-docs/nvidia/thor-cluster/).
