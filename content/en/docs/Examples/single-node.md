---
title: "Single Node k3s cluster"
linkTitle: "Single node k3s cluster"
weight: 1
description: This section describe examples on how to deploy Kairos with k3s as a single-node cluster
---

In the example below we will use a bare metal host to provision a Kairos node in the local network with K3s.

## Installation

Use the standard images which contain `k3s`.

Follow the [Installation]({{< relref "../installation/" >}}) documentation, and use the following cloud config file with Kairos:

```yaml
#cloud-config

hostname: metal-{{ trunc 4 .MachineID }}
users:
- name: kairos
  # Change to your pass here
  passwd: kairos
  ssh_authorized_keys:
  # Replace with your github user and un-comment the line below:
  # - github:mudler

k3s:
  enabled: true
  args:
  - --node-label "nodetype=small"

write_files:
- path: /var/lib/rancher/k3s/server/manifests/myapp.yaml
  permissions: "0644"
  content: |
    apiVersion: v1
    kind: Namespace
    metadata:
      name: myapp
    ---
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: foobar
      namespace: myapp
    data:
      foo: bar
```

Notably:

- We use the `k3s` block to set the node label
- In a single-node setup, you may wish to use a non-generated node name. This can be achieved with these options:
  ```
  k3s:
    enabled: true
    replace_args: true
    args:
    - --node-name=my-node
  ```
  {{% alert title="Note" %}}
  `replace_args` replaces all arguments otherwise passed to k3s by Kairos with those supplied here. Make sure you pass all the arguments you need.
  {{% /alert %}}
- We use `write_files` to write manifests to the default `k3s` manifest directory (`/var/lib/rancher/k3s/server/manifests/`) see [docs]({{< relref "../reference/configuration#kubernetes-manifests" >}}) to create a Namespace and ConfigMap.
