---
title: "Build Kairos appliances"
sidebar_label: "Build"
sidebar_position: 3
description: Learn how to build Kairos images from scratch
---

:::info Note
The build functionality is provided by the **OSArtifact** custom resource in the Kairos operator. This documentation has moved to the dedicated [Kairos Operator section]({{< relref "../Operator" >}}).
:::

The Kairos operator provides the `OSArtifact` CRD which allows you to build ISOs, cloud images (AWS, Azure, GCE, OpenStack), and netboot artifacts from container images directly in Kubernetes.

- **[OSArtifact — Build OS Artifacts]({{< relref "../Operator/osartifact" >}})** — Full documentation on building ISOs, cloud images, and netboot artifacts
- **[Operator Installation]({{< relref "../Operator/installation" >}})** — How to install the operator
- **[Creating Custom Cloud Images]({{< relref "creating_custom_cloud_images.md" >}})** — Guide on creating custom cloud images
