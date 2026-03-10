---
title: "Without Kubernetes"
sidebar_label: "Without Kubernetes"
description: Build a Kairos core image with kairos-init and no Kubernetes provider flags.
---

This example shows how to build a Kairos image without Kubernetes.

The key point is simple: run `kairos-init` **without** `--provider` and `--provider-<name>-version` flags.

## Dockerfile example (core image)

```dockerfile
FROM ubuntu:24.04
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

ARG VERSION=v1.0.0

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
  /kairos-init -l debug -s install --version "${VERSION}" && \
  /kairos-init -l debug -s init --version "${VERSION}"
```

Because no provider flags are passed, the resulting image stays **core** (no Kubernetes distribution installed).

## Build

```bash
docker build -t my-kairos-core:v1.0.0 .
```

If later you want to add Kubernetes, use provider flags (for example `--provider k3s --provider-k3s-version <release>`) as documented in [Kairos Factory](/docs/reference/kairos-factory/).
