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
3. In the **Image** section, select any standard Linux OS (e.g., Ubuntu). This is only used for the initial provisioning — it will be overwritten by Kairos during installation as we’re gonna select the iso uploaded over the Ubuntu one.
4. Finish configuring the server and click **Create & Buy now**.

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
hostname: kairos-{{ trunc 4 .MachineID }}

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

## See also

The `write_files` + base64 pattern shown above can drop any `HelmChart` (or other YAML) into k3s's auto-deploy directory at first boot — it isn't specific to the Hetzner CCM. Combined with the Kairos `stages.boot` block, you can also fetch external manifests from the network before k3s starts.

**Ready-to-deploy cloud-config variants** for Hetzner Cloud — bundling the fixes documented above (`clusterCIDR`, private-IP detection, optional Gateway API CRDs) into copy-paste files — are maintained in the [Hadron repository's `examples/` directory](https://github.com/kairos-io/hadron/tree/main/examples).

**Modern ingress.** The Kubernetes `Ingress` resource has been feature-frozen since the Gateway API reached GA. k3s 1.32+ bundles Traefik v3, which has a native [Gateway API](https://gateway-api.sigs.k8s.io/) provider — you can enable it without replacing the bundled chart by *not* passing `--disable=traefik` and dropping a small `HelmChartConfig` that sets `providers.kubernetesGateway.enabled: true`. The `examples/` directory above includes a ready-made variant. For other CNI choices the [Cilium k3s installation guide](https://docs.cilium.io/en/stable/installation/k3s/) describes the corresponding k3s flags and Helm values.
