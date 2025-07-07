---
title: "Installation on Microsoft Azure"
linkTitle: "Installation on Azure"
weight: 3
date: 2025-03-24
description: Install Kairos on Microsoft Azure
---

This page describes how to install Kairos on [Microsoft Azure](https://azure.microsoft.com/) after you have created a disk image. Since release v3.3.5, Kairos pipeline is pushing a public OS image to Azure which you can use.
If you want to build a custom image, you can follow the instructions in the [Creating Custom Cloud Images]({{< ref "creating_custom_cloud_images.md" >}}) page.

## Prerequisites

- An Azure account with permissions to create VMs.
- An Azure compatible image of Kairos. You can use the public image provided by Kairos (see below) or [build your own image]({{< ref "auroraboot.md" >}}#generate-raw-disk-images) (for Azure, that would be the `.vhd` format) and upload it to your Azure resource group ([check how the Kairos CI does it](https://github.com/kairos-io/kairos/blob/cbc6e033cda624e61b2050439b1a95c04fbe78de/.github/workflows/upload-cloud-images.yaml#L158-L241)).

## Deploy a VM

Visit the [Community Images page](https://portal.azure.com/#browse/Microsoft.Compute%2Flocations%2FcommunityGalleries%2Fimages) in the Azure portal and search for "kairos" in the search box. Multiple results will be returned matching multiple different regions. Click on the result matching the region you intend to use for the Virtual Machine. Find the version you want to use and click on "Create VM".

{{% alert title="Note" color="warning" %}}
To ensure you're using a genuine Kairos image in Azure, you should ensure that the image belongs to the Azure compute gallery `kairos.io`. You can inspect the image in the Web UI or you can use the Azure CLI:

```bash
az sig image-version show --gallery-name kairos.io --gallery-image-definition kairos --resource-group kairos-cloud-images --gallery-image-version <KAIROS_IMAGE_VERSION> --query 'name'
```
Replace `<KAIROS_IMAGE_VERSION>` with the version of the image (e.g. `3.3.5`).
{{% /alert %}}

{{% alert title="Note" color="warning" %}}
As described below, it is possible to reset to any desired image on first boot. That's the reason only one Kairos flavor is published in Google Cloud (Ubuntu 24.04). This allows us to save costs and time by not pushing unnecessary artifacts.
{{% /alert %}}

There are multiple options to select for your VM. We suggest you choose a size that has:

- 16Gb of RAM or more
- 2 CPUs or more
- An OS disk size of 30Gb or more (3 times the image size + some more for persistent storage). Don't go with the "Image default" because the disk needs to be large enough to accommodate for active, passive and recovery system.
- Public inbound port for SSH (if you intend to SSH to the machine later).

Under the "Advanced" tab, click on "Enable user data". In the field that is opened, you can put your [Kairos configuration]({{< ref "configuration.md" >}}).

When the instance boots for the first time, it will boot into "auto-reset mode" by default. This means, that Kairos will "install" itself on the first boot and then reboot.
You can specify a different image to be installed using a block like the following in the cloud config section:

```yaml
reset:
  source: "oci:quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-{{< kairosVersion >}}-{{< k3sVersionOCI >}}"
```

Make sure you also 

When you are satisfied with the configuration, click on "Review + create" and then "Create".

After the VM has been created, you can either SSH to it using the credentials you specified in the Kairos config or using the serial console in the Azure Web UI.

On first boot, Kairos will reset to the specified image (or the booted image if none was specified for reset). Make sure reset has completed and the system has rebooted into "active" mode. The following command should report "active_boot":

```
kairos-agent state get boot
```

(It it reports `recovery_boot`, the system is still in the installation process. Wait a few minutes and try again.)
