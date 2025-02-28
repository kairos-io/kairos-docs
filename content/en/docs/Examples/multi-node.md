---
title: "Multi Node k3s cluster"
linkTitle: "Multi node k3s cluster"
weight: 1
description: This section describe examples on how to deploy Kairos with k3s as a multi-node cluster
---

In the example below we will use a bare metal host to provision a Kairos cluster in the local network with K3s and one master node.

## Installation

Use the standard images which contain `k3s`.

Follow the [Installation]({{< relref "../installation" >}}) documentation, using the following cloud config for the master and worker respectively:

{{< tabpane text=true right=true  >}}
{{% tab header="server" %}}
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
  # Replace with your github user and un-comment the line below:
  # - github:mudler

k3s:
  enabled: true
  args:
  - --disable=traefik,servicelb
```
{{% /tab %}}
{{% tab header="worker" %}}
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

k3s-agent:
  enabled: true
  args:
  - --with-node-id
  env:
   K3S_TOKEN: <MASTER_SERVER_TOKEN>
   K3S_URL: https://<MASTER_SERVER_IP>:6443
```
{{% /tab %}}
{{< /tabpane >}}

After having deployed the master node, you can extract the values for the following variables:

- `K3S_TOKEN` from /var/lib/rancher/k3s/server/node-token
- `K3S_URL` same IP that you use to log into your master node

Since this is a fully manual installation, you are in charge of setting all arguments that your setup will require, by use of the `args` attribute for both the master and server nodes. In this particular case:

- `--disable=traefik,servicelb` will, as you proably guessed it, disable `traefik` and `servicelb` (the default `k3s` load balancer).
- `--with-node-id` will configure the agent to use the node ID to communicate with the master node

To find out more about args configuration from k3s, follow their [server](https://docs.k3s.io/cli/server) and [agent](https://docs.k3s.io/cli/agent) documentation.
