---
title: "Multi Node k0s cluster"
linkTitle: "Multi node k0s cluster"
weight: 1
description: This section describe examples on how to deploy Kairos with k0s as a multi-node cluster
---

In the example below we will use a bare metal host to provision a Kairos cluster in the local network with K0s and one master node.

## Installation

Use the standard images which contain `k0s`.

Follow the [Installation]({{< relref "../installation" >}}) documentation, using the following cloud config for the controller

```yaml
#cloud-config

users:
- name: kairos
  passwd: kairos
  groups:
    - admin

k0s:
  enabled: true

write_files:
  - path: /var/lib/k0s/manifests/my-nginx/my-nginx.yaml
    permissions: 0644
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

After having deployed the controller node you need to generate a token for the worker node:

```bash
k0s token create --role=worker
```

You can now use the token to deploy the worker node with the following cloud config:

```yaml
#cloud-config

users:
- name: kairos
  passwd: kairos
  groups:
    - admin
  
k0s-worker:
  enabled: true
  args:
  - --token-file /etc/k0s/token

write_files:
  - path: /etc/k0s/token
    permissions: 0644
    content: |
      YOUR_TOKEN
```

Since this is a fully manual installation, you are in charge of setting all arguments that your setup will require, by use of the `args` attribute for both the master and server nodes.
