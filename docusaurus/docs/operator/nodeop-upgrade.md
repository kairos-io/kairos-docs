---
title: "NodeOpUpgrade"
linkTitle: "NodeOpUpgrade"
weight: 3
date: 2025-07-25
description: Upgrade Kairos nodes using the NodeOpUpgrade custom resource
---

The `NodeOpUpgrade` custom resource is a Kairos-specific resource for upgrading Kairos nodes. Under the hood, it creates a [NodeOp](nodeop) with the appropriate upgrade script and configuration, so you only need to specify the target image and a few options.

## Basic Example

The following is an example of a "canary upgrade", which upgrades Kairos nodes one-by-one (master nodes first). It will stop upgrading if one of the nodes doesn't complete the upgrade and reboot successfully.

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
| `imagePullSecrets` | `[]LocalObjectReference` | (none) | Secrets for pulling from private registries ([details](private-registries)) |
| `nodeSelector` | `LabelSelector` | (none) | Standard Kubernetes label selector to target specific nodes |
| `concurrency` | `int` | `0` | Max nodes running the upgrade simultaneously (0 = all at once) |
| `stopOnFailure` | `bool` | `false` | Stop creating new jobs when a job fails (canary mode) |
| `upgradeActive` | `bool` | `true` | Whether to upgrade the active partition |
| `upgradeRecovery` | `bool` | `false` | Whether to upgrade the recovery partition |
| `force` | `bool` | `false` | Whether to force the upgrade without version checks |

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

  # Whether to force the upgrade without version checks
  force: false
```

To upgrade the "recovery" partition instead of the active one, set `upgradeRecovery: true` and `upgradeActive: false`:

```yaml
spec:
  # ... other fields ...
  upgradeActive: false
  upgradeRecovery: true
```

## How Upgrade Is Performed

Before you attempt an upgrade, it's good to know what to expect. Here is how the process works:

1. The operator is notified about the NodeOpUpgrade resource and creates a NodeOp with the appropriate script and options.
2. The operator creates a list of matching Nodes using the provided label selector. If no selector is provided, all Nodes will match.
3. The list is sorted with master nodes first, and based on the `concurrency` value, the first batch of Nodes will be upgraded (could be just 1 Node).
4. Before the upgrade Job is created, the operator creates a Pod that will perform the reboot when the Job completes. Then a `Job` is created that performs the upgrade.
5. The Job has one InitContainer, which performs the upgrade and a container which runs only if the upgrade script completes successfully. When the InitContainer exits, the container creates a sentinel file on the host's filesystem which is what the "reboot" Pod waits for, in order to perform the reboot. This way the Job completes successfully before the Node is rebooted. This is important because it prevents the Job from re-creating its Pod after reboot (which would be the case if the Job performed the reboot before it exited gracefully).
6. After the reboot of the Node, the "reboot Pod" will be restarted but it will detect that reboot has already happened (using an annotation on itself that works as a sentinel) and will exit with `0`.
7. If everything worked successfully, the operator will create another Job to replace the one that finished, resulting in `concurrency` number of Nodes being upgraded in parallel.

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
- [NodeOp](nodeop) — for custom upgrade logic or other operations
- [Bandwidth Optimized Upgrades](/docs/examples/bandwidth-optimized-upgrades/) — optimize bandwidth during upgrades
