---
title: "Kairos Operator"
linkTitle: "Kairos Operator"
icon: fa-regular fa-gears
weight: 4
description: |
    Manage Kairos nodes at scale using the Kairos Kubernetes operator. Build OS artifacts, perform upgrades, and run operations — all from Kubernetes.
---

The [Kairos operator](https://github.com/kairos-io/kairos-operator) is a Kubernetes operator for day-2 operations of Kairos clusters. It provides a set of Custom Resource Definitions (CRDs) that allow you to manage Kairos nodes, perform upgrades, build OS artifacts, and run arbitrary operations — all from within Kubernetes.

## Custom Resources

The operator provides three custom resources:

- **[NodeOp](nodeop)**: Run generic operations on Kubernetes nodes (Kairos or not). It allows mounting the host's root filesystem to perform operations or run scripts. Useful for firmware upgrades, configuration changes, resets, and more.

- **[NodeOpUpgrade](nodeop-upgrade)**: A Kairos-specific custom resource for upgrading Kairos nodes. It automatically creates a NodeOp with the appropriate upgrade script and configuration. Supports canary deployments, concurrency control, and failure handling.

- **[OSArtifact](osartifact)**: Build Linux distribution artifacts (ISO images, cloud images, netboot artifacts, etc.) from container images directly in Kubernetes. This allows you to build Kairos OS images and other bootable artifacts as Kubernetes-native resources.

## Getting Started

1. [Install the operator](installation) on your Kubernetes cluster
2. Explore the CRDs for your use case:
   - Need to **upgrade** your Kairos nodes? See [NodeOpUpgrade](nodeop-upgrade)
   - Need to **run operations** on nodes (firmware updates, config changes, resets)? See [NodeOp](nodeop)
   - Need to **build OS images** (ISOs, cloud images, netboot)? See [OSArtifact](osartifact)
3. If you use private container registries, see [Private Registries](private-registries)
