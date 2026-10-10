---
title: "Kubernetes Provider"
linkTitle: "Kubernetes Provider"
icon: fa-regular fa-dharmachakra
weight: 5
description: |
    Bootstrap and run Kubernetes on Kairos nodes with kubeadm, from the cloud-config you already use to install the node.
sidebar_position: 0
---

The [Kubernetes provider](https://github.com/kairos-io/provider-kubernetes) turns a Kairos node into a Kubernetes node. You describe the cluster in the node's cloud-config, and the provider runs kubeadm on first boot: one node initializes the cluster, the others join it as control planes or workers.

It ships as a Kairos image with the whole toolchain already in it, so a node does not download kubeadm, the kubelet, containerd or the control-plane images at boot. That is what makes an air-gapped install possible, and it is why the image is tied to a Kubernetes minor version.

## What it does

- Bootstraps a cluster with kubeadm and joins control planes and workers to it, including highly available control planes behind a shared endpoint.
- Upgrades a node one Kubernetes minor at a time, driven by the version you pin in the configuration.
- Works without a registry: the control-plane images for the node's Kubernetes version are built into the image and imported at boot.
- Reports what it did on the node itself, as a status document and as annotations on the Kubernetes node.

## What it does not do

- It does not install a CNI. A cluster stays NotReady until you apply one. See [CNI](cni).
- It does not manage a fleet. Day-2 operations across many nodes are the [Kairos operator's](/operator-docs/) job; this provider is concerned with the node it runs on.
- It does not re-bootstrap a node that has already joined. Recovery is an explicit reset, never automatic.

## Supported Kubernetes versions

Each release supports three Kubernetes minors and publishes one image per minor. v0.4.0 supports 1.35, 1.36 and 1.37:

```
ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.35
ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.36
ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.37
```

The newest supported minor is also published as `:v0.4.0` and `:latest`.

The Kubernetes version you pin in the configuration must match the image you booted. A mismatch fails the boot with a clear message rather than installing something you did not ask for.

## Getting started

1. [Install a node](installation) and bring up a single-node cluster.
2. Add [a CNI](cni) so the node becomes Ready.
3. Grow the cluster: [add control planes and workers](creating-a-cluster).
4. When you need them: [air-gapped installs](air-gapped), [trusted boot](trusted-boot), [upgrades](upgrades).
5. When something is wrong: [status and troubleshooting](troubleshooting).
