---
title: "Installation with Canonical MaaS"
sidebar_label: "Canonical MaaS"
sidebar_position: 8
date: 2026-08-03
description: Deploy Kairos on bare metal fleets managed by Canonical MaaS
---

Kairos can be deployed onto machines managed by [Canonical MaaS](https://maas.io/) (Metal as a Service). You build a Kairos image once, upload it to MaaS as a custom image, and MaaS deploys it to any commissioned machine. The Kairos MaaS datasource then reads the per-machine metadata (hostname, SSH keys, user-data) that MaaS provides.

## How it works

MaaS deploys custom images by writing them to disk with `dd` and then chrooting into a partition that contains a `curtin` hook script, which finalises the install in the MaaS ephemeral environment.

The MaaS-flavoured Kairos raw image differs from a regular Kairos raw image in one thing only: an additional small `COS_CURTIN` partition that carries the curtin hook. Curtin picks that partition as its target because it is the one that contains `/curtin`, and the hook then:

1. Mounts `COS_OEM` by label.
2. Extracts the MaaS datasource block (metadata URL and OAuth credentials) from the curtin config that MaaS passes in and writes it to `/oem/maas/datasource.yaml`.
3. Translates the per-machine network config that MaaS assigned (either cloud-init v1 or netplan v2) into systemd-networkd `.network` files, written as a Kairos cloud-config at `/oem/90_maas_network.yaml` for the `initramfs` stage.
4. Unmounts `COS_OEM`.

The hook does not install a kernel, GRUB, EFI entries, or an `fstab`. The Kairos image is already bootable, so once the write is done MaaS reboots the machine and Kairos takes over.

On first boot, the Kairos MaaS datasource provider (part of yip, enabled by default in the Kairos datasource list) reads `/oem/maas/datasource.yaml`, authenticates against the MaaS metadata API with OAuth 1.0, writes the hostname and `authorized_keys`, and passes the MaaS `user-data` to Kairos as cloud-config. The `90_maas_network.yaml` written by the curtin hook applies the network configuration during the `initramfs` stage.

## Building a MaaS image

Use AuroraBoot with `disk.maas=true`. AuroraBoot produces a raw disk image with the extra `COS_CURTIN` partition and compresses it with gzip. MaaS accepts the compressed image as a custom uploaded image with `filetype=ddgz`.

```bash
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD:/aurora --rm -ti quay.io/kairos/auroraboot \
  --set "disable_http_server=true" \
  --set "disable_netboot=true" \
  --set "disk.maas=true" \
  --set 'container_image={{< OCI variant="standard" >}}' \
  --set "state_dir=/aurora"
```

AuroraBoot writes two artifacts to the mounted directory: the uncompressed `kairos-*.raw` and the compressed `kairos-*.raw.gz`. Upload the `.raw.gz` to MaaS.

Pick the Kairos flavour and version you want to ship by pointing `container_image` at any image from the [image matrix](/docs/reference/image_matrix).

:::info Cloud config baked into the image
Passing `--cloud-config /path/to/cc.yaml` to the AuroraBoot command bakes the file into the image at `/oem/90_custom.yaml`. It applies on every machine regardless of MaaS assignment. The MaaS user-data you pass at deploy time (see below) is layered on top through the standard Kairos datasource mechanism, and can override values from the baked-in config. See the [cloud-init architecture page](/docs/architecture/cloud-init/#configuration-order) for how ordering and overrides work in general.
:::

:::warning Privileged container
Any raw disk build in AuroraBoot (`disk.maas`, `disk.efi`, `disk.bios`, `disk.gce`, `disk.vhd`, `disk.partitions`) needs `--privileged` because the build creates loop devices.
:::

## Uploading the image to MaaS

Upload the `.raw.gz` to your MaaS server as a custom image. From a workstation where the [MaaS CLI](https://maas.io/docs/how-to-use-the-maas-cli) is logged in as an administrator:

```bash
maas <profile> boot-resources create \
  name=custom/kairos \
  title="Kairos" \
  architecture=amd64/generic \
  filetype=ddgz \
  content@=./kairos-*.raw.gz
```

The image now appears in the MaaS UI under **Images** and can be selected when deploying a machine.

## Deploying a machine

Deploy a commissioned machine as you would with any other MaaS image. From the MaaS UI, pick the Kairos image you uploaded and click **Deploy**. From the CLI:

```bash
maas <profile> machine deploy <system-id> distro_series=custom/kairos
```

To pass Kairos cloud-config as MaaS user-data, add `user_data` (base64-encoded) to the deploy call:

```bash
maas <profile> machine deploy <system-id> \
  distro_series=custom/kairos \
  user_data=$(base64 -w0 my-cloud-config.yaml)
```

The `my-cloud-config.yaml` is a normal [Kairos cloud config](/docs/reference/configuration). It runs on first boot, so you can use it to define users, SSH keys, k3s configuration, bundles, and everything else Kairos supports.

## What lands on the machine

After the deployment finishes and Kairos boots for the first time:

- Hostname is taken from MaaS `meta-data/local-hostname` and applied as the system hostname.
- SSH public keys assigned to the deploying MaaS user are picked up from `meta-data/public-keys` and installed as `authorized_keys` for the user running the datasource stage. Users declared in your cloud config with their own `ssh_authorized_keys` are set up as usual on top of that.
- Network configuration written by the curtin hook applies at `initramfs` from `/oem/90_maas_network.yaml`.
- The Kairos cloud config you passed as `user_data` runs at the normal cloud-config stages.

Once the machine is up, `kairos-agent state get boot` should report `active_boot`.

## Troubleshooting

**The MaaS deploy fails inside curtin.** The curtin hook logs to the MaaS deployment output with the prefix `Kairos MAAS hook:`. Common causes are the image having been uploaded with the wrong `filetype` (must be `ddgz`) or a MaaS server that does not expose the `network_config` file in the curtin state (fine to ignore, Kairos will fall back to its default DHCP-on-all-interfaces behaviour).

**The machine boots but has no hostname or SSH keys.** Check `/oem/maas/datasource.yaml` on the target machine. If missing, the curtin hook did not run, which usually means the image was not built with `disk.maas=true` or MaaS did not select the `COS_CURTIN` partition as its target. If present, check the Kairos boot journal for `MAAS:` log lines from the yip datasource provider.

**Networking does not come up.** Check `/oem/90_maas_network.yaml`. The curtin hook translates cloud-init v1 and netplan v2 network configs into systemd-networkd files. If MaaS handed you a format outside those, the hook writes a message and leaves Kairos to fall back to DHCP.

## See also

- [AuroraBoot reference](/docs/reference/auroraboot) for the full list of `disk.*` build options.
- [Cloud config reference](/docs/reference/configuration) for the shape of the `user_data` payload.
- [Cloud-init architecture](/docs/architecture/cloud-init/#configuration-order) for how baked-in cloud config and datasource-provided user-data interact.
