---
title: "Installing a Kubernetes node"
linkTitle: "Installation"
weight: 1
description: Boot a Kairos node from a provider-kubernetes image and bring up a single-node cluster.
sidebar_position: 1
---

A provider-kubernetes image is a Kairos OS image with the provider installed at `/system/providers/agent-provider-kubernetes` and the kubeadm toolchain (kubeadm, kubelet, kubectl, containerd, runc, the CNI reference plugins) already in it. You install it the way you install any Kairos node. The only thing you add is a `cluster:` block in the cloud-config.

## Pick an image

Each release publishes one image per supported Kubernetes minor. For v0.4.0:

```bash
docker pull ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.35
docker pull ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.36
docker pull ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.37
```

The newest supported minor, 1.37, is also published as `ghcr.io/kairos-io/provider-kubernetes:v0.4.0` and `:latest`.

Pick the minor you want and remember it. The `kubernetesVersion` you pin in the cloud-config has to match the kubeadm binary in the image; a mismatch fails the reconcile pass with an error instead of installing a different version.

## Build a bootable artifact

Turn the OCI image into an ISO with your cloud-config embedded, using [AuroraBoot](/docs/reference/auroraboot/):

```bash
docker run --rm --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:/work" \
  quay.io/kairos/auroraboot:latest \
  build-iso --output /work --cloud-config /work/cluster.yaml \
  docker:ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.37
```

Netboot and the other Kairos delivery methods work the same way. Nothing about the provider depends on how the config reaches the node, only on the config itself.

## The cloud-config

This is enough for a single-node cluster. Change the token, the address and the Kubernetes version.

```yaml
#cloud-config
install:
  device: "auto"
  auto: true
  reboot: true

users:
  - name: kairos
    groups: ["admin", "sudo"]
    passwd: kairos

cluster:
  cluster_token: "replace-with-a-long-high-entropy-random-string"
  control_plane_host: "192.168.1.10"
  role: init
  providerConfig:
    cluster_root_path: "/"
  config: |
    clusterConfiguration:
      kubernetesVersion: v1.37.0
      controlPlaneEndpoint: "192.168.1.10:6443"
      networking:
        podSubnet: "10.244.0.0/16"
        serviceSubnet: "10.96.0.0/12"
```

Four things about it:

`users` is a Kairos requirement, not a provider one. An unattended install needs at least one user in the `admin` group, or `install.nousers: true`.

`cluster_token` is a correlation value, not key material. The provider derives no credential from it. It is rejected if it is empty or shorter than 16 characters, and it logs a one-time warning below roughly 128 bits of estimated entropy. It is never logged, and you should still treat it as confidential.

`control_plane_host` is the API server address this node uses. A bare host gets `:6443` appended. On a `role: init` node it is this node's own address.

`controlPlaneEndpoint` is what every node in the cluster reaches the API server through, and it is baked into the API server serving certificate. Pointing it at this node's own IP is fine for a single control plane and the provider will say so in a warning, but it cannot be retrofitted later. If you expect to add control planes, read [Creating a cluster](../creating-a-cluster) before you boot this node.

The full read surface is in [Configuration](../configuration).

## What happens on first boot

The ISO boots, Kairos installs itself to disk, and the node reboots into the installed system. The provider does its work on that second boot.

It contributes one yip stage at `network.after` with three steps, which run in order:

1. The `cluster:` block is serialized to `/run/provider-kubernetes/cluster.json`, mode 0600 on tmpfs.
2. `agent-provider-kubernetes import-images` imports the control-plane images bundled in the OS image into containerd, logging to `/var/log/provider-kubernetes-image-import.log`. It is a no-op when the image bundles nothing, and a failure here does not abort the boot. See [Air-gapped installs](../air-gapped).
3. `agent-provider-kubernetes reconcile` reads the file from step 1 and runs one bounded pass, logging to `/var/log/provider-kubernetes-reconcile.log`.

The reconcile pass probes what the node actually is: cluster membership from the kubeadm artifacts on disk, kubelet health, and whether a control plane answers at the endpoint. It then computes the difference against the declared role and executes only that, under a deadline with capped retries. On a fresh `role: init` node the difference is the whole cluster, so it runs `kubeadm init`.

There is no controller and no watch loop. The pass runs once per boot and returns, and it never blocks a later Kairos boot stage.

## Check that it worked

The reconcile pass runs as a boot-time stage, so its exit code does not reach `kairos-agent`. Read the status document instead:

```bash
sudo cat /run/provider-kubernetes/status.yaml
```

A node that came up reports `phase: Converged` and `outcome: success`. `/run` is tmpfs, so after a reboot read the persistent mirror at `/var/log/provider-kubernetes/status.yaml`. Every field in that document is a closed enum except `message`, which is sanitized and truncated. [Troubleshooting](../troubleshooting) explains the phases and the reason codes.

Then look at the cluster:

```bash
sudo kubectl --kubeconfig /etc/kubernetes/admin.conf get nodes
sudo kubectl --kubeconfig /etc/kubernetes/admin.conf get pods -n kube-system
```

The node will be `NotReady` and CoreDNS will be `Pending`. That is the expected state: the provider installs no CNI. Apply one and the node goes Ready. See [CNI](../cni).

## Next

Add [a CNI](../cni), then [add control planes and workers](../creating-a-cluster). For fleet-wide operations across many nodes once they are up, see the [Kairos operator](/operator-docs/).
