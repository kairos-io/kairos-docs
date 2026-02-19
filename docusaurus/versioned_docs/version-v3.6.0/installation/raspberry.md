---
title: "RaspberryPi"
sidebar_label: "RaspberryPi"
sidebar_position: 4
date: 2022-11-13
description: Install Kairos on RaspberryPi
---

:::info Info
Kairos supports Raspberry Pi model 3 and 4 with 64bit architecture.
:::

:::warning Warning
Model 5 is currently not supported because of how we use U-boot to boot the device. There's currently some work from the people from SUSE, see https://github.com/openSUSE/u-boot/pull/29 for more information.
:::


If you are not familiar with the process, it is suggested to follow the [quickstart](/getting-started/) first to see how Kairos works.

## Prerequisites

- An SD card which size is at least 16 GB
- Etcher or `dd`
- A Linux host where to flash the device

## Install using AuroraBoot

Create `build` directory and add `cloud-config.yaml`, then run:

```bash
docker run --rm --privileged -v /var/run/docker.sock:/var/run/docker.sock \
                --platform linux/arm64 -v $PWD/build/:/output \
                quay.io/kairos/auroraboot:latest \
                --debug --set "disable_http_server=true" --set "disable_netboot=true" \
                --set "state_dir=/output" --set "disk.raw=true" \
                --cloud-config /output/cloud-config.yaml \
                --set "container_image={{< oci variant="standard" model="rpi4" arch="arm64" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}}"
```

Once complete, use Etcher or `dd` to flash the image to an SD card:

```bash {class="only-flavors=openSUSE+Leap-15.6,openSUSE+Tumbleweed,Ubuntu+20.04,Ubuntu+22.04,Alpine+3.19"}
sudo dd if=build/{{< image variant="standard" model="rpi4" arch="arm64" suffix=".raw" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}} of=<device> oflag=sync status=progress bs=10M
```

## Install using images

### Download

Extract the `img` file from a container image as described [in this page](/docs/v3.6.0/reference/image_matrix/)

### Flash the image

Plug the SD card to your system. To flash the image, you can either use Etcher or `dd`:

```bash {class="only-flavors=openSUSE+Leap-15.6,openSUSE+Tumbleweed,Ubuntu+20.04,Ubuntu+22.04,Alpine+3.19"}
sudo dd if={{< image variant="standard" model="rpi4" arch="arm64" suffix=".raw" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" >}} of=<device> oflag=sync status=progress bs=10MB
```

Once the image is flashed, there is no need to carry out any other installation steps, it can be booted right away. However you may want to add a `cloud-config` at this point - see below.

### Boot

Use the SD Card to boot the device.
During the first boot, the system will enter recovery mode and create the `COS_STATE` and `COS_PERSISTENT` volumes.
After creating the volumes, the system will automatically reboot. This process may take a few minutes depending on the size and speed of the storage.
The default username/password for the system is `kairos`/`kairos`.
To configure your access or disable password change the `/oem/90_custom.yaml` accordingly.

### Configure your node

To configure the device beforehand, be sure to have the SD plugged in your host. We need to overwrite the default configuration file with the desired `cloud-config` in the `COS_OEM` partition:

```
$ OEM=$(blkid -L COS_OEM)
$ mkdir /tmp/oem
$ sudo mount $OEM /tmp/oem
$ sudo cp cloud-config.yaml /tmp/oem/90_custom.yaml
$ sudo umount /tmp/oem
```

You can push additional `cloud config` files. For a full reference check out the [docs](/docs/v3.6.0/reference/configuration/) and also [configuration after-installation](/docs/v3.6.0/advanced/after-install/)
