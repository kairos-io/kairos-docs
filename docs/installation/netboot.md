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

Because in-RAM mode does not run an installation, nothing seeds the machine
configuration for you: provide [cloud
config](/docs/reference/configuration) yourself. This is especially
important on the first boot, when the machine needs user data such as login
credentials. Bundle the config with the boot artifacts, use a supported metadata
source, or add `kairos.config_url=<URL>` to the kernel command line to fetch it
from a central server. `kairos.config_url` is particularly useful with PXE
because the server can keep both the boot configuration and machine
configuration centralized.

User data pulled from a metadata source (NoCloud/cidata, cloud provider
metadata, …) is written to `/oem/95_userdata` on the local `COS_OEM`
partition, so it survives reboots and is not fetched again on later boots.
Config fetched through `kairos.config_url` is read on every boot instead.

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

### In-RAM boot with Trusted Boot (UKI)

The same `kairos.ram.*` options work under [Trusted
Boot](/docs/installation/trustedboot). A UKI already runs entirely from RAM, so
the regular UKI boot flow applies, with a few differences:

- The kernel command line is part of the signed UKI (or a signed addon), so the
  `kairos.ram.*` options must be baked in when the image is built and signed —
  they cannot be added or edited interactively at boot time.
- `kairos.ram.create_partitions` encrypts the partitions it creates with the
  TPM PCR policy — the same `systemd-cryptenroll` enrollment kairos-agent
  performs during a trusted-boot installation — so every later boot unlocks
  them through the TPM. There is no plaintext fallback: if encryption fails,
  the boot halts with a full-screen error. Remote key management
  (kcrypt-challenger) is not supported in this flow, because the UKI initramfs
  has no network yet when the partitions are created and unlocked.
- The boot is marked with the `/run/cos/uki_boot_mode` sentinel (not
  `uki_install_mode`), so the installer cloud-init stages do not run.

:::warning Datasources are not pulled by default under Trusted Boot
The stock datasource configuration skips pulling providers (NoCloud/cidata,
cloud provider metadata services, …) when `/run/cos/uki_boot_mode` is present:
on an installed trusted-boot system the configuration was baked into the OEM
partition at install time, so there is nothing to pull. An in-RAM boot never
runs an installation, though — without further action the machine comes up
with no per-machine configuration at all.

The recommended approach is to bundle the configuration into the image at
build time: it becomes part of the signed, measured artifact and the machine
never needs to reach out to a datasource at boot.

When the configuration must be per-machine and cannot be bundled, bake
`kairos.pull_datasources` into the signed kernel command line to pull it from
a datasource instead. The pulled user data is stored at `/oem/95_userdata` on
the (TPM-encrypted) `COS_OEM` partition, so it persists across reboots and
later boots skip the pull.
:::

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
