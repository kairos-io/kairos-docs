---
title: "Network booting"
sidebar_label: "Network booting"
sidebar_position: 5
date: 2022-12-01
description: Install Kairos from network
---

Most modern hardware supports booting an operating system from the network.
The technology behind this is called [Preboot Execution Environment](https://en.wikipedia.org/wiki/Preboot_Execution_Environment).
PXE booting Kairos needs three files: a kernel, an initrd and a squashfs rootfs. These are not shipped as standalone release assets — they are extracted from a Kairos OCI image at the moment of netboot.

The recommended way to do this is with [AuroraBoot](/docs/reference/auroraboot), which pulls the OCI image, extracts the netboot artifacts and serves them over HTTP, with built-in ProxyDHCP so a target machine on the same network can boot directly.

Generic hardware-based netboot setup (PXE BIOS configuration, DHCP, etc.) is out of scope for this document.

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
