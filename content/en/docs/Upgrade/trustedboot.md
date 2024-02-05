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

{{% alert title="Note" %}}
The resulting container image can be used for upgrades with `kairos-agent`.
{{% /alert %}}

The process will generate an EFI file which we will pack into a container image that will be used to upgrade the node.

First we need to extract the EFI file from the ISO file generated with what explained in the [Trusted Boot Installation documentation]({{< relref "../installation/trustedboot" >}}):

{{% alert title="Warning" %}}
This step is required until [#2171](https://github.com/kairos-io/kairos/issues/2171) is implemented.
{{% /alert %}}

#### Generate the upgrade image

1. Build the container image used to generate the upgrade image

```bash
# Build the container image that will be used to generate the keys and installable medium
git clone https://github.com/kairos-io/enki.git
cd enki
docker build -t enki --target tools-image .
```

2. Build the Container image used for upgrades

```bash
CONTAINER_IMAGE=quay.io/kairos/fedora:38-core-amd64-generic-v3.0.0-alpha1

# ubuntu:
# CONTAINER_IMAGE=quay.io/kairos/ubuntu:23.10-core-amd64-generic-v3.0.0-alpha1
docker run --rm -v $PWD/keys:/keys -v $PWD:/work -ti enki build-uki $CONTAINER_IMAGE -t uki -d /work/upgrade-image -k /keys

# Generate container-image for upgrades
docker run --rm -v $PWD/keys:/keys -v $PWD:/work -ti enki build-uki $CONTAINER_IMAGE -t container -d /work/upgrade-image -k /keys
```

3. Push the upgrade image to a registry

```bash
# Now you can load upgrade_image.tar to a registry and use it with kairos-agent
docker load -i *.tar
#401b8e83daf6: Loading layer [==================================================>]  1.263GB/1.263GB
# Loaded image: kairos_uki:v3.0.0-alpha2
docker push <IMAGE_NAME>
```

{{% alert title="Upgrades with Kubernetes" %}}

In order to upgrade with Kubernetes using system upgrade controller plans you can use the image used to generate the installable medium, and use it as a base image for the upgrade image. 
When invoking `kairos-agent` in the plan however, you need to specify the `--source` flag to point to the image that contains the UKI file.

{{% /alert %}}

### Reference


#### Generate the upgrade image manually

You can also manually generate the container image:

```bash

CONF=$(basename $(ls -1 $PWD/upgrade-image/loader/entries/*.conf))
# Replace with the version of the OS you are upgrading to (next boot auto selection)
cat <<EOF > upgrade-image/loader/loader.conf
default $CONF
timeout 5
console-mode max
editor no
EOF

## Generate the container image
docker run --rm -v $PWD:/work --entrypoint /bin/tar -ti enki -C /work/upgrade-image -cf /work/src.tar .

CONTAINER_IMAGE_NAME="ttl.sh/kairos-uki/tests:my-upgrade-image"
docker run -ti -v $PWD:/work quay.io/luet/base:latest util pack $CONTAINER_IMAGE_NAME /work/src.tar /work/upgrade_image.tar

```