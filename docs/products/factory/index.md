---
title: Kairos Factory
sidebar_position: 1
---

# Kairos Factory

Kairos Factory turns any container base into a Kairos-compatible OCI image. It runs `kairos-init` inside a Dockerfile against an Alpine, Ubuntu, RHEL, Rocky, openSUSE, Fedora (or other supported) base and produces an immutable image that behaves like a Kairos node.

## How it fits

Upstream, Factory consumes user-authored Dockerfiles and vendor base images. Downstream, its OCI output is the input to [Kairos Builder](/docs/products/builder/) for boot artifacts (ISO, RAW, netboot) and to the [Kairos Operator](/docs/upgrade/kairos-operator) as an upgrade source for running clusters.

## Level 1 — Guided

- [Kairos Factory walkthrough](/docs/reference/kairos-factory) — canonical end-to-end path from base image to Kairos OCI.
- [Bring Your Own Image](/docs/reference/byoi) — wrap a base you already trust into a Kairos image.

## Level 2 — Automate

- [Build from scratch](/docs/reference/build-from-scratch) — deeper walkthrough for CI-driven pipelines.
- [NVIDIA Jetson images](/docs/installation/nvidia_agx_thor) — build Jetson images with `kairos-init --model`.
- [Hadron layers](/hadron-docs/layers) — compose pre-built Hadron layers into a Factory image.
- [Expand with sysext](/hadron-docs/expand-with-sysext) — ship additions as sysexts inside the image.

## Level 3 — Extend

- [Customizing](/docs/advanced/customizing) — deep customisation of the resulting image.
- [Custom cloud images](/docs/advanced/creating_custom_cloud_images) — preload cloud-config into the artifact.
- [Hadron toolchain](/hadron-docs/toolchain) — toolchain image for building custom extensions.

## Reference

- [Kairos Factory](/docs/reference/kairos-factory)
- [Bring Your Own Image](/docs/reference/byoi)
- [Artifacts](/docs/reference/artifacts)

## See also

- [Kairos Builder](/docs/products/builder/) — convert the Factory OCI into boot artifacts.
- [Kairos Operator](/docs/products/operator/) — consume the OCI as an upgrade source.
- [Factory to shipper](/docs/start/factory-shipper) — the full pipeline from base image to running node.
