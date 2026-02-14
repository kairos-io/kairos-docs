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

## What's next?

- [Upgrading Kairos with the operator](.././kubernetes)
- [Trusted Boot upgrades](.././trustedboot)
- [Manual upgrades](.././manual)
