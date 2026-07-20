---
title: "Installation on Hetzner Cloud"
sidebar_label: "Installation on Hetzner Cloud"
sidebar_position: 4
date: 2026-05-03
description: Install Kairos on Hetzner Cloud
slug: /installation/hetzner
---

This page describes how to install Kairos on [Hetzner Cloud](https://www.hetzner.com/cloud/). Unlike AWS or Azure, Kairos does not publish official images to Hetzner. Instead, you boot your server from a Kairos ISO and use the built-in [WebUI](/docs/installation/webui) to complete the installation.

## Prerequisites

- A [Hetzner Cloud](https://console.hetzner.cloud/) account with permissions to create servers and open support tickets.
- A direct download URL for the Kairos ISO you want to use. Find the latest release on the [Kairos GitHub releases](https://github.com/kairos-io/kairos/releases) page and copy the link to the `.iso` artifact matching your target architecture.

## Step 1: Request the custom ISO from Hetzner

Hetzner Cloud does not allow direct ISO uploads. Instead, follow the [Hetzner FAQ for custom ISOs](https://docs.hetzner.com/cloud/servers/faq#how-can-i-get-a-custom-iso): submit a support ticket with the direct download URL of the Kairos ISO and Hetzner will make it available in your account.

1. Open a support ticket from the [Hetzner Cloud console](https://console.hetzner.cloud/).
2. Provide the direct download URL of the Kairos ISO (from the [Kairos releases page](https://github.com/kairos-io/kairos/releases)).
3. Wait for Hetzner to confirm the ISO is available. It will then appear in the ISO selection list for your account.

## Step 2: Create a server

1. In the Hetzner Cloud console, click **Create Server**.
2. Choose your region, server type, and disk size. Make sure the disk is large enough: Kairos requires space for the active, passive, and recovery partitions. A disk of at least 30 GB is recommended (3 times the size of the Kairos image, to accommodate the active, passive and recovery partition, plus room for persistent storage).
3. In the **Image** section, select any standard Linux OS (for example, Ubuntu). This image is used only for the initial provisioning of the server. In Step 3, you will mount the Kairos ISO and boot from it, and the Kairos installation will overwrite the initially provisioned OS.
4. Finish configuring the server and click **Create & Buy now**.

:::warning Hostname must match the server name
The Hetzner Cloud Controller Manager looks up each Kubernetes Node by name in the Hetzner Cloud API. If your Kairos `hostname:` (set in the cloud-config below) does not match the **name you gave the server in the Hetzner console**, the CCM cannot identify the node and skips lifecycle reconciliation — you'll see no `providerID`, no `topology.kubernetes.io/region` label, and `Service type=LoadBalancer` attachments can silently fail. Decide on a server name now and use the **same** string in the cloud-config's `hostname:` field in Step 4.
:::

## Step 3: Mount the Kairos ISO and reboot

Once the server is created and running:

1. In the Hetzner Cloud console, go to your server and open the **ISO** section.
2. Click **Mount ISO** and select the Kairos ISO imported in Step 1.
3. Reboot the server. It will now boot from the mounted Kairos ISO instead of the installed OS.

## Step 4: Install via the Kairos WebUI

When the server boots from the ISO, Kairos automatically starts a web-based installer available on port `8080`.

1. Open `http://<server-ip>:8080` in your browser.
2. Paste your [Kairos cloud-config](/docs/reference/configuration/) into the YAML input field. At a minimum, define a user so you can SSH in after installation:

```yaml
#cloud-config
hostname: kairos-{{ trunc 4 .MachineID }}

users:
  - name: kairos
    passwd: kairos
    groups:
      - admin
    ssh_authorized_keys:
      - "ssh-rsa AAAA..."
```

See the [Quick Start](/quickstart/) page for more cloud-config examples.

3. Submit the form. Kairos will install itself to the local disk. Once installation is complete, **power off** the server instead of letting it reboot immediately — this gives you a clean window to detach the ISO before the next boot.

:::tip
If port 8080 is not reachable, check your Hetzner Cloud Firewall rules and make sure TCP port 8080 is allowed for inbound traffic. You can also monitor the boot process through the **Console** tab of your server in the Hetzner Cloud web UI.
:::

## Step 5: Detach the ISO and verify

With the server powered off, detach the ISO before starting it again:

1. In the Hetzner Cloud console, go to your server.
2. Open the **ISO** section and click **Detach ISO**.
3. Power the server back on.

Verify that the system booted into active mode:

```bash
kairos-agent state get boot
```

The output should report `active_boot`. If it reports `recovery_boot`, the installation is still finishing — wait a few minutes and try again.

## Step 6: Access the server

Once in `active_boot`, connect via SSH using the credentials defined in your cloud-config:

```bash
ssh kairos@<server-ip>
```

## Kubernetes integration with Hetzner Cloud

If you are running k3s on Hetzner Cloud, you can integrate it with the [Hetzner Cloud Controller Manager (CCM)](https://github.com/hetznercloud/hcloud-cloud-controller-manager). The CCM enables k3s to interact with the Hetzner Cloud API to manage load balancers and populate node addresses correctly.

### Create a Hetzner API token

1. In the [Hetzner Cloud console](https://console.hetzner.cloud/), go to your project and open **Security** > **API Tokens**.
2. Click **Generate API Token**, give it a name, and select **Read & Write** permissions.
3. Copy the token — you will need it in the cloud-config below.

### Configure k3s and deploy the CCM

Pass the required k3s flags and write the CCM manifests to k3s's auto-deploy directory using `write_files` with base64-encoded content. k3s will automatically apply any YAML files found in `/var/lib/rancher/k3s/server/manifests/` when it starts.

Using `write_files` with `encoding: b64` is the recommended way to embed multi-line file content in a Kairos cloud-config — it avoids YAML serialization issues that can occur when pasting complex content through the WebUI.

The flags below disable k3s's built-in components that conflict with the Hetzner CCM or that will be replaced by external tools. In particular, `--disable=servicelb` hands load balancer management over to the Hetzner CCM.

#### Step 1: Generate the base64 content for the secret

On your local machine, run the following command, replacing `<HETZNER_API_TOKEN>` with your token:

```bash
printf 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: hcloud\n  namespace: kube-system\nstringData:\n  token: "<HETZNER_API_TOKEN>"\n' | base64 -w0
```

Copy the output — you will paste it as the `content` value of the first `write_files` entry below.

#### Step 2: Use the cloud-config

```yaml
#cloud-config
hostname: <YOUR_HETZNER_SERVER_NAME>   # must match the name set in the Hetzner Cloud console (see Step 2 warning)

users:
  - name: kairos
    passwd: kairos
    groups:
      - admin
    ssh_authorized_keys:
      - "ssh-rsa AAAA..."

k3s:
  enabled: true
  args:
    - --disable-cloud-controller          # turn off k3s's built-in CCM so the Hetzner CCM can take over node addressing and load balancers
    - --disable=traefik                   # don't install the bundled Traefik ingress; you can deploy your own ingress later if needed
    - --disable=servicelb                 # don't install klipper-lb (k3s's default LB); the Hetzner CCM will provision Hetzner Cloud Load Balancers for Service type=LoadBalancer
    - --write-kubeconfig-mode=644         # make /etc/rancher/k3s/k3s.yaml world-readable so the kairos user can run kubectl without sudo
    - --kubelet-arg=cloud-provider=external   # tell kubelet that an external cloud provider (Hetzner CCM) is responsible for node initialization and lifecycle

write_files:
  - encoding: b64
    path: /var/lib/rancher/k3s/server/manifests/hcloud-secret.yaml
    permissions: "0600"
    owner: "root"
    content: <base64-output-from-step-1>
  - encoding: b64
    path: /var/lib/rancher/k3s/server/manifests/hcloud-ccm.yaml
    permissions: "0600"
    owner: "root"
    content: YXBpVmVyc2lvbjogaGVsbS5jYXR0bGUuaW8vdjEKa2luZDogSGVsbUNoYXJ0Cm1ldGFkYXRhOgogIG5hbWU6IGhjbG91ZC1jbG91ZC1jb250cm9sbGVyLW1hbmFnZXIKICBuYW1lc3BhY2U6IGt1YmUtc3lzdGVtCnNwZWM6CiAgY2hhcnQ6IGhjbG91ZC1jbG91ZC1jb250cm9sbGVyLW1hbmFnZXIKICByZXBvOiBodHRwczovL2NoYXJ0cy5oZXR6bmVyLmNsb3VkCiAgdGFyZ2V0TmFtZXNwYWNlOiBrdWJlLXN5c3RlbQogIGJvb3RzdHJhcDogdHJ1ZQogIHZhbHVlc0NvbnRlbnQ6IHwtCiAgICBuZXR3b3JraW5nOgogICAgICBlbmFibGVkOiBmYWxzZQo=
```

For more details on the available configuration options, refer to the [hcloud-cloud-controller-manager documentation](https://github.com/hetznercloud/hcloud-cloud-controller-manager).

### Using a Hetzner private network

If your Hetzner Cloud servers are attached to a private network, three additional settings make the CCM use that private network as the node's primary plane — `InternalIP` becomes the private address, and pod-to-pod traffic between nodes stays off the public internet.

**1. Add the network name to the secret.** When you regenerate the base64 in [Step 1](#step-1-generate-the-base64-content-for-the-secret), include the network field:

```bash
printf 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: hcloud\n  namespace: kube-system\nstringData:\n  token: "<HETZNER_API_TOKEN>"\n  network: "<HETZNER_NETWORK_NAME_OR_ID>"\n' | base64 -w0
```

The CCM reads `HCLOUD_NETWORK` from this secret and uses the matching Hetzner private network for `InternalIP` assignment.

**2. Set `networking.enabled: true` and `networking.clusterCIDR` in the CCM HelmChart values.** Replace the values block (`networking: {enabled: false}`) with:

```yaml
valuesContent: |-
  networking:
    enabled: true
    clusterCIDR: 10.42.0.0/16   # k3s's default pod CIDR; must match the value passed to `k3s server --cluster-cidr`
```

The `clusterCIDR` value is **critical when running on k3s**. The chart's default (`10.244.0.0/16`) matches vanilla Kubernetes / kubeadm, but k3s uses `10.42.0.0/16`. A mismatch makes the CCM's route-controller emit a `ClusterCIDRMisconfigured` event and exit; the unrelated service-controller in the same process then never runs, so `Service type=LoadBalancer` resources stay `<pending>` indefinitely.

**3. Tell kubelet to use the private IP as its node IP, before k3s starts.** The CCM moves `InternalIP` to the private address only after kubelet has already generated its TLS certificate. Without intervention the certificate's SAN only covers the public IP, and any API → kubelet path (`kubectl logs / exec / top`, metrics-server) fails with `x509: certificate is valid for …, not <private-ip>`.

Add a Kairos `stages.boot` block that detects the private IP and writes `node-ip:` to `/etc/rancher/k3s/config.yaml` before k3s starts:

```yaml
stages:
  boot:
    - name: "detect hetzner private ip"
      if: '[ ! -f /etc/rancher/k3s/config.yaml ]'
      commands:
        - mkdir -p /etc/rancher/k3s
        - |
          PRIVATE_IP=$(ip -4 -o addr show | awk '$4 ~ /^10\./ {print $4}' | cut -d/ -f1 | head -1)
          [ -n "$PRIVATE_IP" ] && printf 'node-ip: %s\n' "$PRIVATE_IP" > /etc/rancher/k3s/config.yaml
```

k3s reads `/etc/rancher/k3s/config.yaml` at startup; setting `node-ip` there is equivalent to passing `--node-ip` on the command line, and makes kubelet include the IP in its certificate's SAN from the very first registration.

### Cilium CNI with native routing on Hetzner private networks

If you replace the default k3s CNI (Flannel) with [Cilium](https://cilium.io/) in `routingMode: native` and rely on Cilium to install pod-CIDR routes between nodes via `auto-direct-node-routes: true`, you may need one extra Cilium flag on Hetzner Cloud: **`direct-routing-skip-unreachable: true`**.

**When it's needed.** The failure mode surfaces on **multi-location** Hetzner private networks — nodes spread across datacenters (`nbg1` / `fsn1` / `hel1` / ...) attached to the same private network. Hetzner routes cross-location traffic through a virtual gateway (typically `10.0.0.1`), so nodes in different DCs are not L2-adjacent from Cilium's perspective and `auto-direct-node-routes` refuses the route. A single-location deployment (all nodes on the same vSwitch, same DC) is L2-direct and generally does not hit this — but the flag is safe to set anyway and costs nothing at runtime, so it's reasonable to treat it as always-on for any Hetzner private network that spans DCs or that may grow to. This documentation was tested on a 3-node cluster with one node per DC.

**Why it's needed.** Cilium's `auto-direct-node-routes` installer refuses to program a route whose next hop is not directly reachable on the same L2 segment. On multi-location Hetzner private networks the virtual gateway sits between nodes and breaks that assumption. Without the flag, Cilium logs errors like:

```
Unable to install direct node route
route to destination 10.0.1.5 contains gateway 10.0.0.1,
must be directly reachable.
Add `direct-routing-skip-unreachable` to skip unreachable routes
```

and refuses to install cross-node pod routes. Symptom in the cluster: pods on any given node can only reach pods on the same node; cross-node DNS, `kubernetes.default.svc`, and any workload that relies on cross-node traffic silently time out. `cilium status` reports `Cluster health: 1/N reachable`.

**Fix.** Pass the flag in the Cilium Helm values:

```yaml
routingMode: native
ipv4NativeRoutingCIDR: 10.0.0.0/8         # matches the Hetzner Private Network you created (ip_range); covers all subnets across locations
autoDirectNodeRoutes: true
directRoutingSkipUnreachable: true         # required on Hetzner private networks
```

`ipv4NativeRoutingCIDR` must cover the full private network range — not just the subnet — so that Cilium applies native routing to all node-to-node traffic regardless of which subnet a node lands in. See the [Cilium native routing docs](https://docs.cilium.io/en/stable/network/concepts/routing/#native-routing) and [`directRoutingSkipUnreachable`](https://docs.cilium.io/en/stable/helm-reference/) in the Helm reference.

Setting it via kubectl on an already-deployed cluster (recovery path):

```bash
kubectl patch configmap cilium-config -n kube-system \
  --type=merge -p '{"data":{"direct-routing-skip-unreachable":"true"}}'
kubectl rollout restart daemonset/cilium daemonset/cilium-envoy -n kube-system
```

**Cascading failure to be aware of.** If Cilium loses cross-node routing (agent restart, node event, or first bootstrap without the flag), the Hetzner CCM pod scheduled on a non-API-server node also loses reachability to `kubernetes.default.svc`. The CCM crashes with `invalid CIDR address` on the route-provider init path and skips the `node-route-controller` entirely — creating a circular dependency where CCM needs pod networking to program Hetzner routes, and pod networking needs the flag above. Fix Cilium first; the CCM recovers on its own once cross-node traffic is restored.

## See also

The `write_files` + base64 pattern shown above can drop any `HelmChart` (or other YAML) into k3s's auto-deploy directory at first boot — it isn't specific to the Hetzner CCM. Combined with the Kairos `stages.boot` block, you can also fetch external manifests from the network before k3s starts.

**Ready-to-deploy cloud-config variants** for Hetzner Cloud — bundling the fixes documented above (`clusterCIDR`, private-IP detection, optional Gateway API CRDs) into copy-paste files — are maintained in the [Hadron repository's `examples/` directory](https://github.com/kairos-io/hadron/tree/main/examples).

**Modern ingress.** The Kubernetes `Ingress` resource has been feature-frozen since the Gateway API reached GA. k3s 1.32+ bundles Traefik v3, which has a native [Gateway API](https://gateway-api.sigs.k8s.io/) provider — you can enable it without replacing the bundled chart by *not* passing `--disable=traefik` and dropping a small `HelmChartConfig` that sets `providers.kubernetesGateway.enabled: true`. The `examples/` directory above includes a ready-made variant. For other CNI choices the [Cilium k3s installation guide](https://docs.cilium.io/en/stable/installation/k3s/) describes the corresponding k3s flags and Helm values.
