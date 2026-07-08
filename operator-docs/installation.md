---
title: "Installing the Kairos Operator"
linkTitle: "Installation"
weight: 1
date: 2025-07-25
description: Deploy and remove the Kairos operator on your Kubernetes cluster
---

## Deploying the operator

To deploy the operator, you can use kubectl (provided that the `git` command is available):

```bash
# Using GitHub URL
kubectl apply -k https://github.com/kairos-io/kairos-operator/config/default

# Or using local directory (if you have the operator checked out)
kubectl apply -k config/default
```

When the operator starts, it will automatically detect Kairos nodes and label them with `kairos.io/managed: true`. This label can be used to target Kairos nodes specifically in hybrid clusters.

## Removing the operator

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

## Installing via GitOps (ArgoCD)

The operator does not currently publish a Helm chart, so GitOps deployments point directly at the upstream `config/default` kustomize source and let ArgoCD render it. A minimal `Application` looks like:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kairos-operator
  namespace: argocd
  annotations:
    # Sync-wave places the operator ahead of any NodeOpUpgrade / NodeOp / OSArtifact
    # CRs applied from the same app-of-apps root.
    argocd.argoproj.io/sync-wave: "-10"
spec:
  project: default
  source:
    repoURL: https://github.com/kairos-io/kairos-operator.git
    targetRevision: v0.0.7                # pin to a released tag; bump via a PR
    path: config/default
  destination:
    server: https://kubernetes.default.svc
    namespace: kairos-operator
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true               # required — the CRDs exceed the 262 kB annotation size limit of client-side apply
```

Notes:

- `path: config/default` matches the `kubectl apply -k` install above. Both call the same kustomization; ArgoCD just materializes the result.
- `ServerSideApply=true` is required. The operator's CRDs (in particular `OSArtifact`) exceed the 262 kB `last-applied-configuration` annotation limit and fail with `metadata.annotations: Too long` under client-side apply.
- `syncOptions.CreateNamespace=true` lets ArgoCD create `spec.destination.namespace` on first sync. The upstream kustomization creates its own `operator-system` namespace; the value above just gives unscoped resources a home.

### CRD race condition when applying downstream CRs

If you commit a `NodeOpUpgrade` / `NodeOp` / `OSArtifact` CR in the same app-of-apps root as the operator install, ArgoCD's pre-sync dry-run validates each resource against the cluster's discovery cache. On the first bootstrap the operator's CRDs are not yet registered, so the dry-run fails with:

```
the server could not find the requested resource (kind=NodeOpUpgrade)
one or more synchronization tasks are not valid
```

Even with `sync-wave` ordering the operator's `Application` reports "Synced" the moment its manifest lands in Kubernetes — not when the CRDs are actually reconciled. The downstream CR then races ahead and 5× retry-fails.

Two mitigations, use both:

**1. Annotate downstream CRs to defer dry-run** until the CRD appears:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-upgrade
  annotations:
    argocd.argoproj.io/sync-options: SkipDryRunOnMissingResource=true
spec:
  # …
```

**2. Sequence with sync-waves** — put the operator's `Application` at a lower wave than the CRs so ArgoCD attempts the operator install first. A typical layout:

| Wave | Resource |
|---|---|
| `-20` | `Application/kyverno` (Helm chart + `ClusterPolicy` resources) — see [Supply-chain security](supply-chain#bootstrap-ordering-with-argocd) |
| `-10` | `Application/kairos-operator` |
| `0` (default) | `NodeOpUpgrade`, `NodeOp`, `OSArtifact` CRs |

`SkipDryRunOnMissingResource=true` is the actual mechanism that unblocks the sync; sync-wave ordering just reduces how many times ArgoCD retries before the CRD shows up.
