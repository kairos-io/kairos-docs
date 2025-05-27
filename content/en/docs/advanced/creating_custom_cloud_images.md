---
title: "Creating Custom Cloud Images"
linkTitle: "Creating Custom Cloud Images"
weight: 1
description: A comprehensive guide to creating custom cloud images with Kairos using the latest tools
---

This guide provides a complete walkthrough for creating custom cloud images with Kairos. It covers the entire process from start to finish, using the latest tools like `kairos-init` and `AuroraBoot`.

## Overview

Kairos provides several tools to create custom cloud images:

1. **kairos-init**: A tool for creating base container images
2. **AuroraBoot**: A tool for generating bootable images (ISOs, cloud images, etc.)
3. **Customization tools**: Various methods to customize the images

## Prerequisites

Before starting, ensure you have:

- Docker installed and running
- A Linux machine with KVM support (for testing)
- Basic understanding of container images and cloud configurations

## Step 1: Creating a Base Image with kairos-init

The first step is to create a base container image using [`kairos-init`](https://github.com/kairos-io/kairos-init). This tool allows you to create a custom base image from popular distributions.

Here's a basic example of creating a base image:

```bash
docker build -t my-custom-image - <<EOF
ARG BASE_IMAGE=ubuntu:24.04

FROM quay.io/kairos/kairos-init:{{< kairosInitVersion >}} AS kairos-init

FROM ${BASE_IMAGE} AS base-kairos
ARG VARIANT=core
ARG MODEL=generic
ARG TRUSTED_BOOT=false
ARG KUBERNETES_DISTRO=k3s
ARG KUBERNETES_VERSION=latest
ARG FRAMEWORK_VERSION=v2.20.0
ARG VERSION

COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug -s install -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug -s init -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug --validate -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN rm /kairos-init
EOF
```

## Step 2: Customizing the Image

Once you have a base image, you can customize it by:

1. Adding packages
2. Modifying configurations
3. Adding custom services
4. Including additional files

See the [Customizing Images]({{< ref "customizing.md" >}}) guide for detailed instructions.

## Step 3: Building Bootable Images with AuroraBoot

After creating and customizing your base image, you can use AuroraBoot to create bootable images:

```bash
docker run -v "$PWD"/build:/tmp/auroraboot \
             -v /var/run/docker.sock:/var/run/docker.sock \
             --rm -ti quay.io/kairos/auroraboot:{{< auroraBootVersion >}} \
             --set container_image=my-custom-image \
             --set "disable_http_server=true" \
             --set "disable_netboot=true" \
             --cloud-config /path/to/cloud-config.yaml \
             --set "state_dir=/tmp/auroraboot"
```

{{% alert title="Note" color="info" %}}
For more details about AuroraBoot options and configurations, see the [AuroraBoot documentation]({{< ref "auroraboot.md" >}}).
{{% /alert %}}

### State Partition Sizing

When creating cloud images, it's important to consider the size of the state partition. The state partition is created at image build time and cannot be resized later. This partition needs to accommodate all images (passive, active, and transition image for upgrades) that might be used with the system.

By default, AuroraBoot sets the state partition size to 3 times the size of the current image plus some additional space for system files. This is usually sufficient for most use cases, but if you need to ensure the state partition can accommodate larger future images, you can override this with the `disk.state_size` option:

```bash
docker run -v "$PWD"/build:/tmp/auroraboot \
             -v /var/run/docker.sock:/var/run/docker.sock \
             --rm -ti quay.io/kairos/auroraboot \
             --set container_image=my-custom-image \
             --set "disable_http_server=true" \
             --set "disable_netboot=true" \
             --set "disk.state_size=6000" \
             --cloud-config /path/to/cloud-config.yaml \
             --set "state_dir=/tmp/auroraboot"
```

The value is specified in megabytes (MB). When setting a custom size, make sure it's at least 3 times the size of the largest image you plan to use, plus some additional space for system files. This ensures there's enough space for the passive, active, and transition images, plus some overhead for future updates.

## Step 4: Cloud Configuration

Your cloud configuration file (`cloud-config.yaml`) is crucial for defining how your image will behave. Here's a basic example:

```yaml
#cloud-config

hostname: kairos-{{ trunc 4 .MachineID }}

users:
- name: "kairos"
  passwd: kairos
  groups:
  - admin

reset:
  system:
    uri: "quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-master-k3sv1.32.1-rc2-k3s1"
```

In the example above, we are specifying a custom image that will be used during the first boot to reset the system. When you launch an instance, Kairos will boot into "auto-reset mode" by default. This means that Kairos will "install" itself on the first boot and then reboot. The `reset.system.uri` field in the cloud-config specifies which image will be installed during this process.

As explained in the section above, sizing the state partition properly is important when using this option.

## Step 5: Building for Specific Platforms

### AWS
To install on AWS, follow the [AWS Guide]({{< ref "aws.md" >}}).

### Google Cloud
To install on Google Cloud, follow the [Google Cloud Installation Guide]({{< ref "gce.md" >}}).

### Microsoft Azure
For Azure deployments, see the [Azure Installation Guide]({{< ref "azure.md" >}}).

## Troubleshooting

Common issues and solutions:

1. **Disk Size**: Ensure your VM disk is large enough for all partitions. If there isn't enough space, the auro-reset will fail and the VM will never boot into `active_boot` mode.
2. **State Partition Size**: If you encounter issues when resetting to a new image, it might be because the state partition is too small. Use the `disk.state_size` option when creating the image to set an appropriate size.

## Next Steps

- [Customizing Images]({{< ref "customizing.md" >}})
- [AuroraBoot Reference]({{< ref "auroraboot.md" >}})
- [Cloud Configuration Reference]({{< ref "configuration.md" >}}) 