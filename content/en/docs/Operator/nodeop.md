---
title: "NodeOp"
linkTitle: "NodeOp"
weight: 2
date: 2025-07-25
description: Run generic operations on Kubernetes nodes using the NodeOp custom resource
---

The `NodeOp` custom resource allows you to run generic operations on Kubernetes nodes (Kairos or not). It spawns a privileged Pod on each matching node, automatically mounting the host's root filesystem so your scripts can manipulate it.

This is useful for tasks such as:
- Firmware upgrades
- Pushing configuration files to nodes
- Resetting nodes
- Running custom maintenance scripts
- Any operation that requires host-level access

## Basic Example

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

## Spec Reference

| Field | Type | Default | Description |
|---|---|---|---|
| `nodeSelector` | `LabelSelector` | (none) | Standard Kubernetes label selector to target specific nodes |
| `image` | `string` | (required) | Container image to run on each node |
| `imagePullSecrets` | `[]LocalObjectReference` | (none) | Secrets for pulling from private registries ([details]({{< relref "private-registries" >}})) |
| `command` | `[]string` | (required) | Command to execute in the container |
| `hostMountPath` | `string` | `/host` | Path where the node's root filesystem is mounted |
| `cordon` | `bool` | `false` | Whether to cordon the node before running the operation |
| `drainOptions.enabled` | `bool` | `false` | Enable draining pods before the operation |
| `drainOptions.force` | `bool` | `false` | Force eviction of pods without a controller |
| `drainOptions.gracePeriodSeconds` | `int` | `30` | Grace period for pod termination |
| `drainOptions.ignoreDaemonSets` | `bool` | `true` | Ignore DaemonSet pods when draining |
| `drainOptions.deleteEmptyDirData` | `bool` | `false` | Delete data in emptyDir volumes |
| `drainOptions.timeoutSeconds` | `int` | `300` | Timeout for the drain operation |
| `rebootOnSuccess` | `bool` | `false` | Whether to reboot the node after successful operation |
| `backoffLimit` | `int` | `3` | Number of retries before marking the job failed |
| `concurrency` | `int` | `0` | Max nodes running the operation simultaneously (0 = all at once) |
| `stopOnFailure` | `bool` | `false` | Stop creating new jobs when a job fails |

## Example: Upgrading Firmware

Sometimes, new versions of firmware are released that are not bundled with the Kairos OS image. The Kairos operator can help manage firmware upgrades using the `NodeOp` custom resource. Here's an example that uses the [Linux Vendor Firmware Service](https://fwupd.org/) toolset:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: upgrade-firmware
  namespace: default
spec:
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  image: alpine:latest

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

  hostMountPath: /host
  cordon: true
  drainOptions:
    enabled: true
    force: false
    gracePeriodSeconds: 30
    ignoreDaemonSets: true
    deleteEmptyDirData: false
    timeoutSeconds: 300
  rebootOnSuccess: true
  backoffLimit: 3
  concurrency: 1
  stopOnFailure: true
```

### How It Works

- The operator spawns a privileged Pod on each matching node, automatically mounting the host's root filesystem at `/host`.
- The container binds the host's `/dev`, `/sys`, and `/run/udev` so that fwupd can see the real hardware.
- It starts a minimal D-Bus and udisksd instance (needed by fwupd on Alpine).
- The EFI System Partition (`/boot/efi`) is mounted, enabling capsule staging if firmware allows it. This could be skipped as the udisksd would mount it eventually, but it can be really slow to do so.
- The script refreshes LVFS metadata, finds updatable firmware, and installs any pending update (for instance, the UEFI dbx capsule).
- After completion, the node is cordoned, updated, and rebooted by the operator once the Job succeeds.

## What's next?

- [NodeOpUpgrade]({{< relref "nodeop-upgrade" >}}) — simplified Kairos-specific upgrades
- [Pushing configuration after install]({{< relref "../Advanced/after-install" >}}) — use NodeOp to push configs
- [Reset a node from Kubernetes]({{< relref "../Reference/reset" >}}) — use NodeOp to reset nodes
