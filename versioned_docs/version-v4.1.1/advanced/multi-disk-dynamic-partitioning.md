---
title: "Multi-disk installation with dynamic device selection"
sidebar_label: "Multi-disk dynamic partitioning"
sidebar_position: 2
---

This page walks through a complete, tested example of installing Kairos across two
disks using the `script://` device resolver and `no-format: true`. The same
cloud-config works on any machine regardless of what the disk devices happen to be
named, because a small shell script picks them at install time.

**What we'll build:**

| Partition | Disk | How chosen |
|---|---|---|
| `COS_GRUB` (EFI) + `COS_OEM` | smaller disk | `script:///usr/local/bin/pick-disk.sh small` |
| `COS_RECOVERY` + `COS_STATE` + `COS_PERSISTENT` | larger disk | `script:///usr/local/bin/pick-disk.sh large` |

:::info Prerequisites
- A UEFI VM (or bare-metal machine) with two block devices of **different sizes**.
- A custom Kairos image that includes the `pick-disk.sh` script (see below).
- The larger disk should be at least 14 GB (4 GB recovery + 8 GB state + remainder for persistent).
:::

## 1. The disk-selection script

Save this as `pick-disk.sh`. It accepts an optional argument:

- `small` — returns the disk with the fewest bytes
- `large` — returns the disk with the most bytes
- *(no argument)* — returns the first well-known device found (`/dev/vda`, `/dev/sda`, `/dev/nvme0n1`), falling back to `lsblk`

```sh
#!/bin/sh
# Selects a block device for installation.
#
# Usage: pick-disk.sh [small|large]
#   small  - returns the disk with the fewest bytes
#   large  - returns the disk with the most bytes
#   (none) - returns the first available well-known device (legacy behaviour)

MODE="${1:-}"

_pick_by_size() {
    DISKS=$(lsblk -dpbn -o NAME,SIZE,TYPE 2>/dev/null | awk '$3=="disk" {print $2" "$1}')
    if [ -z "$DISKS" ]; then
        echo "pick-disk: no disks found" >&2
        exit 1
    fi
    if [ "$1" = "small" ]; then
        echo "$DISKS" | sort -n  | head -1 | awk '{print $2}'
    else
        echo "$DISKS" | sort -rn | head -1 | awk '{print $2}'
    fi
}

case "$MODE" in
    small|large)
        DISK=$(_pick_by_size "$MODE")
        if [ -z "$DISK" ]; then
            echo "pick-disk: could not find a $MODE disk" >&2
            exit 1
        fi
        echo "$DISK"
        ;;
    "")
        for dev in /dev/vda /dev/sda /dev/nvme0n1; do
            [ -b "$dev" ] && echo "$dev" && exit 0
        done
        DISK=$(lsblk -dpno NAME,TYPE 2>/dev/null | awk '$2=="disk"{print $1; exit}')
        [ -n "$DISK" ] && echo "$DISK" && exit 0
        echo "pick-disk: no suitable block device found" >&2
        exit 1
        ;;
    *)
        echo "pick-disk: unknown mode '$1'. Use 'small', 'large', or no argument" >&2
        exit 1
        ;;
esac
```

:::warning Script must be in the live environment
The script runs at install time, before any persistent storage exists.
It cannot be written by the same cloud-config that references it.
It must be baked into the Kairos image (see next step).
:::

## 2. Bake the script into a custom image

Add the following lines to your Dockerfile after the `kairos-init` steps:

```dockerfile
COPY pick-disk.sh /usr/local/bin/pick-disk.sh
RUN chmod +x /usr/local/bin/pick-disk.sh
```

A minimal example Dockerfile:

```dockerfile
ARG BASE_IMAGE=ghcr.io/kairos-io/kairos-core-hadron:latest
ARG KAIROS_INIT=v0.8.4

FROM quay.io/kairos/kairos-init:${KAIROS_INIT} AS kairos-init

FROM ${BASE_IMAGE}
ARG VERSION=v0.0.0-dev

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init -l debug -s install --version "${VERSION}" && \
    /kairos-init -l debug -s init --version "${VERSION}"

COPY pick-disk.sh /usr/local/bin/pick-disk.sh
RUN chmod +x /usr/local/bin/pick-disk.sh
```

Then build the image and generate an ISO with [AuroraBoot](https://github.com/kairos-io/AuroraBoot):

```bash
docker build -t my-kairos-multidisk .

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD/output:/output" \
  quay.io/kairos/auroraboot:v0.19.4 --debug \
  build-iso --output /output/ \
  docker:my-kairos-multidisk
```

## 3. Cloud-config

```yaml
#cloud-config

# no-format: true tells the installer to skip its own partitioning step.
# With the partitions already labelled correctly in kairos-install.pre.before,
# DetectPreConfiguredDevice will find the disk that holds COS_STATE automatically.
install:
  no-format: true
  auto: true
  reboot: true

users:
  - name: kairos
    passwd: kairos
    groups:
      - admin

stages:
  kairos-install.pre.before:
    - name: "Small disk: EFI partition + COS_OEM"
      layout:
        device:
          path: "script:///usr/local/bin/pick-disk.sh small"
          init_disk: true
        add_partitions:
          - fsLabel: COS_GRUB
            pLabel: efi
            size: 64
            filesystem: vfat
          - fsLabel: COS_OEM
            pLabel: oem
            size: 0
            filesystem: ext4

    - name: "Large disk: recovery + state + persistent"
      layout:
        device:
          path: "script:///usr/local/bin/pick-disk.sh large"
          init_disk: true
        add_partitions:
          - fsLabel: COS_RECOVERY
            pLabel: recovery
            size: 4096
            filesystem: ext4
          - fsLabel: COS_STATE
            pLabel: state
            size: 8192
            filesystem: ext4
          - fsLabel: COS_PERSISTENT
            pLabel: persistent
            size: 0
            filesystem: ext4
```

`install.device` is intentionally omitted. After the pre-install stage the installer
calls `DetectPreConfiguredDevice`, which scans all disks for a `COS_STATE` partition
and uses its parent disk as the target. Since UEFI GRUB installation only copies EFI
files (it does not call `grub-install` with a device target), the `COS_GRUB` partition
is found by label regardless of which physical disk it is on.

## 4. Expected result

After a successful install, `lsblk` on the installed system should look similar to:

```
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
vda    253:0    0   20G  0 disk
├─vda1 253:1    0   64M  0 part               ← COS_GRUB  (EFI)
└─vda2 253:2    0 19.9G  0 part /oem          ← COS_OEM
vdb    253:16   0   30G  0 disk
├─vdb1 253:17   0    4G  0 part               ← COS_RECOVERY
├─vdb2 253:18   0    8G  0 part /run/initramfs/cos-state  ← COS_STATE
└─vdb3 253:19   0   18G  0 part /var/lib/...  ← COS_PERSISTENT
```

## Notes

- The `script://` prefix is evaluated independently for each `layout` block, so
  `pick-disk.sh` is called once per block. For a script with side effects or significant
  latency, consider caching the result in a file and reading from it instead.
- This example uses UEFI. For legacy BIOS the EFI partition must be replaced with a
  BIOS boot partition (GPT type `EF02`), which requires a `commands` block using
  `parted` and `sgdisk` since the layout plugin does not support setting partition type
  codes. See [Configuring partitions](/docs/advanced/configuring_partitions) for the
  BIOS variant.
- The `small`/`large` selection is based purely on disk size in bytes. If two disks
  have the same size the result is deterministic but arbitrary — add more specific
  logic to `pick-disk.sh` if your hardware requires it.
