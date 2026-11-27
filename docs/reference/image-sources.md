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
| `ssh`     | `ssh://[user@]host[:port][/path]` | The system image of another Kairos node, copied over SSH. See [Upgrading from another node over SSH](/docs/upgrade/from_another_node).                                         |
| `p2p`     | `p2p://[peer[,peer]/]image?pin=<pin>` | Experimental. The system image of other Kairos nodes, downloaded from several of them at once. See [P2P upgrades](/docs/upgrade/p2p-experimental).                         |

In a cloud config, an image reference without a type (`quay.io/kairos/hadron:latest`) and a `docker:` prefix are both read as `oci`. The `--source` flag does not accept either of those: it needs one of the type prefixes above.

Signature verification with cosign only runs for `oci` sources.

### Sources from another node

`ssh` and `p2p` take the image from other Kairos nodes instead of a registry or a file. Both work wherever [the table below](#where-a-source-can-be-set) lists a source, with these differences:

| | `ssh` | `p2p` |
| --- | --- | --- |
| Config block | `ssh-source`, at the root of the cloud config or inside `install`, `upgrade` or `reset` (the block of the action wins, key by key) | `p2p-source`, at the root of the cloud config only |
| Must be switched on | No | Yes, `p2p-source.experimental: true` (`--experimental-p2p` on `upgrade`) |
| Authentication | Your `ssh` configuration, or `identity-file`, `known-hosts-file` and `host-key-fingerprints` of the block | The source needs `?pin=<pin>` (or `?sha256=<hash>`), or `p2p-source.insecure: true` to go without |
| Recovery upgrade | Not supported, only the active system | `upgrade.recovery-system.source` takes `p2p://.../recovery`, the active and passive images only go to the system |
| Trusted boot (UKI) | Not supported | Not supported |

`kairos-agent reset` has no `--source` flag for them: set `reset.system.source`, with the `ssh-source` or `p2p-source` block next to it. `--source` on the other commands takes `ssh://` and `p2p://` like any other type.

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
