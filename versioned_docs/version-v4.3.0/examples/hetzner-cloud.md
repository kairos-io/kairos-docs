---
title: "Hetzner Cloud"
sidebar_label: "Hetzner Cloud"
description: Deploy Kairos with k3s and Cilium on Hetzner Cloud private networks, including correct CNI configuration to avoid silent packet drops from Hetzner's uRPF enforcement.
---

This guide covers deploying Kairos with k3s and Cilium on [Hetzner Cloud](https://www.hetzner.com/cloud) private networks. It includes Hetzner-specific networking requirements that are not obvious and cause hard-to-diagnose failures if missed.

## Prerequisites

- A Hetzner Cloud project with a [private network](https://docs.hetzner.com/cloud/networks/getting-started/creating-a-network/) and subnet (e.g. `10.0.1.0/24`)
- Nodes attached to the private network. Nodes can be private-only (no public IPv4)
- A gateway node with a public IP for internet egress (see [Default Route](#default-route-for-private-only-nodes))
- [Hetzner Cloud Controller Manager (HCCM)](https://github.com/hetznercloud/hcloud-cloud-controller-manager) if you need `Service type=LoadBalancer`

## Hetzner uRPF and Cilium Native Routing

Hetzner Cloud private networks enforce [unicast reverse path forwarding (uRPF)](https://docs.hetzner.com/networking/networks/faq/#why-do-packets-with-source-ips-not-related-to-the-server-get-dropped) at the virtual network gateway. The gateway validates each packet's source IP against prefixes **registered to the originating server**. Pod IPs are not registered server prefixes, so the gateway **silently drops** them — no ICMP unreachable, only connection timeouts.

When configuring Cilium in native routing mode, this has a critical implication for `ipv4NativeRoutingCIDR`:

:::danger
Do **not** set `ipv4NativeRoutingCIDR` to the full Hetzner private network CIDR (e.g. `10.0.0.0/8`). This disables masquerade for pod traffic to non-cluster hosts in the same private network, causing uRPF drops.

This failure is especially hard to diagnose because `autoDirectNodeRoutes` installs direct host routes for intra-cluster pod CIDRs, bypassing the Hetzner gateway entirely — pod-to-pod cross-node traffic succeeds, masking the misconfiguration during testing.
:::

**Fix:** set `ipv4NativeRoutingCIDR` to the pod CIDR only (e.g. `10.42.0.0/16`). Cilium then masquerades pod traffic to non-pod destinations using the node's registered IP, satisfying uRPF. Pod-to-pod intra-cluster routing continues natively via direct node routes.

## Cloud Config

The following cloud config deploys a single-node k3s cluster on Hetzner Cloud with Cilium bootstrapped via the k3s manifest mechanism. Cilium is injected as a `HelmChart` resource into `/var/lib/rancher/k3s/server/manifests/` so k3s auto-deploys it at boot — no separate Helm install step required.

```yaml
#cloud-config

hostname: gitea-cp-0  # Must match Hetzner Cloud server name exactly (see HCCM note)

users:
  - name: kairos
    passwd: kairos
    groups:
      - admin
    ssh_authorized_keys:
      - github:your-github-user

k3s:
  enabled: true
  args:
    - --disable=traefik,servicelb
    - --flannel-backend=none          # disable flannel — Cilium replaces it
    - --disable-network-policy        # Cilium handles network policy
    - --node-ip=10.0.1.10             # static private IP, must match Hetzner assignment
    - --cluster-cidr=10.42.0.0/16
    - --service-cidr=10.43.0.0/16

write_files:
  # Cilium bootstrapped by k3s at boot (no separate helm install needed)
  - path: /var/lib/rancher/k3s/server/manifests/cilium.yaml
    permissions: "0644"
    content: |
      apiVersion: helm.cattle.io/v1
      kind: HelmChart
      metadata:
        name: cilium
        namespace: kube-system
      spec:
        chart: cilium
        repo: https://helm.cilium.io/
        version: "1.18.2"
        targetNamespace: kube-system
        bootstrap: true
        valuesContent: |-
          kubeProxyReplacement: true
          k8sServiceHost: 127.0.0.1
          k8sServicePort: 6443
          routingMode: native
          autoDirectNodeRoutes: true
          # Multi-DC clusters: add directRoutingSkipUnreachable: true
          # (Hetzner private network is L2 within a DC, L3 between DCs)
          ipv4NativeRoutingCIDR: 10.42.0.0/16   # pod CIDR only — NOT 10.0.0.0/8
          ipam:
            mode: kubernetes
          operator:
            replicas: 1
          l2announcements:
            enabled: true   # required for CiliumLoadBalancerIPPool VIPs
          gatewayAPI:
            enabled: true
```

## Default Route for Private-Only Nodes

Nodes with no public IPv4 need a default route pointing at the Hetzner network gateway (`10.0.0.1`) to reach the internet. DHCP option 121 (classless static routes) is unreliable on Kairos. Set the default route explicitly in cloud-init so it is applied on every boot stage:

```yaml
stages:
  initramfs:
    - name: Set default route via Hetzner gateway
      commands:
        - ip route replace default via 10.0.0.1 dev eth0 onlink
  boot:
    - name: Set default route via Hetzner gateway
      commands:
        - ip route replace default via 10.0.0.1 dev eth0 onlink
```

Replace `eth0` with your actual interface name (`ens3`, `enp1s0`, etc.).

## HCCM Hostname Requirement

If using the [Hetzner Cloud Controller Manager](https://github.com/hetznercloud/hcloud-cloud-controller-manager), the Kubernetes node hostname **must exactly match** the Hetzner Cloud server name. HCCM uses the hostname to look up the server's `providerID` and to attach nodes to Load Balancer targets.

Set `hostname` in cloud-config (as shown above) or pass `--node-name` to k3s explicitly. A mismatch causes HCCM to fail silently — nodes appear Ready but Load Balancer attachment and cloud route management will not work.

## Multi-Datacenter Clusters

Hetzner private networks are L2 within a single datacenter (e.g. `fsn1`) and L3-routed between datacenters (`fsn1` ↔ `nbg1` ↔ `hel1`). `autoDirectNodeRoutes` requires L2 ARP for next-hop resolution and cannot install direct routes to nodes in other DCs.

Add `directRoutingSkipUnreachable: true` to fall back to the Hetzner L3 router for cross-DC pod traffic:

```yaml
routingMode: native
autoDirectNodeRoutes: true
directRoutingSkipUnreachable: true   # skip direct routes to cross-DC nodes
ipv4NativeRoutingCIDR: 10.42.0.0/16
```

## Internal Load Balancer VIPs

To expose a service at a stable private IP reachable via VPN (without a public Hetzner Load Balancer), use Cilium's [LB-IPAM](https://docs.cilium.io/en/stable/network/lb-ipam/) with L2 announcements:

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: private-vips
spec:
  blocks:
    - cidr: "10.0.1.200/32"
---
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: private-vips
spec:
  # Pin to a node in the target DC — ARP is not forwarded across the Hetzner L3 router
  nodeSelector:
    matchLabels:
      kubernetes.io/hostname: gitea-cp-0
  interfaces:
    - ^eth\d+
  loadBalancerIPs: true
```

Annotate the Gateway or Service to request the specific IP:

```yaml
metadata:
  annotations:
    io.cilium/lb-ipam-ips: "10.0.1.200"
```

The VIP is reachable from any host that can reach the private subnet, including VPN-connected clients.
