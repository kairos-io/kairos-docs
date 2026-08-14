---
title: "NVIDIA DGX Spark"
sidebar_label: "NVIDIA DGX Spark"
description: Build and install Kairos on NVIDIA DGX Spark.
slug: /installation/nvidia_dgx_spark
---

NVIDIA DGX Spark uses the GB10 Grace Blackwell platform. It is an ARM64 UEFI/SBSA
system, not a Jetson/L4T device. Build its Kairos image with the
`nvidia-dgx-spark` model.

## Prerequisites

- An NVIDIA DGX Spark.
- Docker with `buildx`.
- A `kairos-init` release that includes DGX Spark support.
- An ARM64 build host or QEMU support for ARM64 cross-builds.

## Build the image

Create this `Dockerfile`:

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

FROM ubuntu:24.04
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init --version "${VERSION}" --model nvidia-dgx-spark
```

Build and push the ARM64 image:

```bash
docker buildx build --platform linux/arm64 \
  -t my-registry.example.com/kairos-dgx-spark:v1.0.0 \
  --push .
```

On an ARM64 host, you can use `docker build` without the `--platform` option.

## What the model configures

The `nvidia-dgx-spark` model configures these platform components:

- The NVIDIA HWE kernel for Ubuntu 24.04.
- The open NVIDIA 580 kernel modules and headless driver.
- NVIDIA DGX BaseOS and Spark package repositories.
- NVIDIA and Mellanox firmware and platform tools.
- The serial console and kernel arguments that DGX Spark requires.
- `fwupd` for UEFI capsule updates through ESRT.

The model does not add the CUDA repository. Add NVIDIA's ARM64 SBSA CUDA
repository in a derived image if you need host CUDA packages.

## Create installable artifacts

Create an output directory:

```bash
mkdir -p build
```

Run AuroraBoot with the image that you pushed:

```bash
docker run --rm -v "$PWD/build:/output" \
  quay.io/kairos/auroraboot:{{< AuroraBootVersion >}} \
  build-iso --output /output/ \
  oci:my-registry.example.com/kairos-dgx-spark:v1.0.0
```

AuroraBoot writes the installable ISO and its checksum to the `build` directory.
See the [AuroraBoot reference](/docs/reference/auroraboot/) for other artifact
types and configuration options.

DGX Spark uses the standard Kairos installation and upgrade flow because it
boots with UEFI.

You can use providers, Trusted Boot, and stage extensions with this model. See
the [Kairos Factory reference](/docs/reference/kairos-factory/) for the available
options.
