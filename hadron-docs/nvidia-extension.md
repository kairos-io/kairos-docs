---
title: Nvidia drivers
sidebar_position: 3
---

# Build a custom Hadron image with NVIDIA drivers

This NVIDIA Dockerfile builds a **final Hadron-based image** with NVIDIA drivers/tools already included. Users use it by selecting:

- Hadron version (via a build arg)
- NVIDIA driver version (via a build arg)
- an output image name (their registry/repo)

The produced output is the **final layered image** target (commonly named `hadron-extension`), which is based on Hadron and includes the NVIDIA payload.

## Build arguments

The Dockerfile supports:

- `HADRON_VERSION` (or tag)  
  The Hadron version to build against **and** to use as the final base image.
- `NVIDIA_VERSION`  
  The NVIDIA driver/userspace version to include.
- `JOBS`  
  Parallelism for compilation.

:::info
The Dockerfile uses the same `HADRON_VERSION` for both `hadron-toolchain` and `hadron`. This ensures kernel module compatibility.
:::

## Build the final “Hadron + NVIDIA” image

From the directory containing the Dockerfile:

```bash
HADRON_VERSION="v0.0.4"          # set to the Hadron release/tag you want
NVIDIA_VERSION="580.126.20"      # set as needed
IMAGE="my-registry.example.com/myteam/hadron-nvidia:${HADRON_VERSION}-${NVIDIA_VERSION}"

docker build \
  -f Dockerfile.nvidia \
  --build-arg HADRON_VERSION="${HADRON_VERSION}" \
  --build-arg NVIDIA_VERSION="${NVIDIA_VERSION}" \
  --build-arg JOBS="$(nproc)" \
  --target hadron-extension \
  -t "${IMAGE}" \
  .
```

## Push to your registry

```bash
docker push "${IMAGE}"
```

Users can now consume your custom Hadron image like any other image to build artifacts using [Auroraboot](/docs/reference/auroraboot) or to run K8s workloads with NVIDIA support

:::tip
Quick validation on your image:

```bash
docker run --rm -it "${IMAGE}" nvidia-smi
```

Actual GPU access depends on how/where it runs, but this confirms the image contains the NVIDIA tooling and runtime wiring expected by your system.
:::