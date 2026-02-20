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
