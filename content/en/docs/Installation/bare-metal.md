---
title: "Installing on Bare-Metal"
linkTitle: "Bare-Metal"
weight: 3
description: |
  Install Kairos on real hardware!
---

## Installation media

Download the Kairos ISO of your choice. See the [Getting Started guide]({{< ref "getting-started" >}}) for more information.

When deploying on a bare metal server, directly flash the image into a USB stick. There are multiple ways to do this:

## From the CLI

```bash
dd if=/path/to/iso of=/path/to/dev bs=4MB
```

#### From the GUI

For example using an application like [balenaEtcher](https://www.balena.io/etcher/) but can be any other application which allows you to write bootable USBs.

{{% alert title="Warning" color="warning" %}}
If you're booting in UEFI mode, make sure that your storage device where you're planning to install Kairos, is configured as ACHI and not RAID.
{{% /alert %}}


