---
title: "Network booting"
sidebar_label: "Network booting"
sidebar_position: 5
date: 2022-12-01
description: Install Kairos from network
---

Most modern hardware supports booting an operating system from the network.
The technology behind this is called [Preboot Execution Environment](https://en.wikipedia.org/wiki/Preboot_Execution_Environment).
PXE booting Kairos needs three files: a kernel, an initrd and a squashfs rootfs. These are not shipped as standalone release assets — you obtain them from a Kairos OCI image or ISO.

The recommended way to do this is with [AuroraBoot](/docs/reference/auroraboot), which pulls a Kairos OCI image, extracts the netboot artifacts and serves them over HTTP, with built-in ProxyDHCP so a target machine on the same network can boot directly. If you'd rather plug Kairos into an existing PXE/TFTP setup, AuroraBoot can also extract the same artifacts ahead of time from a Kairos ISO so you can serve them yourself.

Generic hardware-based netboot setup (PXE BIOS configuration, DHCP, etc.) is out of scope for this document.

## Run Kairos from RAM with local persistent data

The in-RAM workflow is useful for machines that load the Kairos root filesystem
into memory from live media or PXE, but still need machine-specific
configuration and persistent data on a local disk. The machine does not need
`COS_STATE` or `COS_ACTIVE` partitions. It mounts:

- `COS_OEM` at `/oem` for cloud config and user data
- `COS_PERSISTENT` at `/usr/local` for persistent state

Add a `kairos.ram.*` option to the kernel command line to select this workflow.
Use the bare `kairos.ram` option if you do not need any of the partition
options:

```text
kairos.ram
```

For first boot on an empty disk, let Kairos create the local partitions:

```text
kairos.ram.create_partitions
```

Kairos selects the largest eligible empty disk. Removable media, CD-ROMs, and
virtual block devices such as loop and device-mapper devices are excluded. To
select a disk yourself, pass its path:

```text
kairos.ram.create_partitions=/dev/vda
```

The default `COS_OEM` size is 64 MiB. `COS_PERSISTENT` uses the rest of the
disk. Override either size with a plain integer in MiB:

```text
kairos.ram.create_partitions=/dev/vda kairos.ram.oem=128 kairos.ram.persistent=10240
```

If one of the partitions already exists, Kairos keeps it and creates only the
missing partition. Kairos refuses to repartition a disk that contains unrelated
partitions unless you add `kairos.ram.wipe`.

:::danger

`kairos.ram.wipe` allows Kairos to replace an existing partition table and
destroys all data on the selected disk.

:::

With AuroraBoot, put the same options in `netboot.cmdline`. With another PXE
server, add them to the kernel command line in its boot entry.

Because in-RAM mode does not install the system, provide [cloud
config](/docs/reference/configuration) on every boot. This is especially
important on the first boot, when the machine needs user data such as login
credentials. Bundle the config with the boot artifacts, use a supported metadata
source, or add `kairos.config_url=<URL>` to the kernel command line to fetch it
from a central server. `kairos.config_url` is particularly useful with PXE
because the server can keep both the boot configuration and machine
configuration centralized.

An in-RAM boot is reported as `active_boot`, so both of these sentinel files
exist after immucore finishes:

```text
/run/cos/active_mode
/run/cos/in_ram_mode
```

Use `/run/cos/in_ram_mode` when a script must distinguish an in-RAM root
filesystem from a regular active boot:

```bash
if [ -e /run/cos/in_ram_mode ]; then
  echo "Kairos is running from RAM"
fi
```

## Use AuroraBoot

```bash
docker run --rm -ti --net host quay.io/kairos/auroraboot \
                    --set "container_image={{< OCI variant="standard" >}}"
                    # Optionally:
                    # --cloud-config ....
```

This will netboot the <OCICode variant="standard" /> image. AuroraBoot listens for PXE requests on the host network and serves the boot artifacts to any machine on that network configured to boot from the network. See the [AuroraBoot documentation](/docs/reference/auroraboot) for more options (cloud-config, custom command line, disabling DHCP if you already have one, etc.).

If your hardware doesn't support PXE booting from firmware, you can use our [generic iPXE ISO](https://github.com/kairos-io/ipxe-dhcp/releases) to bootstrap iPXE, which will then look for AuroraBoot (or any other ProxyDHCP server) on the network.

## Use your own netboot server

If you'd rather plug Kairos into an existing netboot setup (pixiecore, dnsmasq, a PXE/TFTP server you already run), AuroraBoot exposes two subcommands to support that workflow.

First, extract the kernel, initrd and squashfs from a Kairos ISO:

```bash
docker run --rm -v $PWD:/work quay.io/kairos/auroraboot \
    netboot /work/kairos.iso /work/out kairos
```

This writes `kairos-kernel`, `kairos-initrd` and `kairos.squashfs` into `./out`. Feed those files into your existing server.

If you don't have a netboot server yet, AuroraBoot can be one. The `start-pixie` subcommand runs Pixiecore directly against the artifacts above:

```bash
docker run --rm --net host -v $PWD:/work quay.io/kairos/auroraboot \
    start-pixie /work/cloud-config.yaml /work/out/kairos.squashfs 0.0.0.0 8090 \
                /work/out/kairos-initrd /work/out/kairos-kernel
```

Pixiecore acts as a ProxyDHCP server, so it integrates with whatever DHCP server is already on the network — target machines configured to PXE-boot will pick up the kernel and initrd served on the address and port you passed.
