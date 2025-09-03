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

{{% alert title="Note" color="info" %}}
This documentation covers bandwidth optimization solutions for Kairos images that include a Kubernetes distribution (K3s, K0s, or kubeadm via provider-kubeadm).
{{% /alert %}}

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

## K0s with Spegel

K0s can be configured with Spegel for distributed image caching, following the [official Spegel documentation for k0s](https://spegel.dev/docs/getting-started/#k0s). This setup requires specific containerd configuration that must be explicitly created in the cloud-config.

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

k0s:
  enabled: true
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

k0s-worker:
  enabled: true
  args:
    - --token-file /etc/k0s/token

write_files:
  - path: /etc/k0s/token
    permissions: 0644
    content: |
      <TOKEN> # generate it on your master node by running `k0s token create --role=worker`
  - path: /etc/k0s/containerd.d/spegel.toml
    permissions: 0644
    content: |
      [plugins."io.containerd.grpc.v1.cri".registry]
        config_path = "/etc/containerd/certs.d"
      [plugins."io.containerd.grpc.v1.cri".containerd]
        discard_unpacked_layers = false
```

**Important Notes:**
- Replace `<TOKEN>` with the actual token from your master node (generate it by running `k0s token create --role=worker`)
- The containerd configuration file `/etc/k0s/containerd.d/spegel.toml` must be explicitly created to enable Spegel compatibility
- This configuration follows the [official Spegel k0s documentation](https://spegel.dev/docs/getting-started/#k0s)

### Installing Spegel

After your k0s cluster is running, install Spegel using the Helm chart with k0s-specific paths:

```bash
helm upgrade --create-namespace --namespace spegel --install spegel oci://ghcr.io/spegel-org/helm-charts/spegel \
  --set spegel.containerdSock=/run/k0s/containerd.sock \
  --set spegel.containerdContentPath=/var/lib/k0s/containerd/io.containerd.content.v1.content
```

### Upgrade Process

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-upgrade
  namespace: default
spec:
  # The container image containing the new Kairos version
  image: quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-v3.5.0-k0s-v1.33.3-k0s.0

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

1. **First Node Upgrade**: The first node pulls the upgrade image from the remote registry
2. **Spegel Caching**: The image is automatically cached in the Spegel distributed registry
3. **Subsequent Node Upgrades**: When the second and subsequent nodes start their upgrade, they fetch the image from the local Spegel registry instead of pulling from remote
4. **Bandwidth Efficiency**: Only the first node downloads the image from remote, others use the local cache

## Provider-kubeadm with Spegel

Provider-kubeadm enables Kairos to use kubeadm for Kubernetes cluster management. With Spegel integration, you can achieve bandwidth-optimized upgrades by leveraging distributed image caching across your kubeadm-managed cluster.

{{% alert title="Prerequisites" color="warning" %}}
To use provider-kubeadm with Spegel, you need:
- A custom Kairos image built with provider-kubeadm ([build instructions](https://github.com/kairos-io/provider-kubeadm#building-custom-image))
- Kubernetes version compatibility between your image and configuration
- Containerd runtime configured for Spegel integration
{{% /alert %}}

### Configuration Examples

For complete, up-to-date configuration examples, refer to the [provider-kubeadm repository](https://github.com/kairos-io/provider-kubeadm) where you'll find two example configurations at the root. The examples include:

- Master node configuration with containerd setup for Spegel
- Worker node configuration with proper registry mirroring
- Spegel deployment manifests
- Upgrade procedures with bandwidth optimization

### Key Configuration Components

The provider-kubeadm Spegel integration requires specific containerd configuration:

```yaml
#cloud-config

# Essential containerd configuration for Spegel
stages:
  initramfs:
    - name: "Setup containerd for Spegel"
      files:
        - path: /etc/containerd/config.toml
          content: |
            version = 2
            
            [plugins."io.containerd.grpc.v1.cri".registry]
              config_path = "/etc/containerd/certs.d"
            [plugins."io.containerd.grpc.v1.cri".containerd]
              discard_unpacked_layers = false
```

### Spegel Deployment

After your kubeadm cluster is running, deploy Spegel:

```bash
# Install Spegel using the Helm chart
helm install --create-namespace --namespace spegel spegel oci://ghcr.io/spegel-org/helm-charts/spegel   --set spegel.containerdSock=/run/containerd/containerd.sock   --set spegel.containerdContentPath=/opt/containerd/io.containerd.content.v1.content   --set spegel.containerdRegistryConfigPath=/etc/containerd/certs.d
```

### Upgrade Process with Provider-kubeadm

The upgrade process follows the same bandwidth-efficient pattern:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-kubeadm-upgrade
  namespace: default
spec:
  # Custom Kairos image with provider-kubeadm
  image: your-registry/kairos-kubeadm:v1.32.0-latest

  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # Sequential upgrades to maximize cache utilization
  concurrency: 1
  stopOnFailure: true
```

#### Upgrade Process Flow

1. **First Node Upgrade**: Downloads the upgrade image from the remote registry
2. **Spegel Caching**: The image is cached in the Spegel distributed registry
3. **Subsequent Nodes**: Fetch the image from the local Spegel cache
4. **Bandwidth Savings**: Only one download from remote, all others use local cache

If you need to verify that spegel is working, you can also check the upstream Spegel documenteation here: https://spegel.dev/docs/faq/#how-do-i-know-that-spegel-is-working

### Important Considerations

- **Image Compatibility**: Ensure your custom provider-kubeadm image includes the correct Kubernetes version that matches your `kubernetesVersion` configuration
- **Containerd Configuration**: The containerd setup is critical for Spegel functionality with provider-kubeadm
- **Network Policies**: Ensure Spegel can communicate between nodes (typically requires port 5001)

For the most current examples and detailed configurations, always refer to the [provider-kubeadm repository](https://github.com/kairos-io/provider-kubeadm) which contains tested configurations updated for the latest versions.

# Related Documentation

- [K3s Stages]({{< ref "k3s-stages.md" >}}) - Running stages with k3s
- [Multi-node Setup]({{< ref "multi-node.md" >}}) - Setting up multi-node clusters
- [P2P Examples]({{< ref "single-node-p2p.md" >}}) - P2P coordination examples
- [Provider-kubeadm Repository](https://github.com/kairos-io/provider-kubeadm) - Complete examples and build instructions
- [Spegel Documentation](https://spegel.dev) - Official Spegel distributed registry documentation 