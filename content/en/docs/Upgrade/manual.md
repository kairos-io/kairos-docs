---
title: "Manual"
linkTitle: "Manual"
weight: 2
date: 2022-11-13
---

Upgrades can be run manually from the terminal.

Kairos images are released on [quay.io](https://quay.io/organization/kairos).

## List available versions

To see all the available versions:

```bash
$ sudo kairos-agent upgrade list-releases
v0.57.0
v0.57.0-rc2
v0.57.0-rc1
v0.57.0-alpha2
v0.57.0-alpha1
```

## Upgrade

To specify an image, use the `--source` flag:

```bash
sudo kairos-agent upgrade --source <type>:<address>
```
Where type can be `dir` or `oci` and address is the path to the dir in the `dir` case or the <repo/image:tag> combination in the <oci> case.

For example, if you wanted to upgrade to the latest available stable release you could run the following command:

```bash
sudo kairos-agent upgrade --source oci:{{<oci variant="standard">}}
```

{{% alert title="Note" %}}
Looking to upgrade from a private registry OCI image? Check the [Private registry auth]({{< relref "../Advanced/private_registry_auth" >}}) page.
{{% /alert %}}
