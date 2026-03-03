---
authors:
  - mauro-morales
description: Why Kairos v4 changes artifact publication while preserving distro choice.
slug: 2026/02/27/kairos-release-v4.0.0
tags:
  - kairos
title: "Kairos release v4.0.0"
---

Kairos v4.0.0 is the result of a clear architecture path we have been building over time: first standardizing image creation with `kairos-init`, then making that flow easy to run anywhere with [Kairos Factory](/docs/reference/kairos-factory/) and [`kairos-factory-action`](https://github.com/kairos-io/kairos-factory-action), and finally introducing [Hadron](/blog/2025/12/17/introducing-hadron-the-minimal-upstream-first-linux-base-for-kairos).

In March 2025, we introduced [`kairos-init`](/blog/2025/03/26/how-we-rebuilt-kairos-building-from-the-ground-up), a foundational shift that removed Dockerfile-heavy distro logic and standardized how we transform OCI bases into Kairos images.

From there, we focused on operationalizing that model so anyone could run it. With [Kairos Factory](/docs/reference/kairos-factory/), users can build and maintain their own Kairos pipelines using the same tooling we run in production.

In December 2025, we introduced [Hadron](/blog/2025/12/17/introducing-hadron-the-minimal-upstream-first-linux-base-for-kairos), our upstream-first Linux base for immutable systems. In v4, Hadron artifacts are what the project publishes in its release flow.

At the same time, distro flexibility remains core to Kairos. This is visible in active community work such as Oracle Linux support in [kairos-io/kairos#3987](https://github.com/kairos-io/kairos/issues/3987).

For additional migration and build context, read [Hadron-Only Artifacts with Ongoing Distro Support](/blog/2026/02/25/kairos-v4-hadron-artifacts-and-distro-flexibility/).

<!--truncate-->

## What v4 delivers in practice

The key technical reassurance in v4 is compatibility in the build pipeline. Between `v3.7.2` and `v4.0.0`, the `kairos-init` version did not change.

This matters because `kairos-init` is where the core Kairos transformation components are pinned. When that set of components is unchanged, build behavior remains compatible in practice across releases. In practical terms, if your non-Hadron flavor pipeline built successfully with `v3.7.2`, it should continue to build with `v4.0.0` under the same assumptions.

For the complete technical details of `v4.0.0`, see the release notes: [kairos v4.0.0](https://github.com/kairos-io/kairos/releases/tag/v4.0.0).

## How to switch to v4

There are two official paths to adopt Kairos v4, and the right one depends on your environment and goals.

One path is to use [Hadron-based images](https://quay.io/repository/kairos/hadron), which are now published as part of the project release flow.

The other path is to keep your current distro flavor and build your own v4 release pipeline. With [Kairos Factory](/docs/reference/kairos-factory/), you can build and publish your flavor using the same production tooling model we use ourselves.

For migration guidance and build details, read: [Hadron-Only Artifacts with Ongoing Distro Support](/blog/2026/02/25/kairos-v4-hadron-artifacts-and-distro-flexibility/).
