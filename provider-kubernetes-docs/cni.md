---
title: "CNI"
linkTitle: "CNI"
weight: 4
description: Why a fresh node is NotReady, and how to install Flannel or Calico on it.
sidebar_position: 4
---

The provider installs no CNI. Until you install one, nodes report `NotReady` and CoreDNS stays `Pending`. That is the expected state of a cluster the provider has just bootstrapped, not a failure.

kubeadm behaves the same way, for the same reason: pod networking is a choice with consequences for policy, encapsulation and performance, and the provider does not make it for you.

## What the image does provide

The image loads the `overlay` and `br_netfilter` kernel modules and sets the sysctls a bridged CNI needs:

```
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
```

It also ships the upstream CNI reference plugins in `/opt/cni/bin`. It does not ship or configure any network plugin on top of them.

## The pod subnet has to match

Whatever CNI you install, its pod network has to match the `podSubnet` in `clusterConfiguration.networking`. The provider's samples use `10.244.0.0/16` throughout. If you change one, change the other, or pods will not get routable addresses.

## Flannel

Flannel is one manifest, no operator and no CRDs, and its default pod network is already `10.244.0.0/16`. It is the shortest path to a Ready node.

```bash
export KUBECONFIG=/etc/kubernetes/admin.conf
kubectl apply -f https://github.com/flannel-io/flannel/releases/download/v0.28.5/kube-flannel.yml
```

Within about a minute:

```bash
kubectl get nodes      # Ready
kubectl get pods -A    # coredns Running, kube-flannel-ds Running
```

If you changed `podSubnet`, edit the `Network` field of `net-conf.json` in the manifest's `kube-flannel-cfg` ConfigMap to match before applying.

## Calico

Calico installs through the Tigera operator, which is Calico's own recommended path and the supported way to set the pod CIDR declaratively.

```bash
export KUBECONFIG=/etc/kubernetes/admin.conf

# 1. the operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml

# 2. wait for its CRDs, then the Installation
kubectl wait --for=condition=Established crd/installations.operator.tigera.io --timeout=60s
kubectl apply -f installation.yaml

# 3. wait for it to come up
kubectl -n calico-system wait --for=condition=Ready pod --all --timeout=300s
kubectl wait --for=condition=Ready node --all --timeout=300s
```

Applying the `Installation` before the operator's CRDs are Established is the common mistake; it fails with "no matches for kind Installation".

The `installation.yaml` in the provider's `samples/cni-calico/` directory uses pool CIDR `10.244.0.0/16`, matching the sample `podSubnet`, and `VXLANCrossSubnet` encapsulation, which tunnels pod traffic between nodes on different subnets and routes natively within a subnet. VXLAN needs neither BGP nor any cooperation from the fabric, so it works on a plain bridged or NAT network.

Calico v3.32 is tested upstream against Kubernetes 1.34, 1.35 and 1.36, which covers two of the provider's three minors. Check the [Calico requirements](https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements) before pairing it with 1.37.

## Installing from the cloud-config instead

Both of the provider's CNI samples also ship a `role: init` cloud-config that installs the CNI itself, so one file yields a Ready cluster with no follow-up `kubectl`. They work by installing a small systemd one-shot that waits for `admin.conf` and a responsive API, applies the manifests, and touches a sentinel so it does not re-apply on reboot.

A self-waiting unit rather than another yip stage command is deliberate: it does not depend on stage ordering relative to the provider's reconcile pass, it never blocks a boot stage, it is idempotent across reboots, and on a node that never becomes a control plane, where there is no `admin.conf`, it is a no-op.

See `samples/cni-flannel/cluster-with-flannel.yaml` and `samples/cni-calico/cluster-with-calico.yaml` in the [provider repository](https://github.com/kairos-io/provider-kubernetes/tree/main/samples).

## Other CNIs

Any standard CNI works. Install it with its normal manifests or Helm chart after the control plane is up. The provider does not interfere with `/opt/cni/bin` beyond shipping the reference plugins there.

Two things worth knowing before you install one. containerd, not the kubelet, is what executes CNI plugins, and `/opt/cni/bin` is its only configured plugin directory, which is also where CNI installers put their binaries. And Kairos keeps both `/opt/cni/bin` and `/etc/cni/net.d` on the persistent partition, so whatever you install there survives an image upgrade, and anything in that directory runs as root every time a pod sandbox is created.

## On an air-gapped network

The manifests and the CNI's own images need outbound access. The control-plane images bundled in the OS image do not include a CNI. Mirror the manifest and the images internally and apply from your local copy. See [Air-gapped installs](../air-gapped).
