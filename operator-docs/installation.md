---
title: "Installing the Kairos Operator"
linkTitle: "Installation"
weight: 1
date: 2025-07-25
description: Deploy and remove the Kairos operator on your Kubernetes cluster
---

## Helm (recommended)

The operator publishes a Helm chart on each release via GitHub Pages and the GHCR OCI registry.

### From the Helm repository

```bash
helm repo add kairos-operator https://kairos-io.github.io/kairos-operator/charts
helm repo update
helm install kairos-operator kairos-operator/kairos-operator \
  --namespace kairos-operator --create-namespace
```

### From the OCI registry

```bash
helm install kairos-operator \
  oci://ghcr.io/kairos-io/helm-charts/kairos-operator \
  --version 0.1.0 \
  --namespace kairos-operator --create-namespace
```

### Key values

| Value | Default | Description |
|-------|---------|-------------|
| `image.operator.tag` | Chart `appVersion` | Operator image tag |
| `image.nodeLabeler.tag` | Chart `appVersion` | Node-labeler image tag |
| `leaderElect` | `true` | Disable for single-replica dev installs |
| `toolImage` | *(built-in)* | Override `auroraboot` image — useful for air-gapped environments |
| `buildahImage` | *(built-in)* | Override `buildah` image — useful for air-gapped environments |
| `sentinelImage` | *(built-in)* | Image for the reboot sentinel container (NodeOp `rebootOnSuccess` flow). Only needs `sh` + `tee`; defaults to `NodeOp.spec.image`, then `busybox:latest`. Override for air-gapped environments. |
| `nodeops.defaultImage` | `busybox:latest` | Fallback image for NodeOp Jobs |
| `tolerations` | control-plane + etcd | Scheduling tolerations for the operator Deployment |

```bash
helm install kairos-operator kairos-operator/kairos-operator \
  --namespace kairos-operator --create-namespace \
  --set leaderElect=false \
  --set toolImage=my-registry.example.com/auroraboot:v0.24.0 \
  --set sentinelImage=my-registry.example.com/busybox:latest
```

### Upgrading

```bash
helm repo update
helm upgrade kairos-operator kairos-operator/kairos-operator \
  --namespace kairos-operator --reuse-values
```

:::note
CRDs are placed in the `crds/` directory of the chart. Helm installs them on first install but **never upgrades or deletes them** on `helm upgrade` or `helm uninstall`. To upgrade CRDs, apply them manually:

```bash
kubectl apply -f https://github.com/kairos-io/kairos-operator/releases/latest/download/install.yaml
```
:::

### Removing

```bash
helm uninstall kairos-operator --namespace kairos-operator
```

CRDs survive uninstall by design. To remove them completely:

```bash
kubectl delete crd \
  osartifacts.build.kairos.io \
  nodeops.operator.kairos.io \
  nodeopupgrades.operator.kairos.io
```

---

## Kustomize / plain kubectl

Each release publishes a pre-built `install.yaml` as a GitHub Release asset:

```bash
# Latest release
kubectl apply -f https://github.com/kairos-io/kairos-operator/releases/latest/download/install.yaml

# Pin to a specific version
kubectl apply -f https://github.com/kairos-io/kairos-operator/releases/download/v0.1.0/install.yaml
```

Alternatively, render from source using Kustomize directly (requires `git`):

```bash
kubectl apply -k https://github.com/kairos-io/kairos-operator/config/default
```

When the operator starts, it will automatically detect Kairos nodes and label them with `kairos.io/managed: true`. This label can be used to target Kairos nodes specifically in hybrid clusters.

### Removing

```bash
kubectl delete -f https://github.com/kairos-io/kairos-operator/releases/latest/download/install.yaml
```

---

## Installing via Bundle

You can also install the Kairos Operator using a bundle by adding the following configuration to your cloud-config file:

```yaml
bundles:
  - targets:
      - run://quay.io/kairos/community-bundles:kairos-operator_latest
```

This will automatically deploy the operator during the node initialization process.

### Removing the Bundle Installation

To remove the operator installed via bundle, delete the `kairos-operator.yaml` file from the appropriate location:

- **k0s**: `/var/lib/k0s/manifests/kairos-operator/`
- **k3s**: `/var/lib/rancher/k3s/server/manifests/`

## Installing via GitOps (ArgoCD)

A minimal `Application` pointing at the upstream `config/default` kustomize source:

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
| `-20` | `Application/kyverno` (Helm chart + `ClusterPolicy` resources) — see [Supply-chain security](../supply-chain#bootstrap-ordering-with-argocd) |
| `-10` | `Application/kairos-operator` |
| `0` (default) | `NodeOpUpgrade`, `NodeOp`, `OSArtifact` CRs |

`SkipDryRunOnMissingResource=true` is the actual mechanism that unblocks the sync; sync-wave ordering just reduces how many times ArgoCD retries before the CRD shows up.

## Installing via GitOps (Flux)

Flux splits install into a **source** CR (where to pull from) and a **reconciler** CR (how to apply it). Two approaches are supported.

### Option A — HelmRelease (recommended)

:::note
The Helm chart was added in [kairos-operator#137](https://github.com/kairos-io/kairos-operator/pull/137) and will be published to GHCR starting from **v0.1.4**. If you are pinning to an earlier release, use Option B instead.
:::

Uses the OCI Helm chart published on each release to GHCR:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: kairos-operator
  namespace: flux-system
spec:
  interval: 12h
  url: oci://ghcr.io/kairos-io/helm-charts/kairos-operator
  ref:
    tag: "0.1.0"          # pin to a release; bump via Renovate or PR
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kairos-operator
  namespace: flux-system
spec:
  interval: 12h
  chartRef:
    kind: OCIRepository
    name: kairos-operator
    namespace: flux-system
  targetNamespace: kairos-operator
  install:
    createNamespace: true
```

### Option B — Kustomization (same source as `kubectl apply -k`)

Points at the upstream `config/default` kustomization directly — equivalent to `kubectl apply -k config/default`, but kept reconciled by Flux:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: kairos-operator
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/kairos-io/kairos-operator
  ref:
    tag: v0.1.0          # pin to a release; bump via Renovate or PR
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kairos-operator
  namespace: flux-system
spec:
  interval: 12h
  path: ./config/default
  prune: true
  sourceRef:
    kind: GitRepository
    name: kairos-operator
  targetNamespace: kairos-operator
```

### CRD race condition when applying downstream CRs

Flux retries `NotFound` errors automatically on each `retryInterval` (default: 30s), so no annotation equivalent to ArgoCD's `SkipDryRunOnMissingResource` is needed. For explicit sequencing, use `dependsOn` on the `Kustomization` or `HelmRelease` that contains your downstream CRs:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kairos-upgrades       # contains your NodeOpUpgrade / NodeOp / OSArtifact CRs
  namespace: flux-system
spec:
  dependsOn:
    - name: kairos-operator   # waits until kairos-operator Kustomization is Ready
  path: ./upgrades
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-gitops-repo
```

## Next step

The operator handles reconciliation of custom resources but does not provide a web UI. If you want a browser-accessible dashboard for kicking off builds, enrolling nodes, and driving fleet operations, see [Installing AuroraBoot alongside the operator](../auroraboot-helm/) to deploy the AuroraBoot web UI into the same cluster.
