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

### GitOps alternative: static-name bump with a versioned suffix

`generateName` + `kubectl create` is an imperative workflow — the CR name is unknown ahead of time and the run doesn't live in git. In a GitOps setup (ArgoCD / Flux / etc.) both properties are inverted: every resource has a known static name that git owns, and drift-detection expects the same name to describe the same object across reconciliations.

The GitOps equivalent of "new run = new object" is to make the **version part of the name**, and bump the name and the image reference in the same commit. Each merged commit produces a new named resource, which the operator treats as a new one-shot run. Same semantic guarantee as `generateName`, but declarative and reviewable.

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
# The version fragment in the name is REQUIRED. Same name across two commits
# would look like a spec update to the operator (behavior undefined per the
# warning above). Bumping the name makes the new commit a new object.
metadata:
  name: kairos-upgrade-v3-4-2                     # <-- bumped alongside spec.image
  namespace: default
spec:
  image: quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-v3.4.2-k3sv1.30.11-k3s1
  concurrency: 1
  stopOnFailure: true
```

Bumping the name by hand at every release defeats the point of GitOps. A dependency-update bot (Renovate, dependabot, etc.) can watch the image tag and open a PR that rewrites **both** the `image:` line and the version fragment in `metadata.name:`.

For [Renovate](https://docs.renovatebot.com/), a custom regex manager targeting a composite tag (Kairos + k8s version) looks like:

```json
{
  "customManagers": [
    {
      "customType": "regex",
      "fileMatch": ["^upgrades/.*\\.ya?ml$"],
      "matchStrings": [
        "image:\\s+quay\\.io/kairos/hadron:(?<currentValue>v\\d+\\.\\d+\\.\\d+-standard-(?:amd64|arm64)-generic-v\\d+\\.\\d+\\.\\d+-k3s-v\\d+\\.\\d+\\.\\d+-k3s1)"
      ],
      "datasourceTemplate": "docker",
      "depNameTemplate": "quay.io/kairos/hadron",
      "versioningTemplate": "regex:^v(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)-standard-(?:amd64|arm64)-generic-v\\d+\\.\\d+\\.\\d+-k3s-v\\d+\\.\\d+\\.\\d+-k3s1$"
    },
    {
      "customType": "regex",
      "fileMatch": ["^upgrades/.*\\.ya?ml$"],
      "matchStrings": [
        "name:\\s+hadron-(?<cluster>[a-z]+)-v(?<major>\\d+)-(?<minor>\\d+)-(?<patch>\\d+)"
      ],
      "currentValueTemplate": "v{{{major}}}.{{{minor}}}.{{{patch}}}",
      "autoReplaceStringTemplate": "name: hadron-{{{cluster}}}-v{{{newMajor}}}-{{{newMinor}}}-{{{newPatch}}}",
      "datasourceTemplate": "docker",
      "depNameTemplate": "quay.io/kairos/hadron",
      "versioningTemplate": "regex:^v(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)-standard-(?:amd64|arm64)-generic-v\\d+\\.\\d+\\.\\d+-k3s-v\\d+\\.\\d+\\.\\d+-k3s1$"
    }
  ],
  "packageRules": [
    {
      "matchPackageNames": ["quay.io/kairos/hadron"],
      "allowedVersions": "/.*-k3s-v1\\.35\\.\\d+-k3s1$/",
      "minimumReleaseAge": "24 hours",
      "automerge": false
    }
  ]
}
```

Three things to note:

- `allowedVersions` clamps updates to a single k3s minor line. This prevents a Renovate PR from silently proposing a k3s minor bump alongside a Kairos patch bump. To cross a k3s minor, edit the regex in a separate PR — forces an explicit decision.
- The second custom manager handles `metadata.name`. `currentValueTemplate` converts the dash-format slug (`v0-3-0` → `v0.3.0`) so Renovate can compare it against the docker datasource. `autoReplaceStringTemplate` writes the new version back in dash-format. Both managers share the same `depNameTemplate`, so Renovate updates `spec.image` and `metadata.name` atomically in one PR.
- **Do not use `extractVersionTemplate`** to parse the dash-format in `metadata.name` — it is not a valid field for Renovate custom managers and is silently ignored. The result is that `spec.image` gets bumped but `metadata.name` stays at the old version, so the operator sees no new CR and does nothing.

The pattern is not superior to `generateName` — it's a different tradeoff. Pick `generateName` when you drive upgrades from a CLI or CI job. Pick static-name bump when the desired state lives in git and every change goes through a merged PR.

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
| `force` | `bool` | `false` | When true, run the upgrade on every targeted node regardless of whether it is already at `spec.image`. Disables the preflight skip — see [Skipping no-op upgrades](#skipping-no-op-upgrades). |
| `debug` | `bool` | `false` | Run `kairos-agent` with the global `--debug` flag for verbose upgrade output. See [Debugging upgrades](#debugging-upgrades). |
| `uncordonOnFailure` | `bool` | `false` | Uncordon a node if its upgrade fails, instead of leaving it unschedulable. Passed through to the underlying NodeOp. See [Recovering nodes after a failed upgrade](#recovering-nodes-after-a-failed-upgrade). |

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

  # Whether to force the upgrade. When true, the controller skips the
  # preflight version check and runs the upgrade on every targeted node
  # even if it is already at spec.image. See "Skipping no-op upgrades" below.
  force: false

  # Run kairos-agent with --debug for verbose upgrade output (defaults to false)
  debug: false

  # Uncordon a node if its upgrade fails (defaults to false)
  uncordonOnFailure: false
```

To upgrade the "recovery" partition instead of the active one, set `upgradeRecovery: true` and `upgradeActive: false`:

```yaml
spec:
  # ... other fields ...
  upgradeActive: false
  upgradeRecovery: true
```

## Skipping no-op upgrades

By default, NodeOpUpgrade avoids cordoning, draining, and rebooting nodes that are already running the requested `spec.image`. This is useful for staggered rollouts — for example, upgrading just the control plane first and then a cluster-wide `NodeOpUpgrade` with the same image: control-plane nodes are detected as already up-to-date and left alone, while worker nodes go through the normal flow.

This works by leveraging the generic [NodeOp preflight mechanism](../nodeop/#preflight-checks). When the NodeOpUpgrade controller creates the underlying NodeOp, it populates `spec.preflight` with a short script that:

1. Runs in the **upgrade image** (the one you set in `spec.image`), so the script can read the target `/etc/kairos-release` directly from inside that image without pulling anything else.
2. Mounts the host's `/etc` read-only at `/host/etc`, so the same script can also read the **currently installed** `/etc/kairos-release` on the node.
3. Computes the version triple — `${KAIROS_VERSION}-${KAIROS_SOFTWARE_VERSION_PREFIX}${KAIROS_SOFTWARE_VERSION}` — from each side and compares them.
4. If both versions are known and equal, writes the skip reason to `/dev/termination-log` (e.g. `node is already at v4.0.3-k3sv1.32.4-k3s1`).
5. If versions differ, can't be determined, or anything else, exits 0 silently → the controller proceeds with the normal cordon → drain → upgrade Job → reboot flow on that node.

The controller honors the preflight verdict by **not creating a Job, not cordoning, and not rebooting** any node the preflight skipped. The node's entry in `status.nodeStatuses` is marked `Completed` with the skip reason from `/dev/termination-log`, and the per-node concurrency slot is freed immediately for the next node.

### When the skip kicks in (and when it doesn't)

The preflight comparison runs the script against the **actual `/etc/kairos-release` contents on both sides**, so it's reliable across:

- **Image mirrors / re-tags.** It doesn't matter that you mirror `quay.io/kairos/fedora:0.7.1` to your own registry; the script reads the file contents, not the image reference.
- **Nodes that were bootstrapped from a particular image** (you didn't have to install via the operator first).

It won't fire when:

- **The image has been rebuilt with the same `KAIROS_VERSION` values but different content** (e.g. a CI re-run with the same tag but a different commit). Version-triple equality is the only signal the script uses; if the metadata is the same, the script will mark the node as already up-to-date. Use `spec.force: true` to override.
- **The host's `/etc/kairos-release` is missing or doesn't carry `KAIROS_VERSION`.** The script treats either side as "unknown" and falls through to "proceed" rather than wrongly skip — the in-Pod upgrade flow then runs and the user will see whatever it reports.

### Forcing the upgrade

Set `spec.force: true` to disable the preflight entirely. The controller creates the NodeOp without `spec.preflight`, so every targeted node goes straight through cordon → drain → upgrade Job → reboot, regardless of what version is already installed. Use this when you want to re-run an upgrade with the same image but different flags, or to recover from a previous run that ended in a weird state.

## Debugging upgrades

When an upgrade fails and the Job logs don't explain why, set `spec.debug: true`. The controller then runs `kairos-agent` with its global `--debug` flag, so the upgrade Job produces verbose output. Because `--debug` is a global flag, it is placed before the `upgrade` subcommand in the generated script (`kairos-agent --debug upgrade ...`).

```yaml
spec:
  # ... other fields ...
  debug: true
```

## Recovering nodes after a failed upgrade

When an upgrade fails, the affected node stays cordoned (unschedulable) by default so you can inspect it. On a cluster with a single control plane node this can leave the control plane unschedulable until you intervene manually.

Set `spec.uncordonOnFailure: true` to have the operator uncordon a node whose upgrade failed, returning it to a schedulable state automatically. The value is passed through to the underlying NodeOp, and the operator only uncordons nodes it cordoned itself. Kairos applies upgrades to a separate partition, so a failed upgrade generally leaves the running system intact and safe to schedule again.

```yaml
spec:
  # ... other fields ...
  uncordonOnFailure: true
```

## How Upgrade Is Performed

Before you attempt an upgrade, it's good to know what to expect. Here is how the process works:

1. The operator is notified about the NodeOpUpgrade resource and creates a NodeOp with the appropriate script, options, and (unless `spec.force` is `true`) a `spec.preflight` that compares the image's `/etc/kairos-release` against the host's.
2. The NodeOp controller lists matching Nodes using the provided label selector. If no selector is provided, all Nodes will match.
3. The list is sorted with master nodes first, and based on the `concurrency` value, the first batch of Nodes will be processed (could be just 1 Node).
4. For each targeted node, the controller first runs a **preflight Pod** on that node — a short-lived, non-disruptive Pod (no cordon, no drain) using the upgrade image. The preflight script writes a skip reason to `/dev/termination-log` when the node is already at the target version, or stays silent otherwise. See [Skipping no-op upgrades](#skipping-no-op-upgrades).
5. **If preflight says skip**, the node is recorded as `Completed` with the skip reason and the controller moves on to the next node. No cordon, no drain, no reboot for that node.
6. **If preflight says proceed**, the controller creates a reboot Pod and then the upgrade Job (the Job's InitContainer performs the upgrade and the main container creates a sentinel file once it succeeds, which the reboot Pod is watching for).
7. When the InitContainer exits successfully, the sentinel file appears; the reboot Pod patches itself with a completion annotation and reboots the node via `nsenter`. This way the Job completes successfully before the Node is rebooted, preventing the Job from re-creating its Pod after reboot.
8. After reboot, the "reboot Pod" is restarted but detects via its own annotation that reboot already happened and exits with `0`.
9. If everything worked successfully, the operator advances to the next batch of nodes, respecting `concurrency` and `stopOnFailure`.

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
