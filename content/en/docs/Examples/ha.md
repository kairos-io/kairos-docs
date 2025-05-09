---
title: "Manual Multi-Node High Availability Cluster"
linkTitle: "Manual multi-node HA cluster"
description: This section contains instructions how to deploy Kairos with a High Available control-plane for K3s 
---

{{% alert title="K3s" color="info" %}}
Please refer to the [k3s HA](https://docs.k3s.io/installation/ha-embedded) documentation. 
{{% /alert %}}

{{% alert title="K0s" color="info" %}}
Please refer to the [k0s multi-node manual install](https://docs.k0sproject.io/stable/k0s-multi-node/) documentation.
{{% /alert %}}

{{% alert title="Production Considerations" color="info" %}}
This example is for learning purposes. In production environments, it's recommended to use a load balancer in front of the highly available control plane nodes rather than exposing all control plane nodes directly. For a production-ready setup with a load balancer, see our [Self-coordinating P2P Multi-Node Cluster with High Availability and KubeVIP]({{< relref "multi-node-p2p-ha-kubevip" >}}) example.
{{% /alert %}}

This document describes how to configure Kairos with either `k3s` or `k0s` by following the same documentation outline. It is implied that you are using a Kairos version with either k3s or k0s included in the standard images.

## New cluster

To run Kairos in this mode, you must have an odd number of server nodes.

The first control plane node that we will launch is considered the cluster initializer.

{{< tabpane text=true right=true  >}}
{{% tab header="k3s" %}}
```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos
  # Change to your pass here
  passwd: kairos
  groups:
  - admin
  #ssh_authorized_keys:
  ## Add your github user here!
  #- github:mudler

k3s:
  enabled: true
  args:
  - --cluster-init
  # Token will be generated if not specified at /var/lib/rancher/k3s/server/node-token
  env:
    K3S_TOKEN: "TOKEN_GOES_HERE"
```
{{% /tab %}}
{{% tab header="k0s" %}}
```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k0s:
  enabled: true
```
{{% /tab %}}
{{< /tabpane >}}

After launching the first control plane, join the others

{{< tabpane text=true right=true  >}}
{{% tab header="k3s" %}}
```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos
  # Change to your pass here
  passwd: kairos
  groups:
  - admin
  ssh_authorized_keys:
  # Add your github user here!
  - github:mudler

k3s:
  enabled: true
  args:
  - --server https://<ip or hostname of server1>:6443
  env:
    K3S_TOKEN: "TOKEN_GOES_HERE"
```
{{% /tab %}}
{{% tab header="k0s" %}}
```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k0s-worker:
  enabled: true
  args:
    - --token-file /etc/k0s/token

write_files:
  - path: /etc/k0s/token
    permissions: 0644
    content: |
      <TOKEN> # generate it on your cluster init node by running `k0s token create --role=controller`
```
{{% /tab %}}
{{< /tabpane >}}

Now you have a highly available control plane.

### Joining a worker

Joining additional worker nodes to the cluster follows the same procedure as a single-node cluster.

{{< tabpane text=true right=true  >}}
{{% tab header="k3s" %}}
```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos
  # Change to your pass here
  passwd: kairos
  groups:
  - admin
  #ssh_authorized_keys:
  ## Add your github user here!
  #- github:mudler

k3s-agent:
  enabled: true
  env:
    K3S_TOKEN: "TOKEN_GOES_HERE"
    K3S_URL: "https://<ip or hostname of server1>:6443"
```
{{% /tab %}}
{{% tab header="k0s" %}}
```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k0s-worker:
  enabled: true
  args:
    - --token-file /etc/k0s/token

write_files:
  - path: /etc/k0s/token
    permissions: 0644
    content: |
      <TOKEN> # generate it on your master node by running `k0s token create --role=worker`
```
{{% /tab %}}
{{< /tabpane >}}

## External DB

{{% alert title="K0s" color="warning" %}}
This section hasn't been reworked to be used with the k0s distribution yet.
{{% /alert %}}

K3s requires two or more server nodes for this HA configuration. See the [K3s requirements guide](https://docs.k3s.io/installation/requirements) for minimum machine requirements.

When running the k3s as a server, you must set the datastore-endpoint parameter so that K3s knows how to connect to the external datastore. 

```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos
  # Change to your pass here
  passwd: kairos
  groups:
  - admin
  #ssh_authorized_keys:
  ## Add your github user here!
  #- github:mudler

k3s:
  enabled: true
  args:
  - --datastore-endpoint mysql://username:password@tcp(hostname:3306)/database-name
  # Token will be generated if not specified at /var/lib/rancher/k3s/server/node-token
  env:
    K3S_TOKEN: "TOKEN_GOES_HERE"
```
## Resources

- [High Availability with Embedded DB](https://docs.k3s.io/installation/ha-embedded)
- [High Availability with External DB](https://docs.k3s.io/installation/ha)
