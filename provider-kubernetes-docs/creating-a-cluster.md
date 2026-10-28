---
title: "Creating a cluster"
linkTitle: "Creating a cluster"
weight: 3
description: Bootstrap the first control plane, join workers and control planes, and run a highly available control plane.
sidebar_position: 3
---

Roles are declared per node, in each node's own cloud-config. There is no central controller. The provider on a node converges that node and nothing else.

Join material is minted on an existing control plane and delivered by you to the joining node. A joining node never mints its own credentials and never asks the control plane for any. That is the whole model; the rest of this page is the mechanics.

## 1. The first control plane

Boot one node with `role: init`, as in [Installation](../installation). When it is up you have a single-node control plane and an admin kubeconfig at `/etc/kubernetes/admin.conf`.

If you will ever add a second control plane, set `controlPlaneEndpoint` to a stable address now. Read [Highly available control planes](#highly-available-control-planes) below before you boot this node, because the endpoint cannot be changed afterwards.

## 2. Mint join material

On the running control plane, as root:

```bash
# for a worker
sudo /system/providers/agent-provider-kubernetes mint-join \
  --role worker --ttl 1h \
  --cluster-token "the-clusters-cluster-token"

# for an additional control plane
sudo /system/providers/agent-provider-kubernetes mint-join \
  --role controlplane --ttl 1h \
  --advertise-address 192.168.1.20 \
  --cluster-token "the-clusters-cluster-token"
```

`mint-join` prints a ready-to-edit cloud-config to stdout. For a worker it creates a bounded-TTL bootstrap token with `kubeadm token create` and computes the cluster CA SPKI pin from `ca.crt`. For a control plane it additionally generates a fresh certificate key and re-uploads the cluster certificates encrypted under that key, so the key always matches what is in etcd.

The flags:

| Flag | Default | Meaning |
|------|---------|---------|
| `--role` | `worker` | `worker` or `controlplane`. |
| `--ttl` | `1h` | Bootstrap token lifetime. Must be greater than zero; there is no unbounded option. |
| `--endpoint` | derived from `admin.conf` | The `host:port` the joining node targets. For a highly available cluster, the shared endpoint. |
| `--advertise-address` | empty | `controlplane` only: the joining node's own routable IP. Left blank, the rendered config carries a fill-in placeholder and kubeadm falls back to the default-route interface, which is fine on a single-homed node. |
| `--root-path` | `/` | The `cluster_root_path` that locates `admin.conf` and `ca.crt`. |
| `--cluster-token` | empty | The cluster's `cluster_token`, to embed in the rendered config. Left blank, a clearly marked placeholder is emitted. |

The secret values go to stdout only. They are never written to a logger, and the certificate key never appears on a command line.

## 3. Boot the joiner

Take the `cluster:` block from the minted output into the joining node's cloud-config, adjust the install device, hostname and networking, and boot. On the installed boot the provider runs `kubeadm join` against that material, with the CA pinned.

A worker:

```yaml
cluster:
  cluster_token: "the-clusters-cluster-token"
  control_plane_host: "192.168.1.10:6443"
  role: worker
  providerConfig:
    cluster_root_path: "/"
  config: |
    joinConfiguration:
      discovery:
        bootstrapToken:
          token: "abcdef.0123456789abcdef"
          apiServerEndpoint: "192.168.1.10:6443"
          caCertHashes:
            - "sha256:the-ca-spki-pin"
```

An additional control plane:

```yaml
cluster:
  cluster_token: "the-clusters-cluster-token"
  control_plane_host: "k8s-api.example.test:6443"
  role: controlplane
  providerConfig:
    cluster_root_path: "/"
  config: |
    joinConfiguration:
      discovery:
        bootstrapToken:
          token: "abcdef.0123456789abcdef"
          apiServerEndpoint: "k8s-api.example.test:6443"
          caCertHashes:
            - "sha256:the-ca-spki-pin"
      controlPlane:
        certificateKey: "a-fresh-certificate-key"
        localAPIEndpoint:
          advertiseAddress: "192.168.1.20"
          bindPort: 6443
```

Then check it landed:

```bash
sudo kubectl --kubeconfig /etc/kubernetes/admin.conf get nodes -o wide
```

New nodes appear and go Ready once a CNI is installed. See [CNI](../cni).

## Control-plane material expires, on purpose

Two clocks run on a control-plane join bundle, and they are different lengths.

The bootstrap token expires after `--ttl`, one hour by default. The `kubeadm-certs` Secret holding the cluster PKI encrypted under the certificate key expires after two hours, which is upstream kubeadm's own TTL. The provider does not strip it and never sets it to zero.

So mint control-plane material just before the node boots, mint it fresh for every node, and never reuse a certificate key across joins. If the material expires before the node comes up, mint again; nothing is lost. The provider persists none of it.

The certificate key decrypts the cluster PKI including the CA private key. Anyone holding it, a live token and API reachability can mint a credential for any identity. Deliver it over a confidential, integrity-protected channel and do not leave the rendered config on the joined node's persistent storage. See [Security](../security).

## Highly available control planes

The provider supports stacked-etcd HA: three or more control-plane nodes, each running etcd, behind one shared API endpoint.

### The endpoint is the prerequisite

HA is only possible if the cluster was initialized with a `controlPlaneEndpoint` that outlives any single node: a VIP, an external L4 load balancer, or a health-checked DNS name fronting all control planes. That address is baked into the API server serving certificate and is how every node reaches the API.

The provider ships no load balancer. Providing the endpoint, with kube-vip, keepalived, a cloud load balancer or DNS, is yours to do.

At `role: init` the provider warns if the endpoint is absent, or if it looks like this node's own advertise address. At `role: controlplane` an empty endpoint is a hard failure. You cannot retrofit an endpoint into a live cluster, because doing so means reissuing every API server certificate. Set it at init time:

```yaml
cluster:
  cluster_token: "the-clusters-cluster-token"
  control_plane_host: "192.168.1.11"
  role: init
  providerConfig:
    cluster_root_path: "/"
  config: |
    clusterConfiguration:
      kubernetesVersion: v1.37.0
      controlPlaneEndpoint: "k8s-api.example.test:6443"
      networking:
        podSubnet: "10.244.0.0/16"
        serviceSubnet: "10.96.0.0/12"
    initConfiguration:
      localAPIEndpoint:
        advertiseAddress: "192.168.1.11"
        bindPort: 6443
```

`control_plane_host` and `localAPIEndpoint.advertiseAddress` are this node's own IP. `controlPlaneEndpoint` is the shared address. Each additional control plane uses the shared address for `control_plane_host` and its own IP for `advertiseAddress`.

### One node at a time

etcd membership changes are sequential. Adding two members at once can break quorum, and concurrent joins race the shared certificate upload. The provider builds no distributed lock, because a lock is something that can hang. The sequencing is yours:

1. Bring up the first control plane and wait until it is fully Ready.
2. Mint control-plane material for the next node, close to its boot time, and boot it. Wait until it has joined and etcd shows the new member.
3. Repeat for the third, and any further, control plane.

Before a control-plane join the provider runs a bounded node-local `/readyz` health gate, so a new member only joins a quorum that is answering. Aim for an odd number of healthy control planes, three or five.

### Removing a control plane

Removal is two operations, and only the first is local.

A [reset](../troubleshooting#resetting-a-node) wipes the node's kubeadm artifacts including its etcd data. If the cluster is reachable at that moment, `kubeadm reset` deregisters the local etcd member for you.

If the node is being reset because it is broken or unreachable, the member is left orphaned, and a stale member erodes quorum. The provider does not run `etcdctl` from a dying node; it logs a warning and finishes the local cleanup. Deregister the member yourself from a surviving control plane, where `etcdctl` is bundled at `/usr/bin/etcdctl`:

```bash
kubectl delete node the-dead-node
ETCD_TLS="--endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key"
sudo /usr/bin/etcdctl $ETCD_TLS member list
sudo /usr/bin/etcdctl $ETCD_TLS member remove the-member-id
```

## Reboots do not re-bootstrap

Reconcile is desired state against actual state. On every boot the provider probes what the node really is and acts only on the difference. A node that is already a healthy member produces an empty plan, and the pass is a fast no-op.

The provider never re-runs `kubeadm init` or `kubeadm join` on a node that has already converged, including when that node's kubelet is unhealthy. Recovering an established member is an explicit operator action. See [Troubleshooting](../troubleshooting).
