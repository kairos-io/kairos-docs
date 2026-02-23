---
title: "Network booting"
sidebar_label: "Network booting"
sidebar_position: 5
date: 2022-12-01
description: Install Kairos from network
---

Most hardware these days, supports booting an operating system from the network.
The technology behind this is called [Preboot Execution Environment](https://en.wikipedia.org/wiki/Preboot_Execution_Environment).
Kairos releases include artifacts to allow booting from the network. In general, the following files are needed:

- The initrd image: It's the system that loads first. It's responsible to load the kernel.
- The kernel: This is the kernel of the operating system that will boot.
- The squashfs: The filesystem of the operating system that will boot.

Booting using these files can happen in multiple ways:

- Either with direct support from the machine BIOS plus network configuration (DHCP server etc).
- Software based network booting. This works with a special ISO, built with
  [ipxe](https://ipxe.org/) project. Kairos releases include pre-built ISOs for
  netbooting (named like `*.ipxe.iso.ipxe`).
- Use [AuroraBoot](/docs/v3.6.0/reference/auroraboot/)

Generic hardware based netbooting is out of scope for this document.
Below we give instructions on how to use the Kairos release artifacts to netboot and how to use [AuroraBoot](/docs/v3.6.0/reference/auroraboot/) to boot from network.

## Boot with pre-built ISOs

The ipxe ISOs from the Kairos release artifacts, were built with a ipxe script that points directly to the
`kernel`, `initrd` and `squashfs` artifacts of the same release on GitHub.

E.g.:

```bash
#!ipxe
set url https://github.com/kairos-io/kairos/releases/download/v3.6.0
set kernel {{< image variant="standard" suffix="-kernel" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}
set initrd {{< image variant="standard" suffix="-initrd" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}
set rootfs {{< image variant="standard" suffix=".squashfs" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}

# Configure interface
ifconf

# set config https://example.com/machine-config
# set cmdline extra.values=1
kernel ${url}/${kernel} initrd=${initrd} rd.neednet=1 ip=dhcp rd.cos.disable root=live:${url}/${rootfs} netboot install-mode config_url=${config} console=tty1 console=ttyS0 ${cmdline}
initrd ${url}/${initrd}
boot
```

Booting the ISO will automatically download and boot those artifacts. E.g. using qemu:

```bash
#!/bin/bash

qemu-img create -f qcow2 disk.img 40g
qemu-system-x86_64 \
    -m 4096 \
    -smp cores=2 \
    -nographic \
    -drive if=virtio,media=disk,file=disk.img \
    -drive if=ide,media=cdrom,file=${1:-kairos.iso}

```

## Use AuroraBoot

[AuroraBoot](/docs/v3.6.0/reference/auroraboot/) is a Kairos convinience tool that can be used to quickly deploy Kairos from Network with zero-touch configuration, for instance:

```bash
docker run --rm -ti --net host quay.io/kairos/auroraboot \
                    --set "container_image={{< oci variant="standard" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}"
                    # Optionally:
                    # --cloud-config ....
```

Will netboot the <OCICode variant="standard" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" /> image. You can find more details in the [AuroraBoot documentation section](/docs/v3.6.0/reference/auroraboot/).

## Notes on booting from network

Another way to boot with the release artifacts is using [pixiecore](https://github.com/danderson/netboot/tree/master/pixiecore).
`pixiecore` acts as a server which offers net boot files over the network and it's automatically discovered on a network where a DHCP server is running and is compatible with [the pixiecore architecture](https://github.com/danderson/netboot/blob/master/pixiecore/README.booting.md).


Assuming the current directory has the `kernel`, `initrd` and `squashfs` artifacts,
`pixiecore` server can be started with `docker` like this:

```bash
#!/bin/bash

wget "https://github.com/kairos-io/kairos/releases/download/v3.6.0/{{< image variant="standard" suffix="-kernel" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}"
wget "https://github.com/kairos-io/kairos/releases/download/v3.6.0/{{< image variant="standard" suffix="-initrd" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}"
wget "https://github.com/kairos-io/kairos/releases/download/v3.6.0/{{< image variant="standard" suffix=".squashfs" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}"

cat << EOF > config.yaml
#cloud-config

hostname: "hostname.domain.tld"
users:
- name: "kairos"
  passwd: "kairos"
EOF

# This will start the pixiecore server.
# Any machine that depends on DHCP to netboot will be send the specified files and the cmd boot line.
docker run \
  -d --name pixiecore --net=host -v $PWD:/files quay.io/pixiecore/pixiecore \
    boot /files/{{< image variant="standard" suffix="-kernel" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}} /files/{{< image variant="standard" suffix="-initrd" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}} --cmdline="rd.neednet=1 ip=dhcp rd.cos.disable root=live:{{ ID \"/files/{{< image variant="standard" suffix=".squashfs" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}\" }} netboot install-mode config_url={{ ID \"/files/config.yaml\" }} console=tty1 console=ttyS0 console=tty0"
```

If your machine doesn't support netbooting, you can use our [generic image](https://github.com/kairos-io/ipxe-dhcp/releases), which is built using an ipxe script [from the pixiecore project](https://github.com/danderson/netboot/blob/master/pixiecore/boot.ipxe). The ISO will wait for a DHCP proxy response from pixiecore.

If pixiecore is successfully reached, you should see an output similar to this in the `pixiecore` docker container:

```
$ docker logs pixiecore
[DHCP] Offering to boot 08:00:27:e5:22:8c
[DHCP] Offering to boot 08:00:27:e5:22:8c
[HTTP] Sending ipxe boot script to 192.168.1.49:4371
[HTTP] Sent file "kernel" to 192.168.1.49:4371
[HTTP] Sent file "initrd-0" to 192.168.1.49:4371
```
