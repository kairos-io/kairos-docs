---
title: "FIPS"
sidebar_label: "FIPS"
description: Build a Kairos image with FIPS packages enabled using kairos-init.
---

This example shows how to build a Kairos image with FIPS support.

Use the `--fips` flag in the `kairos-init` install stage.

```dockerfile
FROM ubuntu:24.04
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

ARG VERSION=v1.0.0

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
  /kairos-init -l debug -s install --version "${VERSION}" --fips && \
  /kairos-init -l debug -s init --version "${VERSION}" --fips
```

Build the image:

```bash
docker build -t my-kairos-fips:v1.0.0 .
```

For full flag reference, see [Kairos Factory](/docs/reference/kairos-factory/).
