---
title: "Installation on AWS"
sidebar_label: "Installation on AWS"
sidebar_position: 2
date: 2025-01-27
description: Install Kairos on AWS
---

This page describes how to install Kairos on AWS after you have created an AMI. Since release v3.3.0, Kairos pipeline is pushing a public AMI image to AWS which you can use.
If you want to build a custom image, you can follow the instructions in the [Build Kairos appliances](/docs/v3.6.0/Advanced/build/) page.

## Prerequisites

- An AWS account with permissions to create EC2 instances.
- An AMI image of Kairos. You can use the public AMI image provided by Kairos or build your own image.

## Find the AMI

1. Login to your AWS account.
1. Go to the EC2 dashboard -> Images -> AMIs.
1. If you are looking for the Kairos AMI, make sure you are searching among "Public images". Then search for "kairos"
   in the search bar.
1. If you are looking for an AMI you created, make sure you are searching among "Owned by me". Then search for your AMI.
1. Select the AMI you want to use (e.g. `kairos-ubuntu-24.04-standard-amd64-generic-v3.3.0-k3sv1.32.0-k3s1.raw`).
1. From the top menu, click on `Launch instance from AMI`.

## Verify the AMI

To ensure you're using a genuine Kairos AMI, check the AMI owner ID. The AMI should be owned by the Kairos team's AWS account. You can find this information in the AMI details.  Look for the Owner Account ID. It should be `171987620676` (The Kairos account ID).

You can also verify the AMI using the AWS CLI:

```bash
aws ec2 describe-images --region <AMI_REGION> --image-ids <AMI_ID> --query 'Images[0].[OwnerId,Name,Description]'
```

Replace `<AMI_ID>` with the ID of the AMI you want to verify and the <AMI_REGION> with the region of that AMI. The output will show you the owner ID, name, and description of the AMI.

## Launch the instance

In this page you get to select the instance type, configure the instance, and add storage. Make sure you give the instance enough resources to run Kairos and your desired workloads (e.g. make sure the disk is at least 3 times the size of your image to allow for active, passive and recovery images).

You can also pass a Kairos config using the userdata field (Click on `Advanced details` -> `User data` and put your Kairos config in the box).

You should at least specify a user and a password (or SSH key) if you need to SSH to the instance (Check the [Getting started](/getting-started/) page for some examples).

When you click on `Launch instance` the instance will be created and Kairos will boot into "auto-reset mode" by default. This means, that Kairos will "install" itself on the first boot and then reboot.

You can specify a different image to be installed using a block like the following in the userdata:

```yaml
reset:
  source: "oci:quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-master-k3sv1.32.1-rc2-k3s1"
```

This will reset to the specified image on the first boot instead of the image booted.

## Access the instance

Once the instance is running, you can access it via SSH. Make sure reset has completed and the system has rebooted into "active" mode. The following command should report "active_boot":

```
kairos-agent state get boot
```

(It it reports `recovery_boot`, the system is still in the installation process. Wait a few minutes and try again.)
