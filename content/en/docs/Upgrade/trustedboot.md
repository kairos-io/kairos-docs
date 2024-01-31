---
title: "Trusted Boot Upgrades"
linkTitle: "Trusted Boot Upgrades"
weight: 6
date: 2022-11-13
description: >
---


{{% alert title="Warning" %}}
This section is still a work in progress and only available in Kairos v3.x releases and alphas.
{{% /alert %}}

This section covers how to upgrade a Kairos node with Trusted Boot enabled.

See the [Trusted Boot Installation]({{< relref "../installation/trustedboot" >}}) and [Trusted Boot Architecture]({{< relref "../architecture/trustedboot" >}}) pages for more references. 

### Upgrades

In order to upgrade a node to a new version of the OS, you need to generate again the installable medium with the same keys used in the steps before.

Follow the process in [Trusted Boot Installation]({{< relref "../installation/trustedboot" >}}) to generate the installable medium, and then follow the steps below to create an image that can be used for upgrades.

{{% alert title="Note" %}}
The resulting container image can be used for upgrades with `kairos-agent`.
{{% /alert %}}

The process will generate an EFI file which we will pack into a container image that will be used to upgrade the node.

First we need to extract the EFI file from the ISO file generated with what explained in the [Trusted Boot Installation documentation]({{< relref "../installation/trustedboot" >}}):

{{% alert title="Warning" %}}
This step is required until [#2171](https://github.com/kairos-io/kairos/issues/2171) is implemented.
{{% /alert %}}

```bash
mkdir iso
mkdir efiboot

sudo mount -o loop *.iso iso
sudo mount iso/efiboot.img efiboot 

cp efiboot/EFI/kairos/*.efi .
```

To generate the upgrade image you need to create a naked container image containing containing the EFI files and the `systemd-boot` configuration, for example:

{{% alert title="Warning" %}}
Flow not entirely tested/validated yet
{{% /alert %}}

```bash
VERSION=v3.0.0-alpha2
EFI_FILE=$PWD/*.efi 
UKI=kairos-fedora-38-core-amd64-generic-${VERSION}.efi
UPGRADE_IMAGE=ttl.sh/kairos-uki-tests/upgrade-image

mkdir upgrade-image
mkdir -p upgrade-image/loader/entries
mkdir -p upgrade-image/EFI/kairos/

cp -rfv $EFI_FILE upgrade-image/EFI/kairos/${UKI}

# default @saved
cat <<EOF > upgrade-image/loader/loader.conf
default kairos-$VERSION.conf
timeout 5
console-mode max
editor no
EOF

cat <<EOF > upgrade-image/loader/entries/kairos-$VERSION.conf
title Kairos $VERSION
efi /EFI/kairos/$UKI
version $VERSION
EOF

cd upgrade-image
docker build -t $UPGRADE_IMAGE -<<DOCKER
FROM scratch
COPY . /
DOCKER

```

{{% alert title="Upgrades with Kubernetes" %}}

In order to upgrade with Kubernetes using system upgrade controller plans you can use the image used to generate the installable medium, and use it as a base image for the upgrade image. 
When invoking `kairos-agent` in the plan however, you need to specify the `--source` flag to point to the image that contains the UKI file.

{{% /alert %}}


### Example: e2e image generation

```bash

IMAGE=ttl.sh/uki-kairos-test:awesome
UPSTREAM_IMAGE=quay.io/kairos/fedora:38-core-amd64-generic-v3.0.0-alpha1

docker build -t $IMAGE -<<DOCKER
FROM $UPSTREAM_IMAGE
RUN <<EOF
echo "wow" >> /wow
EOF
DOCKER

docker push $IMAGE

# TODO: this is temporary
# clone the repo
git clone https://github.com/kairos-io/kairos

# cd into the repo
cd kairos


# build the iso with Earthly
earthly +uki-iso --BASE_IMAGE=$IMAGE

# Extract the EFI file from the ISO
cd build/

mkdir iso
mkdir efiboot

sudo mount -o loop *.iso iso
sudo mount iso/efiboot.img efiboot 

cp efiboot/EFI/kairos/*.efi .

ls
# efiboot  iso  kairos-fedora-38-core-amd64-generic-v3.0.0-alpha1.uki.iso  v3.0.0-alpha1.efi

# Generate the upgrade image

VERSION=v3.0.0-alpha2
UKI=kairos-fedora-38-core-amd64-generic-${VERSION}.efi
UPGRADE_IMAGE=ttl.sh/kairos-uki-tests/upgrade-image
EFI_FILE=$PWD/v3.0.0-alpha1.efi 

mkdir upgrade-image
mkdir -p upgrade-image/loader/entries
mkdir -p upgrade-image/EFI/kairos/

cp -rfv $EFI_FILE upgrade-image/EFI/kairos/${UKI}

# default @saved
cat <<EOF > upgrade-image/loader/loader.conf
default kairos-$VERSION.conf
timeout 5
console-mode max
editor no
EOF

cat <<EOF > upgrade-image/loader/entries/kairos-$VERSION.conf
title Kairos $VERSION
efi /EFI/kairos/$UKI
version $VERSION
EOF

cd upgrade-image
docker build -t $UPGRADE_IMAGE -<<DOCKER
FROM scratch
COPY . /
DOCKER

docker push $UPGRADE_IMAGE
```