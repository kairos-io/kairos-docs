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

## One-off operations and reusing manifests

:::warning Warning
A `NodeOp` represents a **single run** of your command on the target nodes. The controller is built around that lifecycle: it is **not** a `Deployment`-style reconciler where changing `spec` is guaranteed to re-run or fully re-drive the operation. The API **allows** `spec` updates, but you should **not** rely on “edit YAML and apply again to the same name” as a supported way to start a fresh run.

To run another operation (e.g. a different command or node selector), create a **new** `NodeOp` (new name or `generateName` + `kubectl create` as below) instead of expecting an in-place spec change to behave like a new job.
:::

### Reusing the same manifest with generateName

To run the same operation repeatedly without editing the YAML each time, use **metadata.generateName** instead of **metadata.name**. Kubernetes will assign a unique name (e.g. `my-nodeop-7x2k9`) when the resource is created. Use **kubectl create** (not **apply**) so each run creates a new NodeOp:

```yaml
metadata:
  generateName: my-nodeop-
  namespace: default
# do not set metadata.name
```

```bash
# Each command creates a new NodeOp with a generated name.
kubectl create -f my-nodeop.yaml
```

If you use **kubectl apply** with a manifest that only sets `generateName` and omits `metadata.name`, it will fail because `apply` requires a fixed `metadata.name` to target a specific resource. For repeated runs with a `generateName` manifest, use **kubectl create -f** so every run creates a new NodeOp. If you instead want `apply` semantics (updating the same NodeOp over time), define an explicit `metadata.name` and avoid `generateName`.

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
| `imagePullSecrets` | `[]LocalObjectReference` | (none) | Secrets for pulling from private registries ([details](../private-registries/)) |
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
| `preflight` | `PreflightSpec` | (none) | Optional per-node check that runs **before** cordon/drain/Job. If it reports "skip", the node is recorded as `Completed` with no Job ever created. See [Preflight checks](#preflight-checks). |
| `preflight.command` | `[]string` | (required if `preflight` is set) | Command run inside the preflight container |
| `preflight.image` | `string` | `spec.image` | Image for the preflight Pod (defaults to the main `spec.image`) |
| `preflight.activeDeadlineSeconds` | `int` | `120` | Bound on total preflight Pod lifetime; on expiry the Pod is killed and the node is marked `Failed` |

## Preflight checks

For operations where some nodes don't actually need any work — for example "upgrade only if the running version isn't already X", "flash firmware only if the installed version is older than Y", "apply a config only if it's missing or out of date" — `spec.preflight` lets you decide that on a per-node basis **before** the node is cordoned and drained.

When `preflight` is set, the controller runs an extra short-lived Pod on each target node ahead of the main Job:

1. The preflight Pod is scheduled on the target node (`spec.nodeName`), runs `preflight.command` inside `preflight.image` (defaulting to `spec.image`), and has the host root mounted read-only at `spec.hostMountPath` (default `/host`).
2. The Pod uses `restartPolicy: OnFailure` and `activeDeadlineSeconds: 120` (configurable). Transient failures (image pull blips, OOM, etc.) get auto-retried inside the deadline window.
3. The controller waits for the Pod's container to terminate, then inspects its **termination message** (`Pod.Status.ContainerStatuses[0].State.Terminated.Message`, populated from `/dev/termination-log`).

The script-to-controller contract is a single signal:

| Preflight outcome | Result |
|---|---|
| Container exit 0, `/dev/termination-log` **non-empty** | **Skip this node.** NodeStatus = `Completed`, `JobName` empty, `Message = "Skipped by preflight: <your text>"`. No cordon, no drain, no main Job. |
| Container exit 0, `/dev/termination-log` **empty** | **Proceed.** The controller runs the normal cordon → drain → main Job → reboot flow exactly as if `preflight` weren't set. |
| Pod ends in `Failed` (non-zero exits exhausted retries, or `activeDeadlineSeconds` expired) | **Fail this node.** NodeStatus = `Failed` with the reason. `spec.stopOnFailure` applies as it would for a Job failure. |

So writing a preflight script means: "compute whatever you need, `echo` a one-line *reason* to `/dev/termination-log` if you want to skip this node, exit 0 otherwise." Real failures (non-zero exits, timeouts) intentionally don't get conflated with "I decided to skip" — if your preflight is broken, the controller surfaces it rather than silently skipping.

The preflight Pod counts against `spec.concurrency` the same way an in-flight main Job does, so `concurrency: 1` means one node at a time across both preflight and the actual operation.

### Example

A NodeOp that only flashes firmware on nodes that aren't already at the desired version:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: firmware-flash
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
      echo "Flashing firmware to v2.4.0..."
      # ...real flashing work...
  hostMountPath: /host
  cordon: true
  drainOptions:
    enabled: true
  rebootOnSuccess: true
  concurrency: 1

  preflight:
    command:
      - sh
      - -c
      - |
        # Look up the firmware version already installed on the host.
        installed=$(chroot /host fwupdtool get-devices --json \
                     | jq -r '.Devices[] | select(.Name=="System Firmware") | .Version')
        if [ "$installed" = "2.4.0" ]; then
            # Skip this node: report the reason via the termination log.
            echo "system firmware is already at 2.4.0" > /dev/termination-log
        fi
        # Empty termination log => proceed with the main Job.
        exit 0
```

On any node that already runs firmware v2.4.0 the controller records `Completed` with `"Skipped by preflight: system firmware is already at 2.4.0"` and never cordons, drains, or reboots it.

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

- [NodeOpUpgrade](../nodeop-upgrade/) — simplified Kairos-specific upgrades
- [Pushing configuration after install](/docs/advanced/after-install/) — use NodeOp to push configs
- [Reset a node from Kubernetes](/docs/reference/reset/) — use NodeOp to reset nodes
