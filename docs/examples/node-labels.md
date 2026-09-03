---
title: "Node labels"
sidebar_label: "Node labels"
description: Set Kubernetes node labels on Kairos nodes with k3s or k0s, either as static values in the cloud config or as per-node values written by a stage.
---

Kubernetes uses node labels to select where a workload runs. Kairos does not
have a dedicated `node-label` configuration key. You set node labels through the
arguments that Kairos passes to the Kubernetes distribution.

This page shows both cases:

- Static labels, which are the same on every node that shares the cloud config.
- Per-node labels, which contain a value that only the node knows at boot, such
  as its machine ID.

## Static labels

Add the label flag to the `args` list of the block that applies to the role of
the node. Kairos joins the list with spaces and passes it to the service.

### k3s

The `k3s` block configures a server. The `k3s-agent` block configures a worker.
Both accept the `--node-label` flag, and you repeat the flag for each label.

```yaml
#cloud-config

k3s:
  enabled: true
  args:
  - --node-label environment=production
  - --node-label rack=a12
```

```yaml
#cloud-config

k3s-agent:
  enabled: true
  args:
  - --node-label environment=production
  - --node-label node-role.kubernetes.io/worker=true
```

### k0s

The `k0s` block configures a controller. The `k0s-worker` block configures a
worker. Both accept the `--labels` flag, which takes a comma-separated list.

```yaml
#cloud-config

k0s-worker:
  enabled: true
  args:
  - --labels=environment=production,rack=a12
```

:::note
In a peer-to-peer cluster, Kairos adds its own arguments, such as `--node-ip`,
and your `args` list comes after them. Set `replace_args: true` in the same
block to drop the Kairos arguments and pass only your list. A node that runs
without `--node-ip` can pick the wrong address, so supply every argument the
node needs.
:::

## Per-node labels

A static list cannot hold a value that differs on each node. To label a node
with a value that the node computes at boot, write a k3s configuration drop-in
from a stage.

Kairos runs the `kairos-agent.bootstrap` stage before it configures and starts
the Kubernetes service. A file that the stage writes is therefore in place when
k3s reads its configuration.

k3s reads every file in `/etc/rancher/k3s/config.yaml.d/`. The `node-label+` key
appends to the labels that k3s already has, instead of replacing them.

```yaml
#cloud-config

k3s:
  enabled: true

stages:
  kairos-agent.bootstrap:
  - name: "Label the node with its machine ID"
    commands:
    - |
      mkdir -p /etc/rancher/k3s/config.yaml.d
      cat > /etc/rancher/k3s/config.yaml.d/99-labels.yaml <<EOF
      node-label+:
      - node.kairos.io/machine-id=$(cat /etc/machine-id)
      EOF
```

For a worker, write the same file and use the `k3s-agent` block.

Label values must follow the [Kubernetes syntax rules for labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set).
A value is 63 characters or fewer, and it accepts alphanumerics, `-`, `_` and
`.`. A machine ID is 32 hexadecimal characters, so it fits.

## Check the labels

Run this command on a node that has joined the cluster:

```bash
kubectl get nodes --show-labels
```

## Labels after the node has joined

The flags on this page apply when the kubelet registers the node. A change to
the cloud config does not relabel a node that is already in the cluster. To
change a label on a running node, use `kubectl label`, or reset the node and let
it register again. For the reset procedure, see [Reset](/docs/reference/reset).

## See also

- [Configuration reference](/docs/reference/configuration) for the full `k3s`,
  `k3s-agent`, `k0s` and `k0s-worker` blocks.
- [Run stages along with K3s](/docs/examples/k3s-stages/) for stages that run
  after k3s is ready.
