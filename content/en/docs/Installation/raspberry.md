---
title: "RaspberryPi"
linkTitle: "RaspberryPi"
weight: 4
date: 2022-11-13
description: Install Kairos on RaspberryPi 3 and 4
---

Kairos supports Raspberry Pi model 3 and 4 with 64bit architecture.

If you are not familiar with the process, it is suggested to follow the [quickstart]({{< relref "../Getting started" >}}) first to see how Kairos works.

## Prerequisites

- An SD card which size is at least 16 GB
- Etcher or `dd`
- A Linux host where to flash the device

## Download

Extract the `img` file from a container image as described [in this page]({{< relref "../reference/image_matrix" >}})

## Flash the image

Plug the SD card to your system. To flash the image, you can either use Etcher or `dd`. Note it's compressed with "XZ", so we need to decompress it first:

```bash
xzcat {{< image variant="standard" model="rpi4" arch="arm64">}}.img.xz | sudo dd of=<device> oflag=sync status=progress bs=10MB
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

## Customizing the disk image

The following shell script shows how to locally rebuild and customize the image with docker


{{% alert title="Warning" %}}
If you're using osbuilder between versions 0.6.0 and 0.6.5, you need to pass the flag `--use-lvm` to the `build-arm-image.sh` script, the same way you pass `--local`. Starting form osbuilder 0.6.6 this will be the default behaviour.
{{% /alert %}}

{{% alert title="Notes" %}}
Validating the config is not required in the following process, but it can save you some time. Use [kairosctl]({{< relref "../reference/kairosctl" >}}) to perform the schema validations.
{{% /alert %}}

{{% alert title="Warning" %}}
From Kairos v2.4.0 onward, Raspberry Pi models 3 and 4 have different images. The images for those models are built differently. 
Make sure to set the proper `--model=` in your command (rpi3,rpi4) to build the image for your model.
{{% /alert %}}
```
# Download the Kairos image locally
IMAGE={{<oci variant="standard" model="rpi4" arch="arm64">}}
docker pull $IMAGE
# Validate the configuration file
kairosctl validate cloud-config.yaml
# Customize it
mkdir -p build
docker run -v $PWD:/HERE \
 -v /var/run/docker.sock:/var/run/docker.sock \
 --privileged -i --rm \
 --entrypoint=/build-arm-image.sh {{< registryURL >}}/osbuilder-tools:{{< osbuilderVersion >}} \
 --use-lvm \
 --model rpi4 \
 --state-partition-size 6200 \
 --recovery-partition-size 4200 \
 --size 15200 \
 --images-size 2000 \
 --local \
 --config /HERE/cloud-config.yaml \
 --docker-image $IMAGE /HERE/build/out.img
```
