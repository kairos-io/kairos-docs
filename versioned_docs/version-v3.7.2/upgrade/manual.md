---
title: "Manual Upgrades"
sidebar_label: "Manual"
sidebar_position: 1
date: 2022-11-13
description: Learn how to manually upgrade Kairos Active and Recovery images
---

Upgrades can be run manually from the terminal.

Kairos images are released on [quay.io](https://quay.io/organization/kairos).

:::tip Note
Looking to upgrade from a private registry OCI image? Check the [Private registry auth](/docs/v3.7.2/advanced/private_registry_auth/) page.
:::

## Listing available versions

Using the agent, you can list all the available versions to upgrade to.

```bash
$ sudo kairos-agent upgrade list-releases
v0.57.0
v0.57.0-rc2
v0.57.0-rc1
v0.57.0-alpha2
v0.57.0-alpha1
```

Use the `--registry` flag to specify a custom registry to retrieve the versions from, otherwise it will default to quay.io/kairos.

## Upgrading the active system

To specify an image, use the `--source` flag:

```bash
sudo kairos-agent upgrade --source <type>:<address>
```
Where type can be `dir` or `oci` and address is the path to the directory in the `dir` case or the `<repo/image:tag>` combination in the `oci` case.

For example, if you wanted to upgrade to the latest available stable release you could run the following command:

```bash
sudo kairos-agent upgrade --source oci:{{< oci variant="standard" kairosVersion="v3.7.2" k3sVersion="v1.35.0+k3s3" >}}
```

Once you have tested the new system and are happy with it, you can upgrade the recovery system.

## Upgrading the recovery system

The recovery system is there for a reason, to help you recover the active system in case of failure. This is why we don't allow upgrading the active system and recovery one at the same time and it needs to be done in a separate step. It's advised to also upgrade the recovery system often, to keep it close to the active one. This will make sure you have a familiar system to work with, when you boot to the recovery system instead of an old image you haven't used for quite a long time.

:::warning Warning
Only upgrade the recovery system, when you are sure that the active system is running correctly.
:::

To make this process less error prone, the upgrade command provides an extra flag that will upgrade the recovery only. It uses the same system and flags as the normal upgrade.

```bash
sudo kairos-agent upgrade --recovery --source oci:{{< oci variant="standard" kairosVersion="v3.7.2" k3sVersion="v1.35.0+k3s3" >}}
```

## What about the passive system?

The passive system is the one that is not running. It is not possible to upgrade it directly. The passive system will be upgraded when the active system is rebooted.

## Upgrading single entries (trusted boot installations)

On systems installed in ["trusted boot" mode](../../architecture/trustedboot/), it's not possible to edit the cmdline
without generating a new bootable image because the cmdline is part of the signed artifact.
For this reason, custom cmdlines are generated as separate artifacts at build time.
Being different artifacts though, means that they will need to be upgraded too.

This can be achieved by passing the name of the `efi` file (without the extension) to the upgrade command like this:

```bash
kairos-agent upgrade --source oci:{{< oci variant="standard" kairosVersion="v3.7.2" k3sVersion="v1.35.0+k3s3" >}} --boot-entry <efi_file_name_here>
```

You can find the efi file name by listing all the efi files in the installed system:

```bash
ls /efi/EFI/kairos/*.efi
```
