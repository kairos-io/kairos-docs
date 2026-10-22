---
title: "Installation on OVHcloud bare metal"
sidebar_label: "Installation on OVHcloud bare metal"
sidebar_position: 5
date: 2026-10-21
description: Install Kairos on an OVHcloud dedicated server with Bring Your Own Image
slug: /installation/ovhcloud
---

This page describes how to install Kairos on an [OVHcloud](https://www.ovhcloud.com/) dedicated server. OVHcloud does not offer Kairos as an OS template. Instead, you build a Kairos raw disk image with [AuroraBoot](/docs/reference/auroraboot/), publish it at an HTTPS URL, and install it with the OVHcloud **Bring Your Own Image** (BYOI) feature.

The procedure on this page was tested with Kairos on [Hadron](/hadron-docs/) and k3s, on a cluster of OVHcloud servers of two models:

| Board | CPU | Boot mode | NIC |
|---|---|---|---|
| Intel DH67BL | Xeon E3-1245 v2 | Legacy BIOS | Intel 82579V (`e1000e`) |
| Supermicro X10SRi-F | Xeon E5-1630 v4 | UEFI, Secure Boot off | Intel I350 (`igb`) |

## Prerequisites

- An OVHcloud dedicated server that supports BYOI.
- Docker, to build the image.
- A place to host the image at a public HTTPS URL. A GitHub release asset works. OVHcloud downloads the image from this URL.
- An SSH key to put in the cloud-config.

## Step 1: Find the boot mode of the server

The BYOI install form asks for an EFI bootloader path. This does not mean that the server boots in UEFI mode. Some OVHcloud servers boot in legacy BIOS mode. An EFI disk image does not start on such a server, and you see no error: the server does not come back after the install.

To find the boot mode, install one of the OVHcloud Linux templates on the server first. Then log in and run:

```bash
ls /sys/firmware/efi
```

- If the directory exists, the server boots in UEFI mode. Build an EFI image.
- If the directory does not exist, the server boots in legacy BIOS mode. Build a BIOS image.

Do this for each server model. Servers in the same OVHcloud account can boot in different modes. In the tested cluster, the older servers boot in legacy BIOS mode and the newer ones in UEFI mode. If you have servers of both kinds, build two images from the same Kairos image: one with `disk.bios=true` and one with `disk.efi=true`.

While you are logged in, also record:

- The network interface, its driver and its firmware version: `ip -br addr` and `ethtool -i <interface>`.
- The disks: `lsblk`. OVHcloud templates often mirror two disks with software RAID. A Kairos BYOI image uses one disk only.
- The IPv6 configuration in `/etc/netplan/`. OVHcloud assigns IPv6 statically. IPv4 comes from DHCP.

## Step 2: Build the Kairos image

Build a Kairos image from a Hadron base with `kairos-init`. See [Kairos Factory](/docs/reference/kairos-factory/) for all the options. This example adds k3s:

```dockerfile
FROM quay.io/kairos/kairos-init:{{< KairosInitVersion >}} AS kairos-init

FROM ghcr.io/kairos-io/hadron:main
ARG VERSION=v1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init -l debug -s install -m generic -p k3s --version "${VERSION}" && \
    /kairos-init -l debug -s init -m generic -p k3s --version "${VERSION}"
```

```bash
docker build -t kairos-ovh:latest .
```

:::tip NIC firmware
Hadron ships almost no firmware. Many server NICs keep their firmware on the card and work without it. For example, the Intel 82579V (`e1000e`) and the Intel I350 (`igb`) on the tested servers need no firmware file. Other NICs need firmware from the OS, for example the Intel E810 (`ice`). To add firmware, see [Adding Linux firmware to Hadron](/hadron-docs/linux-firmware/). Add the firmware to the Hadron base image, before `kairos-init` runs, so that the initramfs includes it too.
:::

## Step 3: Write the cloud-config

OVHcloud gives you no remote console for some servers. Bake into the image everything that you need to reach the server and to debug it. This example:

- Creates the `kairos` user with your SSH keys and a password for the local console.
- Turns off password login over SSH.
- Adds debug output to the kernel command line from the second boot on.

```yaml
#cloud-config
hostname: kairos-{{ trunc 4 .MachineID }}

users:
  - name: kairos
    # Hash of the console password. Create it with: openssl passwd -6
    passwd: "$6$..."
    groups: [admin]
    ssh_authorized_keys:
      - "ssh-ed25519 AAAA..."
      - "github:<your-github-user>"

k3s:
  enabled: true

stages:
  initramfs:
    - name: "Debug kernel command line"
      if: '! grub2-editenv /oem/grubenv list | grep -q "^extra_cmdline=rd.immucore.debug"'
      commands:
        - grub2-editenv /oem/grubenv set "extra_cmdline=rd.immucore.debug rd.kairos.debug"
    - name: "sshd: keys only"
      files:
        - path: /etc/ssh/sshd_config.d/00-keys-only.conf
          permissions: 0644
          content: |
            PasswordAuthentication no
            KbdInteractiveAuthentication no
```

Put each SSH key in the cloud-config as a literal key. A `github:` entry needs the network, so it does not help when the network does not come up.

:::warning Do not use `grub_options` for the debug command line
In some Kairos versions, a top-level `grub_options` block unmounts `/oem` during the first boot. Then the k3s provider does not find its configuration and k3s does not start until the next reboot. See [kairos-io/kairos#5168](https://github.com/kairos-io/kairos/issues/5168). The `initramfs` stage above writes the same setting into `/oem/grubenv` and does not have this problem.
:::

## Step 4: Build the raw disk with AuroraBoot

Set `disk.bios=true` or `disk.efi=true` to match the boot mode from Step 1. `disk.size` is in MB. Make it smaller than the disk of the server.

```bash
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD:/aurora -v $PWD/cloud-config.yaml:/cloud-config.yaml \
  --rm quay.io/kairos/auroraboot:{{< AuroraBootVersion >}} \
  --set "container_image=docker://kairos-ovh:latest" \
  --set "disk.bios=true" \
  --set "disk.size=20000" \
  --set "disable_http_server=true" \
  --set "disable_netboot=true" \
  --set "state_dir=/aurora" \
  --cloud-config /cloud-config.yaml
```

Convert the raw disk to a compressed qcow2 image. This makes the download smaller:

```bash
qemu-img convert -c -O qcow2 kairos-*.raw kairos-ovh.qcow2
sha256sum kairos-ovh.qcow2
```

Boot the image in QEMU before you upload it. For a BIOS image, QEMU without extra firmware options boots in BIOS mode. For an EFI image, give QEMU an OVMF firmware.

Upload `kairos-ovh.qcow2` to your HTTPS location.

## Step 5: Install the image with BYOI

1. In the OVHcloud control panel, open the server and start an OS install.
2. Select **Bring Your Own Image**.
3. Set the image URL to the HTTPS URL of `kairos-ovh.qcow2`.
4. Set the image type to `qcow2`.
5. Set the EFI bootloader path to `\EFI\BOOT\BOOTX64.EFI`. An EFI image has its bootloader at this path. A BIOS server does not use the value.
6. Optional: set the checksum to the SHA-256 value from Step 4.
7. Start the install.

## Step 6: Follow the first boot

During the install the server boots an OVHcloud install system. That system answers ping, so a ping reply does not show that Kairos is running.

After OVHcloud writes the image, the server reboots into Kairos. The first boot of a raw disk image does these steps:

1. The server boots into recovery mode.
2. Kairos creates the state and persistent partitions in the free space of the disk.
3. Kairos resets itself and reboots into the active system.
4. The persistent partition grows to fill the rest of the disk.

On the tested servers, these steps took about 4 minutes after OVHcloud rebooted the server. During recovery mode you can already log in over SSH.

When the server is up, log in and look at the system:

```bash
ssh kairos@<server-ip>
ls /run/cos/                        # active_mode or recovery_mode
sudo k3s kubectl get nodes
sudo journalctl --list-boots
```

## Add worker nodes

A k3s cluster on OVHcloud servers sends pod traffic between nodes over the public network. To encrypt that traffic, run flannel with the WireGuard backend. On the server node, add the flag to the k3s arguments:

```yaml
k3s:
  enabled: true
  args:
    - --flannel-backend=wireguard-native
```

Flannel then sends the pod traffic between nodes through WireGuard tunnels on UDP port 51820. The traffic from the agents to the API server uses TLS already. The Hadron kernel includes the `wireguard` module.

On a worker node, enable `k3s-agent` and give it the URL of the server and the join token. The token is in `/var/lib/rancher/k3s/server/node-token` on the server node:

```yaml
k3s-agent:
  enabled: true
  env:
    K3S_URL: https://<server-ip>:6443
    K3S_TOKEN: <token>
```

The token gives access to the cluster. Do not put it in an image that you host at a public URL. Put it on the node after the install instead, for example in `/oem/95_join.yaml` over SSH, and reboot.

The k3s provider configures `k3s-agent` only once, on the first boot of the active system. After that it writes `/usr/local/.kairos/deployed` and does not run again. A worker that started without `K3S_URL` therefore ignores a join file that you add later. To let the worker image accept the join file on a later boot, add a stage that removes the marker while the agent has no server URL:

```yaml
stages:
  boot.before:
    - name: "Retry the k3s-agent setup until it has a server URL"
      if: '! grep -q "K3S_URL" /etc/sysconfig/k3s-agent 2>/dev/null'
      commands:
        - rm -f /usr/local/.kairos/deployed
```

After the reboot, check on the server node that the worker is `Ready` and uses WireGuard:

```bash
sudo k3s kubectl get nodes -o wide
sudo k3s kubectl get node <worker> -o jsonpath='{.metadata.annotations.flannel\.alpha\.coreos\.com/backend-type}'
```

The second command prints `wireguard`.

## Troubleshooting

- **The server does not come back after the install.** Look at the boot mode again (Step 1). An EFI image on a BIOS server, or a BIOS image on a UEFI server, does not boot. The server then also does not answer ping.
- **The server answers ping but SSH does not open.** Kairos possibly started, but the network failed later in the boot. If the server has a remote console, log in there with the console password and run `ip addr` and `journalctl -b -p err`.
- **IPv6 is not configured.** OVHcloud assigns IPv6 statically. Add the address and the gateway that OVHcloud gives you to the network configuration of the node.
