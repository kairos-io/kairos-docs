---
title: "Single Node k3s cluster"
linkTitle: "Single node k3s cluster"
weight: 1
description: This section describe examples on how to deploy Kairos with k3s as a single-node cluster
---

In the example below we will use a bare metal host to provision a Kairos node in the local network with K3s.

## Installation

Use the standard images which contain `k3s`.

Follow the [Installation]({{< relref "../installation/" >}}) documentation, using the following cloud config:

```yaml
#cloud-config

users:
- name: kairos
  passwd: kairos
  groups:
    - admin

k3s:
  enabled: true

write_files:
- path: /var/lib/rancher/k3s/server/manifests/myapp.yaml
  permissions: "0644"
  content: |
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: nginx
      labels:
        app: nginx
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: nginx
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
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: nginx
    spec:
      selector:
        app: nginx
      ports:
        - protocol: TCP
          port: 80
          targetPort: 80
      type: ClusterIP
```

### Explanation of the cloud-config 

- Creates a user `kairos` with password `kairos` and add it to the `admin` group so we can access the node with SSH
- Enables `k3s` installation
- Writes a Kubernetes manifest to deploy a simple Nginx deployment and service. There might be better deployments of Nginx, but this is just an example. The manifest is written to `/var/lib/rancher/k3s/server/manifests/` so it will be applied by the K3s agent automatically. See [docs]({{< relref "../reference/configuration#kubernetes-manifests" >}}) for more information.
