---
title: "Image sources"
sidebar_label: "Image sources"
sidebar_position: 10
description: The image source types install, upgrade and reset accept, where to set them, and where they do not apply.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Install, upgrade and reset all deploy a system image from a source. A source is written as `type:address`, for example `oci:repo/image:tag`, and the same types work everywhere a source is accepted.

## Source types

| Type      | Address                     | What it is                                                                                                                                                                      |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oci`     | `repo/image:tag`            | An image pulled from a container registry. If the tag is omitted, `:latest` is assumed.                                                                                         |
| `ocifile` | Path to a local file        | An image archive already on the machine, such as the output of [`docker save`](https://docs.docker.com/reference/cli/docker/image/save/). Docker and OCI layout archives both work. |
| `dir`     | Path to a local directory   | An already extracted root filesystem. `/mnt`, `/proc`, `/sys`, `/dev`, `/tmp`, `/host` and `/run` are not copied.                                                              |
| `file`    | Path to a single local file | A prebuilt filesystem image, copied as is. This is a low level type and is not the format `docker save` produces.                                                               |
| `ssh`     | `ssh://[user@]host[:port][/path]` | The system image of another Kairos node, copied over SSH. See [the ssh page](/docs/reference/image-sources/ssh).                                         |
| `p2p`     | `p2p://[peer[,peer]/]image?pin=<pin>` | Experimental. The system image of other Kairos nodes, downloaded from several of them at once. See [the p2p page](/docs/reference/image-sources/p2p).                         |

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

A reset formats the persistent partition before it reads the image. A local source for a reset (`ocifile`, `dir` or `file`) must therefore not live on it: mount a disk in the recovery system, or use another type.

## Examples

One tab per source type, with the command line for each action and the cloud config that does the same. The cloud config blocks are independent of each other, keep the ones you need. `<pin>` is explained on [the p2p page](/docs/reference/image-sources/p2p).

<Tabs groupId="image-source">
<TabItem value="oci" label="oci" default>

```bash
# Upgrade the active system
sudo kairos-agent upgrade --source oci:{{< OCI variant="standard" >}}

# Upgrade the recovery system
sudo kairos-agent upgrade --recovery --source oci:{{< OCI variant="standard" >}}

# Install from the live system, which erases the device: manual, interactive and pairing (QR code)
sudo kairos-agent manual-install --device auto --source oci:{{< OCI variant="standard" >}} cloud-config.yaml
sudo kairos-agent interactive-install --source oci:{{< OCI variant="standard" >}}
sudo kairos-agent install --source oci:{{< OCI variant="standard" >}}
```

```yaml
#cloud-config

install:
  system:
    source: "oci:{{< OCI variant="standard" >}}"

upgrade:
  system:
    source: "oci:{{< OCI variant="standard" >}}"
  recovery-system:
    source: "oci:{{< OCI variant="standard" >}}"

reset:
  system:
    source: "oci:{{< OCI variant="standard" >}}"
```

For a registry that needs credentials or a certificate, see [Private registry auth](/docs/advanced/private_registry_auth).

</TabItem>
<TabItem value="ocifile" label="ocifile">

```bash
# On a machine with registry access, then copy the file to the node
docker save {{< OCI variant="standard" >}} -o kairos.tar

# Upgrade the active system
sudo kairos-agent upgrade --source ocifile:/data/kairos.tar

# Upgrade the recovery system
sudo kairos-agent upgrade --recovery --source ocifile:/data/kairos.tar

# Install from the live system, which erases the device: manual, interactive and pairing (QR code)
sudo kairos-agent manual-install --device auto --source ocifile:/data/kairos.tar cloud-config.yaml
sudo kairos-agent interactive-install --source ocifile:/data/kairos.tar
sudo kairos-agent install --source ocifile:/data/kairos.tar
```

```yaml
#cloud-config

install:
  system:
    source: "ocifile:/data/kairos.tar"

upgrade:
  system:
    source: "ocifile:/data/kairos.tar"
  recovery-system:
    source: "ocifile:/data/kairos.tar"

reset:
  system:
    source: "ocifile:/mnt/kairos.tar"   # a disk mounted in the recovery system, not the persistent partition
```

</TabItem>
<TabItem value="dir" label="dir">

`dir:/` uses the root of the system the command runs in, which is how a [takeover install](/docs/installation/takeover) works.

```bash
# Upgrade the active system
sudo kairos-agent upgrade --source dir:/data/rootfs

# Upgrade the recovery system
sudo kairos-agent upgrade --recovery --source dir:/data/rootfs

# Install from the live system, which erases the device: manual, interactive and pairing (QR code)
sudo kairos-agent manual-install --device auto --source dir:/data/rootfs cloud-config.yaml
sudo kairos-agent interactive-install --source dir:/data/rootfs
sudo kairos-agent install --source dir:/data/rootfs
```

```yaml
#cloud-config

install:
  system:
    source: "dir:/data/rootfs"

upgrade:
  system:
    source: "dir:/data/rootfs"
  recovery-system:
    source: "dir:/data/rootfs"

reset:
  system:
    source: "dir:/mnt/rootfs"   # a disk mounted in the recovery system, not the persistent partition
```

</TabItem>
<TabItem value="file" label="file">

The file is a filesystem image of the system, copied as is. It is not an archive from `docker save`, use `ocifile` for that.

```bash
# Upgrade the active system
sudo kairos-agent upgrade --source file:/data/active.img

# Install from the live system, which erases the device: manual, interactive and pairing (QR code)
sudo kairos-agent manual-install --device auto --source file:/data/active.img cloud-config.yaml
sudo kairos-agent interactive-install --source file:/data/active.img
sudo kairos-agent install --source file:/data/active.img
```

```yaml
#cloud-config

install:
  system:
    source: "file:/data/active.img"

upgrade:
  system:
    source: "file:/data/active.img"

reset:
  system:
    source: "file:/mnt/active.img"   # a disk mounted in the recovery system, not the persistent partition
```

</TabItem>
<TabItem value="ssh" label="ssh">

The source is another Kairos node. Authentication, the host key check and the limits are on [the ssh page](/docs/reference/image-sources/ssh). A recovery system cannot be upgraded from an ssh source.

```bash
# Upgrade the active system
sudo kairos-agent upgrade --source ssh://root@10.0.0.5

# Install from the live system, which erases the device: manual, interactive and pairing (QR code)
sudo kairos-agent manual-install --device auto --source ssh://root@10.0.0.5 cloud-config.yaml
sudo kairos-agent interactive-install --source ssh://root@10.0.0.5
sudo kairos-agent install --source ssh://root@10.0.0.5
```

```yaml
#cloud-config

# The files must exist before the action starts. For an install, put them on the
# install medium and point these paths at them.
ssh-source:
  identity-file: /oem/ssh/fleet_upgrade
  known-hosts-file: /oem/ssh/known_hosts

install:
  system:
    source: "ssh://root@10.0.0.5"

upgrade:
  system:
    source: "ssh://root@10.0.0.5"

reset:
  system:
    source: "ssh://root@10.0.0.5"
```

</TabItem>
<TabItem value="p2p" label="p2p (experimental)">

Experimental, and the source needs a pin. The page about [the p2p source](/docs/reference/image-sources/p2p) explains how to get one and what the opt-in does. Quote the source in a shell, it has a `?` in it. Only `upgrade` has an `--experimental-p2p` flag, the other commands read `p2p-source.experimental` from the cloud config.

```bash
# Upgrade the active system
sudo kairos-agent upgrade --experimental-p2p --source 'p2p://10.0.0.2,10.0.0.3/active?pin=<pin>'

# Upgrade the recovery system, from the recovery image of a node
sudo kairos-agent upgrade --experimental-p2p --recovery --source 'p2p://10.0.0.2/recovery?pin=<pin>'

# Install from the live system, which erases the device. The cloud config has p2p-source.experimental
sudo kairos-agent manual-install --device auto --source 'p2p://10.0.0.2,10.0.0.3/active?pin=<pin>' cloud-config.yaml
sudo kairos-agent interactive-install --source 'p2p://10.0.0.2,10.0.0.3/active?pin=<pin>'
sudo kairos-agent install --source 'p2p://10.0.0.2,10.0.0.3/active?pin=<pin>'
```

```yaml
#cloud-config

p2p-source:
  experimental: true

install:
  system:
    source: "p2p://10.0.0.2,10.0.0.3/active?pin=<pin>"

upgrade:
  system:
    source: "p2p://10.0.0.2,10.0.0.3/active?pin=<pin>"
  recovery-system:
    source: "p2p://10.0.0.2/recovery?pin=<pin>"

reset:
  system:
    source: "p2p://10.0.0.2,10.0.0.3/active?pin=<pin>"
```

</TabItem>
</Tabs>

## Trusted boot

On [trusted boot](/docs/installation/trustedboot) systems the source is copied into the EFI partition, so it has to hold the signed EFI artifacts, as the images built for trusted boot do.

- Upgrade reads `upgrade.system.source` only. `upgrade.recovery-system.source` is not used, and `--recovery` takes its image from `--source` or `upgrade.system.source`.
- `file` is not meant for trusted boot: it copies a single file, and trusted boot needs the whole set of EFI artifacts.
- Reset has no source. It does not deploy an image.
