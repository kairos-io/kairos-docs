---
title: "Immutable"
sidebar_label: "Immutable"
description: "Learn about Kairos' immutable architecture design, where the system boots in a restricted, permissionless mode with read-only paths. Discover how this approach enhances security, simplifies maintenance, and enables predictable upgrades across your infrastructure."
sidebar_position: 1
date: 2022-11-13
---

Kairos adopts an immutable layout and derivatives created with its toolkit, inherit the same immutability attributes.

An immutable OS is a carefully engineered system which boots in a restricted, permissionless mode, where certain paths of the system are not writable. For instance, after installation it's not possible to add additional packages to the system, and any configuration change is discarded after reboot.

A running Linux-based OS system will have the following paths:

```
/usr/local - persistent ( partition label COS_PERSISTENT)
/oem - persistent ( partition label COS_OEM)
/var - ephemeral
/etc - ephemeral
/srv - ephemeral
/ immutable
```

`/usr/local` will contain all the persistent data which will be carried over in-between upgrades, unlike the changes made to `/etc` which will be discarded.

## Default persistent paths

Other than the `/usr/local` path, Kairos will also bind mount the following paths to the persistent partition under `/usr/local/.state` to make them persistent and read/write:

```yaml
/etc/cni
/etc/init.d
/etc/iscsi
/etc/k0s
/etc/kubernetes
/etc/modprobe.d
/etc/pwx
/etc/rancher
/etc/runlevels
/etc/ssh
/etc/ssl/certs
/etc/sysconfig
/etc/systemd
/etc/zfs
/home
/opt
/root
/usr/libexec
/var/cores
/var/lib/ca-certificates
/var/lib/cni
/var/lib/containerd
/var/lib/calico
/var/lib/dbus
/var/lib/etcd
/var/lib/extensions
/var/lib/k0s
/var/lib/kubelet
/var/lib/longhorn
/var/lib/osd
/var/lib/rancher
/var/lib/rook
/var/lib/tailscale
/var/lib/wicked
/var/lib/kairos
/var/log
```

Some specific distros have additional paths, for example:

- For Ubuntu/Debian, `/snap`, `/var/snap` and `/var/lib/snapd`
- For Red Hat/Fedora/Rockylinux/Almalinux `/usr/share/pki/trust` and `/usr/share/pki/trust/anchors` 


For the most up-to-date list of paths, please refer to the [default rootfs configuration](https://github.com/kairos-io/kairos-init/blob/main/pkg/bundled/cloudconfigs/00_rootfs.yaml#L13) and the [extra bind mounts configuration](https://github.com/kairos-io/kairos-init/blob/main/pkg/bundled/cloudconfigs/01_extra_binds.yaml) files.

:::info
You can add additional paths to the persistent partition by using the [bind_mounts configuration option](/docs/v3.5.7/reference/configuration/). This is useful for storing additional data that you want to persist across reboots or upgrades.
:::

## Benefits of using an Immutable System

There are many reasons why you would like to use an immutable system, in this article we'll present two of them.

1. From a security standpoint, it's far more secure than traditional systems. This is because most attack vectors rely on writing on the system, or installing persistent tools after a vector has been exploited.
2. From a maintenance perspective, configuration management tools like Chef, Puppet, or the likes aren't needed because immutable systems only have one configuration entry point. Every other configuration is cleaned up automatically after a reboot.

The benefit of rolling out the same system over a set of machines are the following:

- **No snowflakes** - All the machines are based on the same image, configuration settings and behavior. This allows to have a predictable infrastructure, predictable upgrades, and homogeneous configurations across your cluster.
- **Configuration is driven via cloud-init** - There is only one source of truth for the configuration, and that happens at bootstrap time. Anything else is handled afterwards—natively via Kubernetes, so no configuration management software is required.
- **Reduced attack surface** - Immutable systems cannot be modified or tampered at runtime. This enhances the security of a running OS, as changes on the system are not allowed.

Tools like Chef, Puppet, and Ansible share the same underlying issues when it comes to configuration management. That is, nodes can have different version matrices of software and OS, which makes your set of nodes inhomogeneous and difficult to maintain and orchestrate from day 1 to day 2.

Kairos tackles the issue from different angle, as can turn _any_ distribution to an "immutable" system, distributed as a standard container image, which gets provisioned to the devices as declared. This allows to treat OSes with the same repeatable portability as containers for apps, removing snowflakes in your cluster. Container registries can be used either internally or externally to the cluster to propagate upgrades with customized versions of the OS (kernel, packages, and so on).

## Design

Kairos after installation will create the following partitions:

- A state partition that stores the container images, which are going to be booted (active and passive, stored in `.img` format which are loopback mounted)
- A recovery partition that stores the container images, used for recovery (in `.squashfs` format)
- An OEM partition (optional) that stores user configuration and cloud-config files
- A persistent partition to keep the data across reboots

![Kairos-installation-partitioning](https://user-images.githubusercontent.com/2420543/195111190-3bdfb917-312a-40f4-b0bc-4a65a701c06b.png)

The persistent partition is mounted during boot on `/usr/local`, and additional paths are mount-bind to it. Those configuration aspects are defined in a [cloud-config](https://github.com/kairos-io/packages/blob/9b49d6aacd554cd990c87b63de1221328bbcdb81/packages/static/kairos-overlay-files/files/system/oem/00_rootfs.yaml#L18) file. It is possible to override such configuration, via a custom cloud-config, during installation.

The Recovery system allows to perform emergency tasks, in case of failure from the active and passive images. Furthermore a fallback mechanism will take place, so that in case of failures the booting sequence will be as follows: "A -> B -> Recovery".

The upgrade happens in a transition image and takes place only after all the necessary steps are completed. An upgrade of the 'A/B' partitions can be done [with Kubernetes](/docs/upgrade/kubernetes) or [manually](/docs/upgrade/manual). The upgrade will create a new pristine image, that will be selected as active for the next reboot, the old one will be flagged as passive. If we are performing the same from the passive system, only the active is subject to changes.

### Kernel and Initrd

The Kernel and Initrd are loaded from the system images and are expected to be present in the container, that is pulled down and used for upgrades. Differently from standard approaches, Kairos focuses on having static Initrds, which are generated while building images used for upgrades - in opposite of generating Initramfs locally on the node. A typical setup has kernels and initrd in a special boot partition dedicated for boot files - in Kairos instead the Kernel and Initrd are being loaded from the images, which are chainloaded from the bootloader (GRUB). This is a design choice to keep the entire OS stack confined as a single layer which gets pulled and swapped atomically during upgrades.
