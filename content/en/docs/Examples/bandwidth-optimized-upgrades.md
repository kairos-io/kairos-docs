---
title: "Bandwidth Optimized Upgrades"
linkTitle: "Bandwidth Optimized Upgrades"
description: This section describes how to optimize bandwidth usage during OS upgrades using distributed caching solutions.
---

{{% alert title="Info" color="info" %}}
This tutorial demonstrates how to optimize bandwidth usage during OS upgrades using distributed caching solutions like embedded registries.
{{% /alert %}}

# Introduction

Nodes in edge clusters often have poor networking capabilities, and Kairos users may create custom images that are significantly larger (e.g., by including many kernel drivers). The current issue is that during upgrades, each node in the cluster must re-download the entire image from scratch before applying the upgrade.

This documentation explores solutions to optimize bandwidth usage during upgrades by implementing distributed caching mechanisms.

# Problem Statement

- **Large Images**: Custom images can be very large due to additional drivers, tools, or configurations
- **Poor Network**: Edge nodes often have limited or unreliable network connectivity
- **Redundant Downloads**: Each node downloads the same upgrade image independently
- **Bandwidth Waste**: Multiple nodes downloading identical images consumes unnecessary bandwidth

# Solutions

## K3s with Embedded Registry (Spegel)

K3s integrates with [Spegel](https://github.com/k3s-io/spegel), a distributed registry that enables efficient image caching across your cluster. This integration allows nodes to share container images locally, reducing bandwidth usage and improving deployment speed.

{{% alert title="Info" color="info" %}}
For detailed information about k3s embedded registry configuration, see the [official k3s documentation](https://docs.k3s.io/installation/registry-mirror).
{{% /alert %}}

### Manual Setup

#### Master Node Configuration

```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group

install:
  reboot: true

k3s:
  enabled: true
  embedded_registry: true

stages:
  boot:
    - name: "Add registries configuration for k3s/spegel"
      files:
        - path: /etc/rancher/k3s/registries.yaml
          content: |
            mirrors:
              "*":
```

#### Worker Node Configuration

```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group

k3s-agent: # Warning: the key is different from the master node one
  enabled: true
  args:
    - --with-node-id # will configure the agent to use the node ID to communicate with the master node
  env:
    K3S_TOKEN: "YOUR_K3S_TOKEN_HERE" # Replace with the actual token from your master node
    K3S_URL: https://YOUR_MASTER_NODE_IP:6443 # Replace with your master node's IP address

stages:
  boot:
    - name: "Add registries configuration for k3s/spegel"
      files:
        - path: /etc/rancher/k3s/registries.yaml
          content: |
            mirrors:
              "*":
```

**Important Notes:**
- Replace `YOUR_K3S_TOKEN_HERE` with the actual token from your master node
- Replace `YOUR_MASTER_NODE_IP` with your master node's IP address
- The `embedded_registry: true` setting enables Spegel integration

### Auto Configuration

For automated cluster setup with P2P coordination:

```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group

k3s:
  embedded_registry: true

p2p:
  # Disabling DHT makes co-ordination to discover nodes only in the local network
  disable_dht: true #Enabled by default

  # network_token is the shared secret used by the nodes to co-ordinate with p2p.
  # Setting a network token implies auto.enable = true.
  # To disable, just set auto.enable = false
  network_token: "YOUR_P2P_NETWORK_TOKEN_HERE" # Replace with your P2P network token

stages:
  boot:
    - name: "Add registries configuration for k3s/spegel"
      files:
        - path: /etc/rancher/k3s/registries.yaml
          content: |
            mirrors:
              "*":
```

### Upgrade Process with Distributed Caching

When performing upgrades, the embedded registry provides significant benefits:

1. **Master Node First**: The upgrade starts on the master node, which pulls the upgrade image
2. **Distributed Caching**: The image is cached in the embedded registry
3. **Worker Nodes**: When worker nodes start their upgrade, they fetch the image from the local registry instead of pulling from remote

#### Upgrade Configuration

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-upgrade
  namespace: default
spec:
  # The container image containing the new Kairos version
  image: quay.io/kairos/opensuse:tumbleweed-latest-standard-amd64-generic-v3.5.0-k3s-v1.33.2-k3s1

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

#### Upgrade Process Flow

1. **Master Node Upgrade**: The master node pulls the upgrade image from the remote registry
2. **Registry Caching**: The image is automatically cached in the embedded Spegel registry
3. **Worker Node Upgrades**: Worker nodes fetch the image from the local registry, avoiding duplicate downloads
4. **Bandwidth Efficiency**: Only one node downloads the image from remote, others use the local cache

## Future Solutions

{{% alert title="Coming Soon" color="warning" %}}
Additional bandwidth optimization solutions are being explored and will be documented here as they become available.
{{% /alert %}}

### Planned Solutions

- **Standalone Spegel Deployment**: Using the Helm chart to deploy Spegel independently of k3s
- **Local OCI Registry Service**: A service to pull upgrade images and serve them as a local OCI registry
- **Cluster Cache**: A cache for the cluster for pulling images remotely
- **Alternative Solutions**: Integration with [Kraken](https://github.com/uber/kraken) or [Dragonfly](https://github.com/dragonflyoss/dragonfly)

# Related Documentation

- [K3s Stages]({{< ref "k3s-stages.md" >}}) - Running stages with k3s
- [Multi-node Setup]({{< ref "multi-node.md" >}}) - Setting up multi-node clusters
- [P2P Examples]({{< ref "single-node-p2p.md" >}}) - P2P coordination examples 