---
title: "The Kairos Factory"
linkTitle: "The Kairos Factory"
weight: 4
description: "Converting any base image into a Kairos ready image"
---

{{% alert title="Ongoing Project" %}}
The Kairos factory is an ongoing project. Things might change, and we are working on improving the documentation and the process. If you encounter any issues, please feel free to open up issues and help us improve the Documentation!

For further info check out [#1914](https://github.com/kairos-io/kairos/issues/1914)
{{% /alert %}}

Kairos is not just an OS, it's also a way to turn an existing OS into a Kairos-ready image. This process is called "Kairosification" and it's done by the Kairos Factory.

For the newcomer or someone who simply needs an immutable OS with k3s and edgeVPN, the Kairos OS is the way to go. As long as this components work, you don't need to worry about the changes in the underlying OS. However, if you need to ensure certain packages are present or remain stable in your system, you can use the Kairos Factory to convert your base image into a Kairos-ready image. This is particularly useful if you have special firmware requirements, or if you want to have your own release cadence.

## Before we begin

In order to run the Kairos Factory, you will need docker and earthly installed on your system. You can find the installation instructions for both tools in the following links:

- [Docker](https://docs.docker.com/get-docker/)
- [Earthly](https://docs.earthly.dev/getting-started/install)

And you must also clone the Kairos repository:

```bash
git clone https://github.com/kairos-io/kairos
cd kairos
```

## The Kairos Factory Process

The process consists of three main steps:

1. Build your own base image
2. Feed your base image to the Kairos Factory
3. Consume your Kairos-ready artifacts

### Examples

#### Pre-installing all firmware on a UKI image

If you need to pre-install all firmware on a UKI image, you can use the following Dockerfile:

```Dockerfile
FROM ubuntu:24.04
RUN apt-get update
RUN apt-get install -y --no-install-recommends \
    linux-image-generic-hwe-24.04
RUN apt-get clean && rm -rf /var/lib/apt/lists/*
```

Now we can build this image with Docker:

```bash
docker build -t my-base-image .
```

And then we can feed this image to the Kairos Factory:

```bash
earthly +base-image \
  --BASE_IMAGE=my-base-image \ # The image we just built
  --FAMILY=ubuntu \ # Kairos groups images by family, in this case Ubuntu has its own
  --FLAVOR=ubuntu \ # The flavor of the image, in this case Ubuntu
  --FLAVOR_RELEASE=24.04 \ # The release of the flavor
  --MODEL=generic \ # We are building for a generic model which can be used on a VM or hardware but not on a RPi or similar boards
  --VARIANT=core \ # We have standard images that comes with K3s, or core images that are just the base OS
  --BOOTLOADER=systemd-boot # The bootloader to use, in the case of UKI it has to be systemd-boot
```

Earthly will output an OCI artifact with a tag similar to `quay.io/kairos/ubuntu:24.04-core-amd64-generic-v3.1.0`. I'd recommend you re-tag this to something that makes sense to you, for example:

```bash
docker tag quay.io/kairos/ubuntu:24.04-core-amd64-generic-v3.1.0 ttl.sh/kairos-base-image:24h
docker push ttl.sh/kairos-base-image:24h
```

Now we can produce the UKI artifact that we will use to boot our machines:

```bash
earthly +uki-iso --BASE_IMAGE=ttl.sh/kairos-base-image:24 \
  --ENKI_KEYS_DIR=/path/to/keys
```

This will output an ISO file that you can use to boot your machines e.g.:

```
build/kairos_1040909.iso
```
