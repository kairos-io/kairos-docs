---
title: "NodeOpUpgrade"
linkTitle: "NodeOpUpgrade"
weight: 3
date: 2025-07-25
description: Upgrade Kairos nodes using the NodeOpUpgrade custom resource
---

The `NodeOpUpgrade` custom resource is a Kairos-specific resource for upgrading Kairos nodes. Under the hood, it creates a [NodeOp](../nodeop/) with the appropriate upgrade script and configuration, so you only need to specify the target image and a few options.

## One-off operations and reusing manifests

:::warning Warning
A `NodeOpUpgrade` represents a **single upgrade run** on the target nodes. The operator drives one upgrade flow per object; changing `spec` on an existing resource is **not** a supported way to “start over” or switch to a different upgrade plan. The API **allows** `spec` updates, but behavior after an update is **undefined** from a product perspective—create a **new** `NodeOpUpgrade` for a new run.
:::

### Reusing the same manifest with generateName

To run the same upgrade configuration repeatedly, use **metadata.generateName** instead of **metadata.name** and **kubectl create** (not **apply**) so each run creates a new NodeOpUpgrade. See [NodeOp: One-off operations and reusing manifests](../nodeop/#one-off-operations-and-reusing-manifests) for the same pattern and rationale.

## Basic Example

The following is an example of a "canary upgrade", which upgrades Kairos nodes one-by-one (master nodes first). It will stop upgrading if one of the nodes doesn't complete the upgrade and reboot successfully.

:::warning Legacy flavor example
The image references below show a valid tag format, but these non-Hadron flavor repositories are not actively updated by the Kairos release pipeline anymore. Build and publish your own upgrade image with [BYOI](/docs/reference/byoi/) and [Kairos Factory](/docs/reference/kairos-factory/).
:::

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-upgrade
  namespace: default
spec:
  # The container image containing the new Kairos version
  image: quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-v3.4.2-k3sv1.30.11-k3s1

  # NodeSelector to target specific nodes (optional)
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # Maximum number of nodes that can run the upgrade simultaneously
  # 0 means run on all nodes at once
  concurrency: 1

  # Whether to stop creating new jobs when a job fails
  # Useful for canary deployments
  stopOnFailure: true
```

Only 4 fields is all it takes to safely upgrade the whole cluster.

## Spec Reference

| Field | Type | Default | Description |
|---|---|---|---|
| `image` | `string` | (required) | Container image containing the new Kairos version |
| `imagePullSecrets` | `[]LocalObjectReference` | (none) | Secrets for pulling from private registries ([details](../private-registries/)) |
| `nodeSelector` | `LabelSelector` | (none) | Standard Kubernetes label selector to target specific nodes |
| `concurrency` | `int` | `0` | Max nodes running the upgrade simultaneously (0 = all at once) |
| `stopOnFailure` | `bool` | `false` | Stop creating new jobs when a job fails (canary mode) |
| `upgradeActive` | `bool` | `true` | Whether to upgrade the active partition |
| `upgradeRecovery` | `bool` | `false` | Whether to upgrade the recovery partition |
| `force` | `bool` | `false` | Run the upgrade on every targeted node regardless of whether it is already at `spec.image` (see [Skipping nodes already at the target image](#skipping-nodes-already-at-the-target-image)) |

## Additional Options

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-upgrade
  namespace: default
spec:
  image: quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-v3.4.2-k3sv1.30.11-k3s1

  # ImagePullSecrets for private registries (optional)
  imagePullSecrets:
  - name: private-registry-secret

  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  concurrency: 1
  stopOnFailure: true

  # Whether to upgrade the active partition (defaults to true)
  upgradeActive: true

  # Whether to upgrade the recovery partition (defaults to false)
  upgradeRecovery: false

  # Whether to force the upgrade. When true, the operator skips both the
  # pre-Pod check against the kairos.io/image-repo annotation and the in-Pod
  # version check, running the upgrade on every targeted node.
  force: false
```

To upgrade the "recovery" partition instead of the active one, set `upgradeRecovery: true` and `upgradeActive: false`:

```yaml
spec:
  # ... other fields ...
  upgradeActive: false
  upgradeRecovery: true
```

## Skipping nodes already at the target image

The operator skips scheduling an upgrade Pod on any node that is already running `spec.image`. This is useful for staggered upgrades — for example, running a control-plane-only NodeOpUpgrade first and then a cluster-wide one with the same image: control-plane nodes are detected as already up-to-date and left alone, while worker nodes go through the normal upgrade flow.

The check is purely informational and string-based:

- The Kairos [node-labeler](https://github.com/kairos-io/kairos-operator/tree/main/cmd/node-labeler) reads `KAIROS_IMAGE_REPO` from each node's `/etc/kairos-release` and exposes it as the `kairos.io/image-repo` annotation on the corresponding `Node` object.
- Before creating an upgrade Job for a node, the operator compares that annotation to `spec.image`. If they match exactly, the node is recorded in `status.nodeStatuses` as `Phase: Completed` with a `Skipped: node already at image …` message and no Job is created.
- If the annotation is missing (for example, on a node running an older Kairos that does not write `KAIROS_IMAGE_REPO`, or before the labeler has had a chance to run), the node is **not** skipped and goes through the normal upgrade flow. An in-Pod version check (comparing `KAIROS_VERSION`/`KAIROS_SOFTWARE_VERSION` between the image and the host) remains as a backstop and will still exit early without performing an upgrade if the versions match.
- Because the comparison is a literal string match against `spec.image`, alternative references for the same content (digest pin, mirror alias, different tag pointing at the same digest) will **not** trigger the pre-Pod skip. The in-Pod version check still applies.

Set `spec.force: true` to disable both layers and force the upgrade to run on every targeted node, regardless of the annotation or the in-Pod version check. This is the right escape hatch when you want to re-run an upgrade with the same image but with different upgrade flags.

## How Upgrade Is Performed

Before you attempt an upgrade, it's good to know what to expect. Here is how the process works:

1. The operator is notified about the NodeOpUpgrade resource and creates a NodeOp with the appropriate script and options.
2. The operator creates a list of matching Nodes using the provided label selector. If no selector is provided, all Nodes will match.
3. Nodes whose `kairos.io/image-repo` annotation already matches `spec.image` are marked as `Completed` with a skip message and excluded from the upgrade queue (unless `spec.force: true` — see [Skipping nodes already at the target image](#skipping-nodes-already-at-the-target-image)).
4. The remaining list is sorted with master nodes first, and based on the `concurrency` value, the first batch of Nodes will be upgraded (could be just 1 Node).
5. Before the upgrade Job is created, the operator creates a Pod that will perform the reboot when the Job completes. Then a `Job` is created that performs the upgrade.
6. The Job has one InitContainer, which performs the upgrade and a container which runs only if the upgrade script completes successfully. When the InitContainer exits, the container creates a sentinel file on the host's filesystem which is what the "reboot" Pod waits for, in order to perform the reboot. This way the Job completes successfully before the Node is rebooted. This is important because it prevents the Job from re-creating its Pod after reboot (which would be the case if the Job performed the reboot before it exited gracefully).
7. After the reboot of the Node, the "reboot Pod" will be restarted but it will detect that reboot has already happened (using an annotation on itself that works as a sentinel) and will exit with `0`.
8. If everything worked successfully, the operator will create another Job to replace the one that finished, resulting in `concurrency` number of Nodes being upgraded in parallel.

The result of the above process is that each upgrade Job finishes successfully, with no unnecessary restarts. The upgrade logs can be found in the Job's Pod logs.

The NodeOpUpgrade stores the statuses of the various Jobs it creates so it can be used to monitor the summary of the operation.

## Monitoring

You can monitor the progress of an upgrade:

```bash
$ kubectl get jobs -A
NAMESPACE         NAME                             STATUS     COMPLETIONS   DURATION   AGE
default           kairos-upgrade-localhost-wr26f   Running    0/1           24s        24s

$ kubectl get nodeopupgrades
NAME             AGE
kairos-upgrade   5s
```

## What's next?

- [Upgrading from Kubernetes](/docs/upgrade/kubernetes/) — full upgrade workflow guide
- [Trusted Boot upgrades](/docs/upgrade/trustedboot/) — upgrades with Trusted Boot enabled
- [NodeOp](../nodeop/) — for custom upgrade logic or other operations
- [Bandwidth Optimized Upgrades](/docs/examples/bandwidth-optimized-upgrades/) — optimize bandwidth during upgrades
