---
title: "Installing Kairos Operator"
sidebar_label: "Kairos Operator"
sidebar_position: 4
date: 2025-07-25
description: Install the Kairos operator for managing upgrades and operations
---

The Kairos operator is the recommended way to manage upgrades and operations on Kairos nodes in a Kubernetes cluster. It provides a more integrated and Kairos-specific approach compared to the system-upgrade-controller which was used in the past.

## Overview

The Kairos operator provides two custom resources:

- **NodeOp**: For generic operations on Kubernetes nodes (Kairos or not). It allows mounting the host's root filesystem to perform operations or run scripts.

- **NodeOpUpgrade**: A Kairos-specific custom resource for upgrading Kairos nodes. It automatically creates a NodeOp with the appropriate upgrade script and configuration.

## Deploying the operator

To deploy the operator, you can use kubectl (provided that the `git` command is available):

```bash
# Using GitHub URL
kubectl apply -k https://github.com/kairos-io/kairos-operator/config/default

# Or using local directory (if you have the operator checked out)
kubectl apply -k config/default
```

When the operator starts, it will automatically detect Kairos nodes and label them with `kairos.io/managed: true`. This label can be used to target Kairos nodes specifically in hybrid clusters.

### Removing the operator

```bash
# Using GitHub URL
kubectl delete -k https://github.com/kairos-io/kairos-operator/config/default

# Or using local directory
kubectl delete -k config/default
```

## Installing via Bundle

You can also install the Kairos Operator using a bundle by adding the following configuration to your cloud-config file:

```yaml
bundles:
  - targets:
      - run://quay.io/kairos/community-bundles:kairos-operator_latest
```

This will automatically deploy the operator during the node initialization process.

### Removing the Bundle Installation

To remove the operator installed via bundle, you need to delete the `kairos-operator.yaml` file from the appropriate location:

- **k0s**: `/var/lib/k0s/manifests/kairos-operator/`
- **k3s**: `/var/lib/rancher/k3s/server/manifests/`

## Basic NodeOp example

Here's a simple example of a NodeOp resource:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: example-nodeop
  namespace: default
spec:
  # NodeSelector to target specific nodes (optional)
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # The container image to run on each node
  image: busybox:latest

  # The command to execute in the container
  command:
    - sh
    - -c
    - |
      echo "Running on node $(hostname)"
      ls -la /host/etc/kairos-release
      cat /host/etc/kairos-release

  # Path where the node's root filesystem will be mounted (defaults to /host)
  hostMountPath: /host

  # Whether to cordon the node before running the operation
  cordon: true

  # Drain options for pod eviction
  drainOptions:
    enabled: true
    force: false
    gracePeriodSeconds: 30
    ignoreDaemonSets: true
    deleteEmptyDirData: false
    timeoutSeconds: 300

  # Whether to reboot the node after successful operation
  rebootOnSuccess: true

  # Number of retries before marking the job failed
  backoffLimit: 3

  # Maximum number of nodes that can run the operation simultaneously
  # 0 means run on all nodes at once
  concurrency: 1

  # Whether to stop creating new jobs when a job fails
  # Useful for canary deployments
  stopOnFailure: true
```

## Upgrading firmware with NodeOp

Sometimes, new versions of firmware are released that are not bundled with the Kairos OS image. The Kairos operator can help manage firmware upgrades using the `NodeOp` custom resource. Here's an example of how to use `NodeOp` to upgrade firmware on Kairos nodes by using the [Linux Vendor Firmware Service](https://fwupd.org/) toolset.

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: upgrade-firmware
  namespace: default
spec:
  # NodeSelector to target specific nodes (optional)
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # The container image to run on each node
  image: alpine:latest

  # The command to execute in the container
  command:
    - sh
    - -ec
    - |
      echo "=== Starting firmware upgrade on node $(hostname) ==="
      echo "Installing required packages..."
      apk add --no-cache dbus udisks2 fwupd
      echo "Setting up mount namespaces..."
      mount --make-rprivate /
      echo "Binding /host/dev to /dev"
      mount --rbind /host/dev /dev; mount --make-rslave /dev
      echo "Binding /host/sys to /sys"
      mount --rbind /host/sys /sys; mount --make-rslave /sys
      echo "Binding /host/run/udev to /run/udev"
      mkdir -p /run/udev; mount --rbind /host/run/udev /run/udev; mount --make-rslave /run/udev
      echo "Mounting EFI System Partition..."
      # mount it ourselves, otherwise its very slow to be mounted by udisksd
      mkdir -p /boot/efi; mount -t vfat /dev/vda1 /boot/efi
      echo "Starting D-Bus daemon..."
      mkdir -p /run/dbus; dbus-daemon --system --fork
      echo "Starting udisksd..."
      /usr/libexec/udisks2/udisksd --no-debug &
      echo "Refreshing LVFS metadata..."
      fwupdtool refresh
      echo "Listing updatable devices..."
      fwupdtool get-devices
      echo "Applying firmware updates..."
      fwupdtool update --force
      echo "=== Firmware upgrade completed on node $(hostname) ==="


  # Path where the node's root filesystem will be mounted (defaults to /host)
  hostMountPath: /host

  # Whether to cordon the node before running the operation
  cordon: true

  # Drain options for pod eviction
  drainOptions:
    enabled: true
    force: false
    gracePeriodSeconds: 30
    ignoreDaemonSets: true
    deleteEmptyDirData: false
    timeoutSeconds: 300

  # Whether to reboot the node after successful operation
  rebootOnSuccess: true

  # Number of retries before marking the job failed
  backoffLimit: 3

  # Maximum number of nodes that can run the operation simultaneously
  # 0 means run on all nodes at once
  concurrency: 1

  # Whether to stop creating new jobs when a job fails
  # Useful for canary deployments
  stopOnFailure: true
```

### How It Works

 - The operator spawns a privileged Pod on each matching node, automatically mounting the host’s root filesystem at /host.
 - The container binds the host’s /dev, /sys, and /run/udev so that fwupd can see the real hardware.
 - It starts a minimal D-Bus and udisksd instance (needed by fwupd on Alpine).
 - The EFI System Partition (/boot/efi) is mounted, enabling capsule staging if firmware allows it. This could be skipped as the udisksd would mount it eventually, but it can be really slow to do so.
 - The script refreshes LVFS metadata, finds updatable firmware, and installs any pending update (for instance, the UEFI dbx capsule).
 - After completion, the node is cordoned, updated, and rebooted by the operator once the Job succeeds.


## What's next?

- [Upgrading Kairos with the operator](/docs/v3.6.0/upgrade/kubernetes/)
- [Trusted Boot upgrades](/docs/v3.6.0/upgrade/trustedboot/)
- [Manual upgrades](/docs/v3.6.0/upgrade/manual/)
