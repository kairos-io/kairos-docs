---
title: "Manual Multi-Node Cluster"
sidebar_label: "Manual multi-node cluster"
description: This section describe examples on how to deploy Kairos as a multi-node cluster
---

In the example below we will use a bare metal host to provision a Kairos cluster in the local network using one master node and one worker node.

## Installation

For this example we will use a standard image which contains a Kubernetes distribution. You can choose between `k0s` and `k3s` as the distribution to use. Follow the [Installation](/docs/v3.6.0/Installation/) documentation with the configurations provided on this page. Make sure to choose the one that matches the image you are using.


## Configuration

On all nodes, we will deploy a `kairos` user with the password `kairos` and the `admin` group. We will also add the public keys of the users that will be allowed to access the nodes.

### Master node

On the master node configuration, we will enable the Kubernetes distribution and configure it. We will also include a manifest with a simple Nginx deployment that will be installed on the cluster once it's running. You can change the manifest to the one of your own application or remove it if you don't need it.

{{< tabpane text=true right=true  >}}
{{% tab header="k3s" %}}
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

k3s:
  enabled: true
  args:
    - --disable=traefik,servicelb # will disable traefik and servicelb

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

write_files:
- path: /var/lib/k0s/manifests/nginx/nginx.yaml
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

### Worker nodes

With the master node up and running, we can configure the worker nodes

{{< tabpane text=true right=true  >}}
{{% tab header="k3s" %}}
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

k3s-agent: # Warning: the key is different from the master node one
  enabled: true
  args:
    - --with-node-id # will configure the agent to use the node ID to communicate with the master node
  env:
    K3S_TOKEN: "<MASTER_SERVER_TOKEN>" # /var/lib/rancher/k3s/server/node-token from the master node
    K3S_URL: https://<MASTER_SERVER_IP>:6443 # Same IP that you use to log into your master node
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

{{< tabpane text=true right=true  >}}
{{% tab header="k3s" %}}
To find out more about args configuration from k3s, follow their [server](https://docs.k3s.io/cli/server) and [agent](https://docs.k3s.io/cli/agent) documentation.
{{% /tab %}}
{{% tab header="k0s" %}}
To learn more about a multi-node setup with k0s, follow their [multi-node](https://docs.k0sproject.io/stable/k0s-multi-node/) documentation.
{{% /tab %}}
{{< /tabpane >}}
