---
title: "Choosing Kubernetes Distribution"
sidebar_label: "Choosing Kubernetes Distribution"
description: Build a Kairos image with Kubernetes enabled using the supported provider-kairos options.
---

This example shows how to build Kairos with Kubernetes enabled.

:::info
At the moment, the official `provider-kairos` supports these two distributions (`k3s` and `k0s`). If you need a different Kubernetes distribution, there are community providers that can be used to extend Kairos with other options.
:::

## k3s

```dockerfile
FROM ubuntu:24.04
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

ARG VERSION=v1.0.0

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
  /kairos-init -l debug -s install --version "${VERSION}" --provider k3s --provider-k3s-version latest && \
  /kairos-init -l debug -s init --version "${VERSION}"
```

## k0s

```dockerfile
FROM ubuntu:24.04
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

ARG VERSION=v1.0.0

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
  /kairos-init -l debug -s install --version "${VERSION}" --provider k0s --provider-k0s-version latest && \
  /kairos-init -l debug -s init --version "${VERSION}"
```

Build either version with:

```bash
docker build -t my-kairos-k8s:v1.0.0 .
```
