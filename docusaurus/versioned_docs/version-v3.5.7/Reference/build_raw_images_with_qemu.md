---
title: "Build Raw images with QEMU"
sidebar_label: "Build Raw images with QEMU"
sidebar_position: 5
description: This article shows how to bring your own image with Kairos, and build a Kairos derivative from scratch using base container images from popular distributions such as Ubuntu, Fedora, openSUSE, etc.
---

This page provides a reference guide on how to build raw images for Kairos using QEMU. It covers the process of using a default cloud configuration and a script to generate bootable images. The cloud configuration can be customized to suit different use cases. This mechanism can be used to create golden images, or simply be an alternative to use tools like Packer. 

:::tip Note
This method differs from the ones documented in the [Auroraboot](/docs/v3.5.7/Reference/auroraboot/) section: this method is suitable if you need to create appliances that have to run a full-installation. AuroraBoot will create instead images pre-installed which will skip the usual Kairos installation process in runtime
:::

For more information about AuroraBoot, see the [AuroraBoot Reference](/docs/v3.5.7/Reference/auroraboot/).

## Requirements

The following tools are required in the system:

- `qemu`
- A Kairos ISO (or a custom built one)

## Default Cloud Configuration
The following is the default `cloud-config` file used for Kairos. You can modify this file as needed to fit your environment:

```yaml
#cloud-config

hostname: kairos-{{ trunc 4 .MachineID }}

# Automated install block
install:
  # Device for automated installs
  device: "auto"
  # Reboot after installation
  reboot: false
  # Power off after installation
  poweroff: true
  # Set to true to enable automated installations
  auto: true

## Login
users:
- name: "kairos"
  passwd: kairos
  groups:
  - admin
  #lock_passwd: true
  #ssh_authorized_keys:
  #- github:mudler

stages:
  boot:
  - name: "Repart image"
    layout:
      device:
        label: COS_PERSISTENT
      expand_partition:
        size: 0 # all space
    commands:
      # grow filesystem if not used 100%
      - |
         [[ "$(echo "$(df -h | grep COS_PERSISTENT)" | awk '{print $5}' | tr -d '%')" -ne 100 ]] && resize2fs /dev/disk/by-label/COS_PERSISTENT
```

:::tip Note
`install.poweroff` is set to `true` to power off the machine after installation and `install.auto` is set to `true` to enable automated installations. Both of these settings are **needed** to function properly.
:::

## Script to Build Raw Images

Use the following Bash script to generate raw bootable images using QEMU. This script takes a cloud-init YAML file as an argument and creates a raw disk image for Kairos.

```bash
#!/bin/bash
# Generates raw bootable images with qemu
set -ex
CLOUD_INIT=${1:-cloud_init.yaml}
QEMU=${QEMU:-qemu-system-x86_64}
ISO=${2:-iso.iso}

mkdir -p build
pushd build
touch meta-data
cp -rfv $CLOUD_INIT user-data

mkisofs -output ci.iso -volid cidata -joliet -rock user-data meta-data
truncate -s "+$((20000*1024*1024))" disk.raw

${QEMU} -m 8096 -smp cores=2 \
        -nographic -cpu host \
        -serial mon:stdio \
        -rtc base=utc,clock=rt \
        -chardev socket,path=qga.sock,server,nowait,id=qga0 \
        -device virtio-serial \
        -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
        -drive if=virtio,media=disk,file=disk.raw \
        -drive format=raw,media=cdrom,readonly=on,file=$ISO \
        -drive format=raw,media=cdrom,readonly=on,file=ci.iso \
        -boot d \
        -enable-kvm
```

### Script Breakdown
1. **Cloud-init Setup**: Copies the cloud-init configuration to the build directory.
2. **Metadata**: Creates an empty `meta-data` file as required by cloud-init.
3. **ISO Creation**: Creates a cloud-init ISO image (`ci.iso`) with `mkisofs`.
4. **Disk Image**: Generates a raw disk image (`disk.raw`) with a size of 20 GB.
5. **QEMU Command**: Uses QEMU to boot the Kairos installer with:
   - 8 GB memory (`-m 8096`)
   - 2 CPU cores (`-smp cores=2`)
   - KVM acceleration (`-enable-kvm`)
   - Attaching the raw disk and ISO images as drives.

## Customizing the Cloud Configuration and Building the Image

To customize your installation:
1. Modify the `cloud-config` YAML as needed.
2. Pass the modified configuration as an argument to the script (optionally, pass the Kairos ISO as the second argument):

```bash
./build_image.sh my_custom_cloud_config.yaml
```

This script will generate a raw disk image with the specified cloud configuration.
