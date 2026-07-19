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
  --set leaderElect=true \
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
