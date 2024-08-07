---
title: "Manual Upgrades"
linkTitle: "Manual"
weight: 1
date: 2022-11-13
description: Learn how to manually upgrade Kairos Active and Recovery images
---

Upgrades can be run manually from the terminal.

Kairos images are released on [quay.io](https://quay.io/organization/kairos).

{{% alert title="Note" %}}
Looking to upgrade from a private registry OCI image? Check the [Private registry auth]({{< relref "../Advanced/private_registry_auth" >}}) page.
{{% /alert %}}

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

## Upgrading the active system

To specify an image, use the `--source` flag:

```bash
sudo kairos-agent upgrade --source <type>:<address>
```
Where type can be `dir` or `oci` and address is the path to the dir in the `dir` case or the <repo/image:tag> combination in the <oci> case.

For example, if you wanted to upgrade to the latest available stable release you could run the following command:

```bash {class="meta-distro"}
sudo kairos-agent upgrade --source oci:{{<ociMeta variant="standard">}}
```

Once you have tested the new system and are happy with it, you can upgrade the recovery system.

## Upgrading the recovery system

The recovery system is there for a reason, to help you recover the active system in case of failure. This is why we don't allow upgrading the active system and recovery one at the same time and it needs to be done in a separate step. It's advised to also upgrade the recovery system often, to keep it close to the active one. This will make sure you have a familiar system to work with, when you boot to the recovery system instead of an old image you haven't used for quite a long time.

{{% alert title="Warning" color="warning" %}}
Only upgrade the recovery system, when you are sure that the active system is running correctly.
{{% /alert %}}

To make this process less error prone, the upgrade command provides an extra flag that will upgrade the recovery only. It uses the same system and flags as the normal upgrade.

```bash {class="meta-distro"}
sudo kairos-agent upgrade --recovery --source oci:{{<ociMeta variant="standard">}}
```

## What about the passive system?

The passive system is the one that is not running. It is not possible to upgrade it directly. The passive system will be upgraded when the active system is rebooted.
