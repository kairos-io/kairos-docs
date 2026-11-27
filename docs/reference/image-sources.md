---
title: "Image sources"
sidebar_label: "Image sources"
sidebar_position: 10
description: The image source types install, upgrade and reset accept, where to set them, and where they do not apply.
---

Install, upgrade and reset all deploy a system image from a source. A source is written as `type:address`, for example `oci:quay.io/kairos/hadron:latest`, and the same types work everywhere a source is accepted.

## Source types

| Type      | Address                     | What it is                                                                                                                                                                      |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oci`     | `repo/image:tag`            | An image pulled from a container registry. If the tag is omitted, `:latest` is assumed.                                                                                         |
| `ocifile` | Path to a local file        | An image archive already on the machine, such as the output of [`docker save`](https://docs.docker.com/reference/cli/docker/image/save/). Docker and OCI layout archives both work. |
| `dir`     | Path to a local directory   | An already extracted root filesystem. `/mnt`, `/proc`, `/sys`, `/dev`, `/tmp`, `/host` and `/run` are not copied.                                                              |
| `file`    | Path to a single local file | A prebuilt filesystem image, copied as is. This is a low level type and is not the format `docker save` produces.                                                               |

In a cloud config, an image reference without a type (`quay.io/kairos/hadron:latest`) and a `docker:` prefix are both read as `oci`. The `--source` flag does not accept either of those: it needs one of the four prefixes above.

Signature verification with cosign only runs for `oci` sources.

## Where a source can be set

| Action                         | Command line                                 | Cloud config                                                              |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------- |
| [Upgrade](/docs/upgrade/manual) | `kairos-agent upgrade --source <source>`     | `upgrade.system.source`                                                   |
| Recovery upgrade               | `kairos-agent upgrade --recovery --source <source>` | `upgrade.recovery-system.source`                                   |
| [Manual install](/docs/installation/manual) | `kairos-agent manual-install --source <source>` | `install.source` or `install.system.source`                |
| [Interactive install](/docs/installation/interactive) | `kairos-agent interactive-install --source <source>` | `install.source` or `install.system.source`   |
| [Pairing install](/docs/installation/qrcode) | `kairos-agent install --source <source>` | `install.source` or `install.system.source`                    |
| [Reset](/docs/reference/reset) | No flag                                      | `reset.system.source`                                                     |

An install can also set the source of the passive and recovery images with `install.passive.source` and `install.recovery-system.source`. By default they are copies of the active image.

A reset without a source restores the image kept in the recovery partition.

For example, to install from an image archive copied to the machine:

```bash
kairos-agent manual-install --device /dev/sda --source ocifile:/data/kairos.tar /data/cloud-config.yaml
```

Or to reset to a different image from the cloud config:

```yaml
#cloud-config

reset:
  system:
    source: "oci:quay.io/kairos/hadron:latest"
```

## Trusted boot

On [trusted boot](/docs/installation/trustedboot) systems the source is copied into the EFI partition, so it has to hold the signed EFI artifacts, as the images built for trusted boot do.

- Upgrade reads `upgrade.system.source` only. `upgrade.recovery-system.source` is not used, and `--recovery` takes its image from `--source` or `upgrade.system.source`.
- `file` is not meant for trusted boot: it copies a single file, and trusted boot needs the whole set of EFI artifacts.
- Reset has no source. It does not deploy an image.
