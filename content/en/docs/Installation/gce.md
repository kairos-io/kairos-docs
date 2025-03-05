---
title: "Installation on Google Cloud"
linkTitle: "Installation on Google Cloud"
weight: 3
date: 2025-02-28
description: Install Kairos on Google Cloud
---

This page describes how to install Kairos on Google Cloud after you have created a disk image. Since release v3.3.1, Kairos pipeline is pushing a public OS image to Google Cloud which you can use.
If you want to build a custom image, you can follow the instructions in the [Build Kairos appliances]({{< relref "../advanced/build" >}}) page.

## Prerequisites

- A Google Cloud account with permissions to create VMs.
- A Google Cloud compatible image of Kairos. You can use the public image provided by Kairos or [build your own image]({{< ref "/docs/Reference/auroraboot.md#generate-raw-disk-images" >}}).

## Deploy a VM

Unfortunately Google Cloud [doesn't allow users to search among public images in different projects](https://cloud.google.com/compute/docs/images/managing-access-custom-images#share-images-publicly). One has to know the exact project and name of the image they intend to use, even if its publicly accessible to [all authenticated users](https://cloud.google.com/compute/docs/images/managing-access-custom-images#limitations). Using the public image seems to only be possible through the command line because of the above.

1. Make sure you are authenticated with the cli: `gcloud auth login`
1. Create a VM using the latest Kairos image:


```
gcloud --project  <your_project_here> compute instances create kairos-vm-test \
  --image=projects/palette-kairos/global/images/kairos-ubuntu-24-04-core-amd64-generic-{{< google_cloud_image_version >}} \
  --image-project=palette-kairos \
  --zone=europe-central2-c \
  --metadata-from-file=user-data=<path_to_your_cloud_config> \
  --boot-disk-size=40G
```

Connect to the instance:

```
gcloud compute connect-to-serial-port kairos-vm-test
```

[(disconnect with `<Enter>~.`)](https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-using-serial-console#disconnecting_from_the_serial_console)

By passing a file to `--metadata-from-file=user-data=<your_file_here>` you can pass a cloud config to Kairos. You should at least specify a user and a password (or SSH key) if you need to SSH to the instance (Check the [Getting started]({{< relref "../Getting started/" >}}) page for some examples).

When the instance boots for the first time, it boots into "auto-reset mode" by default. This means, that Kairos will "install" itself on the first boot and then reboot.
You can specify a different image to be installed using a block like the following in the cloud config:

```yaml
reset:
  system:
    uri: "quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-master-k3sv1.32.1-rc2-k3s1"
```

This will reset to the specified image on the first boot instead of the image booted. Once the instance is running, you can access it via SSH. Make sure reset has completed and the system has rebooted into "active" mode. The following command should report "active_boot":

```
kairos-agent state get boot
```

(It it reports `recovery_boot`, the system is still in the installation process. Wait a few minutes and try again.)
