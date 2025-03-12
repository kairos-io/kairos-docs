---
title: "Single-Node cluster"
linkTitle: "Single-node cluster"
description: This section describe examples on how to deploy Kairos single-node cluster
---

In the example below we will use a bare metal host to provision a Kairos node in the local network using a single machine.

## Installation

For this example we will use a standard image which contains a Kubernetes distribution. You can choose between `k0s` and `k3s` as the distribution to use. Follow the [Installation]({{< relref "../installation" >}}) documentation with the configurations provided on this page. Make sure to choose the one that matches the image you are using.

## Configuration

We will deploy a `kairos` user with the password `kairos` and the `admin` group. We will also add the public keys of the users that will be allowed to access the nodes. We will enable the Kubernetes distribution and configure it. And also include a manifest with a simple Nginx deployment that will be installed on the cluster automatically. See [docs]({{< relref "../reference/configuration#kubernetes-manifests" >}}) for more information. You can change the manifest to the one of your own application or remove it if you don't need it.

{{< tabpane text=true right=true  >}}
{{% tab header="k3s" %}}
```yaml
#cloud-config

users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k3s:
  enabled: true

write_files:
- path: /var/lib/rancher/k3s/server/manifests/nginx.yaml
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
{{% /tab %}}
{{% tab header="k0s" %}}
```yaml
#cloud-config

users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k0s:
    args:
        - --single
    enabled: true

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
{{% /tab %}}
{{< /tabpane >}}
