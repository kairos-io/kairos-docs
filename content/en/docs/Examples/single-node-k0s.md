---
title: "Single Node k0s cluster"
linkTitle: "Single node k0s cluster"
weight: 1
description: This section describe examples on how to deploy Kairos with k0s as a single-node cluster
---

In the example below we will use a bare metal host to provision a Kairos node in the local network with K0s.

## Installation

Use the standard images which contain `k0s`.

Follow the [Installation]({{< relref "../installation/" >}}) documentation, using the following cloud config:

```yaml
#cloud-config

install:
    device: auto
    poweroff: false
    reboot: true
k0s:
    args:
        - --single
    enabled: true
users:
- name: kairos
  passwd: kairos
  groups:
    - admin
write_files:
- path: /var/lib/k0s/manifests/my-nginx/my-nginx.yaml
  permissions: "0644"
  content: |
    apiVersion: v1
    kind: Namespace
    metadata:
      name: nginx
    ---
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: nginx-deployment
      namespace: nginx
    spec:
      selector:
        matchLabels:
          app: nginx
      replicas: 3
      template:
        metadata:
          labels:
            app: nginx
        spec:
          containers:
          - name: nginx
            image: nginx:latest
            ports:
            - containerPort: 80
```

### Explanation of the cloud-config 

- Creates a user `kairos` with password `kairos` and add it to the `admin` group so we can access the node with SSH
- Enables `k0s` installation
- Writes a Kubernetes manifest to deploy a simple Nginx deployment and service. There might be better deployments of Nginx, but this is just an example. The manifest is written to `/var/lib/k0s/manifests/my-nginx/my-nginx.yaml` so it will be applied by K0s automatically. See [docs]({{< relref "../reference/configuration#kubernetes-manifests" >}}) for more information.
