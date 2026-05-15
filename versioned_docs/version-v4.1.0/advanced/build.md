---
title: "Build Kairos appliances"
sidebar_label: "Build"
sidebar_position: 3
description: Learn how to build Kairos images from scratch
---

:::info Note
The build functionality is provided by the **OSArtifact** custom resource in the Kairos operator. This documentation has moved to the dedicated [Kairos Operator section](/operator-docs/).
:::

The Kairos operator provides the `OSArtifact` CRD which allows you to build ISOs, cloud images (AWS, Azure, GCE, OpenStack), and netboot artifacts from container images directly in Kubernetes.

- **[OSArtifact — Build OS Artifacts](/operator-docs/osartifact/)** — Full documentation on building ISOs, cloud images, and netboot artifacts
- **Custom artifacts storage** — Optional **`spec.artifacts.volume`** (with **`spec.volumes`**) stores build outputs on a volume you define (e.g. your own PVC, `hostPath`, NFS) instead of the operator-created PVC; see [Accessing built artifacts](/operator-docs/osartifact/#accessing-built-artifacts) (includes **kind** `extraMounts` for local host directories).
- **[Operator Installation](/operator-docs/installation/)** — How to install the operator
- **[Creating Custom Cloud Images](/docs/advanced/creating_custom_cloud_images/)** — Guide on creating custom cloud images
