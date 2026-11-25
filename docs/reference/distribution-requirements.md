---
title: "Distribution requirements"
sidebar_label: "Distribution requirements"
sidebar_position: 3.5
description: What a Linux distribution needs to become a Kairos system, and how to check yours first.
---

Kairos is not tied to one Linux distribution. It takes a container image of the distribution you already use and turns it into an [immutable](/docs/architecture/immutable/) system: the operating system is read-only, and an upgrade replaces the whole image. The previous image stays on the disk, so the machine can go back to it.

This page describes how that works, what the distribution has to bring, and how to check yours.

## How Kairos runs on many distributions

A Kairos system has two halves. One half comes from Kairos and is the same everywhere:

- `immucore`, the program in the initramfs (the small system that starts before the real one) that mounts the immutable layout.
- The agent, which installs and upgrades the machine.
- A set of [cloud-config](/docs/architecture/cloud-init/) files that set the system up.

The other half comes from your distribution: the kernel, the init system, the tool that builds the initramfs, the bootloader and the usual disk tools.

[`kairos-init`](/docs/reference/kairos-factory/) joins the two halves. It runs inside a container build and does this:

1. It reads `/etc/os-release` to find out which family the distribution belongs to.
2. It installs the packages that the family needs, with the package manager of the distribution.
3. It copies the Kairos binaries and cloud-config files into the image.
4. It builds an initramfs that starts `immucore`. For a Trusted Boot image, AuroraBoot does this later.
5. It enables the services.

The kernel, the drivers and the security fixes come from the repositories of your distribution. You get updates by building a new image and upgrading to it, not by running the package manager on the machine.

## Families

Kairos groups distributions into families. Distributions of one family mostly share the package manager, the package names and the boot tools, so most of the work is done once for the family.

| Family | Package manager | Init system | Initramfs tool | Examples |
|---|---|---|---|---|
| Debian | `apt-get` | systemd | dracut | Debian, Ubuntu |
| Red Hat | `dnf` | systemd | dracut | Fedora, RHEL, Rocky Linux, AlmaLinux, Oracle Linux, CentOS Stream |
| SUSE | `zypper` | systemd | dracut | openSUSE Leap, openSUSE Tumbleweed |
| Alpine | `apk` | OpenRC | mkinitfs | Alpine |
| Hadron | none | systemd | dracut | [Hadron](/hadron-docs/), the distribution of the Kairos project |

The examples are not a support list. The base images that the project tests `kairos-init` on are in the [flavor build matrix](https://github.com/kairos-io/kairos/blob/master/.github/workflows/_build-flavors.yaml).

A family says which packages and steps apply. It does not mean that every boot mode works. For example, Alpine has no shim, and the agent does not look in the directory where CentOS Stream keeps its shim and GRUB, so an install on a UEFI machine fails on both. The check below prints a `warn` for that.

### Derivatives

If a distribution works, what is built on it has the same parts and can work too. That does not mean that it works without a change. The Kairos tools look at these values in `/etc/os-release` (the file in `/usr/lib` alone is not enough):

| Value | What it decides | What a derivative has to know |
|---|---|---|
| `ID` and `ID_LIKE` | The family and its package list | `ID_LIKE` is followed, so `ID_LIKE=debian` puts you in the Debian family. |
| `ID` | The package manager | `ID_LIKE` is not followed, except when it is exactly `suse`. An unknown `ID` stops the build with `unknown package manager`. |
| `PRETTY_NAME` | Which build steps and which boot configuration apply | It has to contain the name of a distribution that Kairos knows, for example `Ubuntu`. Otherwise no initramfs is built, and the network and ssh services are not enabled. |
| `VERSION_ID` | Package names that change between releases | It has to be a version, or the build stops. Debian testing has none. It is compared with the versions of the parent distribution, and the Ubuntu kernel depends on it. |

One more thing is not in `/etc/os-release`. Red Hat derivatives keep shim and GRUB in `/boot/efi/EFI/<name>`, and the agent only knows `fedora`, `rocky`, `redhat` and `almalinux`. With another name, the install on a UEFI machine fails.

There are two ways forward:

- In your Dockerfile, before `kairos-init`, set `ID`, `PRETTY_NAME` and `VERSION_ID` in `/etc/os-release` to the values of the parent release. For a derivative of Ubuntu 24.04 these are `ubuntu`, `Ubuntu 24.04 LTS` and `24.04`. This is enough when the packages are the ones of the parent.
- Add your distribution to the tools. The matching is in [`kairos-init`](https://github.com/kairos-io/kairos/tree/master/kairos-init/pkg) and in [yip](https://github.com/mudler/yip), the engine that runs the build steps and the cloud-config files. Contributions are welcome.

The release matters too. `kairos-init` follows the current releases of each distribution, and an older one can lack a package. Debian 11, openSUSE Leap 15 and SLES 15 are examples.

### Other families

A distribution of a family that is not in the table needs more work. `kairos-init` needs a package list and an initramfs step for it, and yip needs its package manager. Arch is an example: its name is known, but there is no package list. The [requirements](#requirements) below say what has to be there in the end.

## Check your distribution

`kairos-init check` reads a system and says if it can become a Kairos system. It is part of [`kairos-init`](https://github.com/kairos-io/kairos/tree/master/kairos-init), the tool that converts a base image, so the check and the conversion use the same rules. It changes nothing, it needs no network, and it does not have to run as root. `kairos-init` runs the same check before it converts an image, and stops with the lines that failed.

Kairos does not convert a running machine. It converts a container image. Get the `kairos-init` binary from its image, then run the check in the container image you want to use as the base, because an image often differs from an installed machine:

```bash
docker create --name kairos-init-copy quay.io/kairos/kairos-init:{{< KairosInitVersion >}}
docker cp kairos-init-copy:/kairos-init ./kairos-init
docker rm kairos-init-copy
docker run --rm -v "$PWD/kairos-init:/kairos-init:ro" ubuntu:24.04 /kairos-init check
```

To check a running machine, copy the binary to it and run `./kairos-init check`.

Each line is one requirement. These are some of the lines for Kali Linux:

```text
  pass  family: debian, as a derivative of debian (ID_LIKE=debian)
  fail  packages: yip cannot tell the package manager from ID=kali, kairos-init stops with "unknown package manager"
  fail  build steps: no kairos-init stage matches PRETTY_NAME=Kali GNU/Linux Rolling, so it builds no initramfs and does not enable the network and ssh services
```

| Line | Meaning |
|---|---|
| `pass` | The requirement is met, or the package list of the family covers it. The check does not look in the package repositories, so only a build proves that the packages exist. |
| `warn` | Kairos works without it, but a feature or a boot mode is not available. |
| `fail` | The system cannot become a Kairos system as it is. |

The command exits with 1 when there is at least one `fail`, and with 2 when you use it wrongly, so you can also run it in your own build pipeline. These flags change what it checks:

| Flag | Use it when |
|---|---|
| `--trusted-boot` | You want a [Trusted Boot](/docs/installation/trustedboot/) image. |
| `--converted` | `kairos-init` already ran, and you want to know if something is missing. |
| `--root <dir>` | You want to check an unpacked root filesystem. Add `--arch <arch>` if it is for another architecture. |
| `--quiet` | You only want the `warn` and `fail` lines. |

The conversion options `--stage`, `--skip-step`, `--model` and `--stage-extensions` also work with `check`, so you can see what the conversion will see.

The Kairos continuous integration runs `kairos-init check` before and after the conversion on the same base images, and fails when the two disagree.

## Requirements

The check reports a missing **Required** item as `fail` and a missing **Optional** item as `warn`. Items that only one boot mode needs, such as UEFI, are also a `warn`.

When `kairos-init` has a package list for your family, you do not have to install these yourself. The list is here so that you can tell whether your distribution has them.

### Platform

| Requirement | Level | Notes |
|---|---|---|
| amd64, arm64 or riscv64 | Required | Not every family has packages for all three. |
| The package manager of the family | Required | `apt-get`, `dnf`, `zypper` or `apk`. `microdnf` alone is not enough. Hadron has none. |
| systemd or OpenRC | Required | One of them. With both installed, the tools cannot choose. |
| systemd 252 or newer, with `systemd-cryptenroll` and `systemd-cryptsetup` | Optional, required for [Trusted Boot](/docs/installation/trustedboot/) | Also needed for encryption bound to TPM measurements. |
| A layout where `/usr` is image content | Required | `/usr` is read-only. `/etc`, `/var` and `/srv` are writable, but changes there are lost on reboot, except in [the paths that Kairos keeps](/docs/architecture/immutable/). `/home`, `/opt`, `/root` and `/usr/local` are kept. The check does not look at this. |

### Kernel

A driver can be a module or built into the kernel.

| Requirement | Level | Used for |
|---|---|---|
| A kernel with its modules in `/lib/modules` | Required | Boot |
| `overlay` | Required | Writable paths on a read-only system |
| `squashfs`, `loop`, `isofs` | Required | System images, install media and recovery |
| `ext4`, `vfat` | Required | Partitions, EFI system partition |
| `dm_mod` | Required | LVM and encryption |
| `dm_crypt` | Optional, required for Trusted Boot | [Encrypted partitions](/docs/advanced/partition_encryption/) |
| `dm_snapshot` | Optional | Boot from write-protected media |
| `tpm_crb`, `tpm_tis` | Optional | TPM |
| `dm_multipath` | Optional | Multipath storage |

### Boot

Trusted Boot images need none of this. AuroraBoot, the Kairos tool that builds ISOs and disk images, brings systemd-boot and builds the unified kernel image.

| Requirement | Level | Used for |
|---|---|---|
| `dracut` with `bash`, `gawk`, `awk`, `sync` and `lvm`, or `mkinitfs` | Required | Building the initramfs |
| `lsinitrd` | Optional | Checking the content of a dracut initramfs |
| `grub2-editenv` or `grub-editenv` | Required | Boot entries and the fallback after a failed upgrade |
| `grub2-install` or `grub-install`, with the `i386-pc` files | Optional, amd64 only | Install on a BIOS machine |
| GRUB modules `loopback`, `squash4`, `xzio`, `gzio`, `regexp` | Optional, required for UEFI | Loading the system image |
| shim and the GRUB EFI file | Optional, required for UEFI | Install on a UEFI machine. They come from the distribution, because with Secure Boot, shim, GRUB and the kernel have to be signed by the same vendor. They have to be in a path that the agent knows. riscv64 needs no shim. |

### Tools

| Requirement | Level | Used for |
|---|---|---|
| `mount`, `umount`, `blkid`, `lsblk`, `findmnt`, `udevadm` | Required | Finding and mounting partitions |
| `depmod`, `modprobe` | Required | Kernel modules |
| `rsync`, `tar` | Required | Copying the system on install and upgrade |
| `cryptsetup` | Required | Part of the initramfs, also without encryption |
| `e2fsck`, `tune2fs`, `mkfs.ext2`, `mkfs.ext3`, `mkfs.ext4`, `mkfs.vfat` | Required | Filesystems |
| `sudo`, `less`, `mount.nfs` | Required | Checked by `kairos-init validate` (`mount.nfs` not on Hadron) |
| `dbus-uuidgen` | Required with OpenRC | Machine id |
| systemd-networkd or NetworkManager, or ConnMan with OpenRC | Optional | Network |
| `sshd`, `curl` | Optional | Remote access, network boot |
| `mksquashfs` | Optional | Squashfs recovery image |
| `dmsetup` | Optional | State of encrypted partitions |
| `systemd-sysext` | Optional | [System extensions](/docs/advanced/sys-extensions/) |

Kairos creates the disk partitions itself, so the distribution does not have to bring a partitioning tool.

## Next steps

- [The Kairos Factory](/docs/reference/kairos-factory/): convert your base image.
- [Bring Your Own Image](/docs/reference/byoi/): build and publish your own images.
