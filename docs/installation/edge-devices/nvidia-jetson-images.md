---
title: "Building Kairos images for NVIDIA Jetson"
sidebar_label: "NVIDIA Jetson (build image)"
sidebar_position: 1
date: 2026-07-17
description: Build a Kairos image for a Jetson AGX Orin, Orin NX or AGX Thor via kairos-init.
slug: /installation/nvidia-jetson-images
---

`kairos-init` supports three NVIDIA Jetson boards through the `--model` flag. Passing the right
model is enough — you no longer need a hand-written `Dockerfile.nvidia`. This page walks through
the build; the per-board flashing steps stay on the existing device pages linked below.

:::info Where did `Dockerfile.nvidia` go?
Kairos used to ship [`images/Dockerfile.nvidia`](https://github.com/kairos-io/kairos/blob/v3.5.6/images/Dockerfile.nvidia)
in the main repo. Everything it did — enabling the NVIDIA L4T apt repos, installing
`nvidia-l4t-*` packages, wiring the Tegra kernel, disabling boot firmware updates in
preinstall — is now applied automatically by `kairos-init` when you pass a Jetson `--model`.
The `Dockerfile.nvidia` was removed once the logic moved into `kairos-init`; this page is its
replacement.
:::

## Supported Jetson models

| `--model`                | Board                                     | L4T family | Base image        |
|--------------------------|-------------------------------------------|------------|-------------------|
| `nvidia-jetson-agx-orin` | [Jetson AGX Orin](/docs/installation/nvidia_agx_orin/)   | r36.x      | `ubuntu:22.04`    |
| `nvidia-jetson-orin-nx`  | [Jetson Orin NX](/docs/installation/nvidia_orin_nx/)     | r36.x      | `ubuntu:22.04`    |
| `nvidia-jetson-thor`     | [Jetson AGX Thor](/docs/installation/nvidia_agx_thor/)   | r38.x      | `ubuntu:24.04` or Hadron |

For the full list of `--model` values (including `generic`, `rpi3`, `rpi4`) see
[The Kairos Factory](/docs/reference/kairos-factory/#supported-device-targets).

## Prerequisites

- Docker with `buildx`.
- Build platform is `linux/arm64` — either a native ARM host, cross-build via QEMU
  (`--platform linux/arm64`) or an ARM GitHub Actions runner.
- `kairos-init` `v0.9.0` or newer for AGX Orin / Orin NX; `v0.9.0`+ is also the minimum for
  Thor support. Check [Kairos releases](https://github.com/kairos-io/kairos-init/releases) for
  the newest tag; this page uses `{{< KairosInitVersion >}}`.

## Build the image

The Dockerfile is the standard Kairos Factory shape — only `--model` changes per board.

### AGX Orin (Ubuntu 22.04)

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

FROM ubuntu:22.04
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init --version "${VERSION}" --model nvidia-jetson-agx-orin
```

### Orin NX (Ubuntu 22.04)

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

FROM ubuntu:22.04
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init --version "${VERSION}" --model nvidia-jetson-orin-nx
```

### AGX Thor (Ubuntu 24.04 or Hadron)

Thor has two supported base images. Ubuntu 24.04 is the drop-in equivalent to the flow above;
Hadron is a musl-based from-scratch base that requires a pre-build step (see the Thor page for
details). The `--model` flag is the same.

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

FROM ubuntu:24.04
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init --version "${VERSION}" --model nvidia-jetson-thor
```

For the Hadron variant, follow [Nvidia AGX Thor](/docs/installation/nvidia_agx_thor/) — it
builds a Thor-specific Hadron base first, then runs the same `kairos-init` step with
`--model nvidia-jetson-thor`.

## Build for `linux/arm64`

If your workstation is not ARM, cross-build via QEMU:

```bash
docker buildx build --platform linux/arm64 \
  -t my-registry.example.com/kairos-agx-orin:v1.0.0 \
  --push .
```

On a native ARM host you can drop `--platform` and use plain `docker build`.

## What `--model` does under the hood

For any of the Jetson models, `kairos-init`:

- Adds the appropriate NVIDIA L4T apt repos
  (`https://repo.download.nvidia.com/jetson/common r<L4T>` and the board-specific
  `t234` / `t264` repo).
- Installs the `nvidia-l4t-*` package set (kernel, bootloader, firmware, CUDA runtime,
  multimedia, tools, etc.) matching the L4T family.
- Wires up the Tegra kernel and initrd so `/boot/vmlinuz` and `/boot/initrd` point at the
  Tegra artifacts, not the generic Ubuntu ones.
- Applies the [`12_nvidia.yaml`](https://github.com/kairos-io/kairos-init/blob/main/pkg/bundled/cloudconfigs/12_nvidia.yaml)
  cloud-config (disables `nv-l4t-boot-fw-update-in-preinstall`, sets up the Tegra rootfs prep,
  etc.).
- Enables the required systemd services for the board.

None of this needs to be written by hand — the flag pulls in everything the old
`Dockerfile.nvidia` used to do, and stays current with L4T releases as `kairos-init` is
updated.

## Add providers, FIPS, Trusted Boot, ...

Everything the Kairos Factory supports composes with `--model`. To bundle a Kubernetes
provider, pass it the same way as for a generic image:

```Dockerfile
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init --version "${VERSION}" \
      --model nvidia-jetson-agx-orin \
      --provider k3s \
      --provider-k3s-version v1.35.1+k3s1
```

`--fips`, `--trusted-boot`, `--skip-steps` and stage extensions (`-x`) all work identically.
See [The Kairos Factory](/docs/reference/kairos-factory/) for the full flag reference.

## Turn the OCI image into installable artifacts

Once the image is built and pushed, feed it to [AuroraBoot](/docs/reference/auroraboot/) to
produce partitions, ISOs or raw disk images. The generic AuroraBoot flow applies; Jetson-specific
flashing steps (`Linux_for_Tegra` SDK, board configs, partition layouts) live on the per-board
pages:

- [Nvidia AGX Orin](/docs/installation/nvidia_agx_orin/) — eMMC flashing with the Jetson SDK.
- [Nvidia Orin NX](/docs/installation/nvidia_orin_nx/) — NVMe flashing.
- [Nvidia AGX Thor](/docs/installation/nvidia_agx_thor/) — Hadron-specific base and standard
  Kairos install/upgrade flow.

## GPU workloads on the cluster

Building the image only gets you a bootable node. To let Kubernetes pods request
`nvidia.com/gpu` on Thor, see [GPU Operator on Jetson AGX Thor](/hadron-docs/nvidia/thor-cluster/).
For discrete NVIDIA GPUs on x86_64 (not Jetson), see
[Discrete NVIDIA GPU on x86_64](/hadron-docs/nvidia/discrete-x86/).
