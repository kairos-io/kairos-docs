---
title: "RaspberryPi"
linkTitle: "RaspberryPi"
weight: 4
date: 2022-11-13
description: Install Kairos on RaspberryPi
---

{{% alert title="Info" color="info" %}}
Kairos supports Raspberry Pi model 3 and 4 with 64bit architecture.
{{% /alert %}}

{{% alert title="Warning" color="warning" %}}
Model 5 is currently not supported because of how we use U-boot to boot the device. There's currently some work from the people from SUSE, see https://github.com/openSUSE/u-boot/pull/29 for more information.
{{% /alert %}}


If you are not familiar with the process, it is suggested to follow the [quickstart](/getting-started/) first to see how Kairos works.

## Prerequisites

- An SD card which size is at least 16 GB
- Etcher or `dd`
- A Linux host where to flash the device

## Download

Extract the `img` file from a container image as described [in this page]({{< relref "../reference/image_matrix" >}})

## Flash the image

Plug the SD card to your system. To flash the image, you can either use Etcher or `dd`. Note it's compressed with "XZ", so we need to decompress it first:

```bash {class="only-flavors=openSUSE+Leap-15.6,openSUSE+Tumbleweed,Ubuntu+20.04,Ubuntu+22.04,Alpine+3.19"}
sudo dd if={{<image variant="standard" model="rpi4" arch="arm64" suffix=".raw">}} of=<device> oflag=sync status=progress bs=10MB
```

Once the image is flashed, there is no need to carry any other installation steps. We can boot the image, or apply our config.

## Boot

Use the SD Card to boot. The default username/password is `kairos`/`kairos`.
To configure your access or disable password change the `/usr/local/cloud-config/01_defaults.yaml` accordingly.

## Configure your node

To configure the device beforehand, be sure to have the SD plugged in your host. We need to copy a configuration file into `cloud-config` in the `COS_PERSISTENT` partition:

```
$ PERSISTENT=$(blkid -L COS_PERSISTENT)
$ mkdir /tmp/persistent
$ sudo mount $PERSISTENT /tmp/persistent
$ sudo mkdir /tmp/persistent/cloud-config
$ sudo cp cloud-config.yaml /tmp/persistent/cloud-config
$ sudo umount /tmp/persistent
```

You can push additional `cloud config` files. For a full reference check out the [docs]({{< relref "../reference/configuration" >}}) and also [configuration after-installation]({{< relref "../advanced/after-install" >}})