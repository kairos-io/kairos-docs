---
title: "Air-gapped installs"
linkTitle: "Air-gapped"
weight: 5
description: What the image bundles, how the boot import works, how to verify it, and what happens when an image is missing.
sidebar_position: 5
---

A node with no registry access can still run `kubeadm init` or `kubeadm join`, because every provider-kubernetes image carries the control-plane container images for its own Kubernetes minor and imports them into containerd at boot.

Nothing in the cloud-config turns this on. An air-gapped install is the ordinary install with two settings left alone and one check run before you cut the network.

## What is bundled

The bundle lives at `/system/provider-kubernetes/images`, which is read-only OS image content, alongside an `images.lock` that records each image's reference, digest and tarball name.

It holds `kube-apiserver`, `kube-controller-manager`, `kube-scheduler`, `kube-proxy`, `etcd`, `coredns` and `pause`, stored under the exact references the bundled kubeadm asks for. The references matter: kubeadm looks up an image by its full reference, and an image stored under any other name is an image kubeadm will pull.

At build time each image is resolved to a digest from the bundled kubeadm's own image list and pulled by that digest. `pause`, `etcd` and `coredns`, plus at least one `kube-*` component, must pass cosign verification against the Kubernetes release signing identity or the build fails. `images.lock` records, per image, whether it verified.

Not bundled, and your problem on an isolated network:

- A CNI. The provider installs none. Mirror the manifest and its images internally and apply from your local copy. See [CNI](../cni).
- Anything your workloads pull.
- Images for a custom `imageRepository`. The bundle covers `registry.k8s.io`, which is kubeadm's own default. Set a mirror and kubeadm looks for references the bundle does not carry.

## The cloud-config

It is the standard `role: init` config. What makes it work is the image, not the config.

```yaml
cluster:
  cluster_token: "a-long-high-entropy-correlation-string"
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
    initConfiguration:
      localAPIEndpoint:
        advertiseAddress: "192.168.1.10"
        bindPort: 6443
```

Do not set `imageRepository`, and make sure `kubernetesVersion` matches the image you booted. A version mismatch is a hard error anywhere, but on an air-gapped node there is no registry to paper over it.

## How the boot import works

The import runs as the second of the three steps in the provider's `network.after` stage, before the reconcile pass, so the images are in containerd before `kubeadm init` or `kubeadm join` runs. It runs as a stage step rather than relying on `provider-kubernetes-image-import.service` alone, because the systemd one-shot races the stage and cannot be relied on for that ordering.

Only the tarballs listed in `images.lock` are imported. Before anything is opened the provider checks that every directory on the path, the lock file and each tarball are owned by root, are not writable by group or others, are not symlinks, and are on the same filesystem as the provider binary; and that each tarball names exactly its lock reference. A file in the bundle directory that is not in `images.lock` is never opened at all: it is counted and reported as `unlisted`.

The import is bounded at five minutes and never blocks the boot. Image layers are not re-hashed at boot, because containerd checks layer contents against the image configuration when it unpacks them. Images already in containerd's store are not re-verified.

## Verify before you cut the network

Boot one node from the image with your config while a registry is still reachable, and confirm the import is doing the work rather than a silent pull.

Each run ends with one summary line:

```bash
sudo grep 'image-import:' /var/log/provider-kubernetes-image-import.log | tail -n 5
```

```
image-import: summary outcome=success entries=7 imported=7 refused=0 failed=0 unlisted=0 readonly=true dir=/system/provider-kubernetes/images
```

`outcome` is one of `success`, `partial`, `refused`, `failed`, or `not-bundled` when the image bundles nothing. What you want is `success` with `refused=0 failed=0`.

You can run every check without importing anything:

```bash
sudo /system/providers/agent-provider-kubernetes import-images --verify-only
```

That reports `verified` or `refused`. Then confirm containerd holds each image under the reference kubeadm looks up, which is the lookup that decides whether kubeadm pulls:

```bash
sudo /usr/bin/kubeadm config images list --kubernetes-version v1.37.0
sudo /usr/bin/crictl --runtime-endpoint unix:///run/containerd/containerd.sock \
  --image-endpoint unix:///run/containerd/containerd.sock images
```

Every reference in the first command's output must appear in the second.

## What happens when an image is missing

The import never blocks the boot, so a refusal is not fatal on its own. What happens next depends on the node.

On a node with registry access, kubeadm does not find the image locally and pulls it from the registry by tag. The cluster comes up, and the only sign is that the bundle was not used.

On a node without registry access, kubeadm cannot find the image, the pull fails, and the node does not bootstrap. The status document records the failure. See [Troubleshooting](../troubleshooting).

A refused image gets its own line naming the tarball, the reference and the reason. A problem with the bundle as a whole, such as an unsafe directory on the path or an `images.lock` that is not what the build wrote, is logged once as a bundle refusal and nothing at all is imported.

Nothing on a supported image should be refused. Treat a refusal as a sign that the booted OS image or its mounts were changed, rather than as a configuration problem to work around. The reason codes are in [Troubleshooting](../troubleshooting).

## Upgrading an air-gapped cluster

An upgrade is an image swap plus a version pin bump, so the new minor's images arrive with the new OS image. See [Upgrades](../upgrades).

One thing to check first on a node that came from a release before v0.4.0. Kairos keeps `/etc/systemd` on the persistent partition and refreshes it from the image with `rsync --update`, so such a node can still be running the old import unit, which has a `ConditionPathExists=/opt/provider-kubernetes/images` line. On that node, deleting `/opt/provider-kubernetes` makes the import skip silently on every boot, and an air-gapped node then fails to converge. Check before you delete anything:

```bash
sudo systemctl cat provider-kubernetes-image-import.service | grep ConditionPathExists
```

That must print nothing.

## A note on v0.3.0

v0.3.0 imported every bundled image under a placeholder name, `registry.k8s.io/<image>:i-was-a-digest`, so kubeadm could not find any of them. Air-gapped nodes failed to bootstrap on that release and connected nodes silently pulled instead. There is no v0.3.x backport. Use v0.4.0 or later. Leftover `:i-was-a-digest` names on an existing node are harmless and can be removed with `sudo /usr/bin/ctr -n k8s.io images rm <name>`; an air-gapped node that failed to bootstrap should be reinstalled from a fixed image.
