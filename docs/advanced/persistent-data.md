---
title: "Persistent data"
sidebar_label: "Persistent data"
sidebar_position: 3
---

Kairos replaces the operating system on every upgrade, so your data has to live outside the OS image. The `persistent` partition does this for the paths Kairos binds by default (see [Immutable architecture](/docs/architecture/immutable/)). This page covers data you manage yourself: a database, a storage driver for Kubernetes, or a ZFS pool.

The patterns below were tested in virtual machines. In each one the data survived an A/B upgrade and a rollback to the passive image.

The rule for all of them: keep data on the `persistent` partition, on its own partition, or on its own disk. Never keep it on a path that is not persistent, such as most of `/usr` or `/etc`. `/usr/local` and the paths Kairos binds are persistent.

## A dedicated partition

Create the partition at install time and mount it. Kairos creates extra partitions but does not mount them (see [Configuring partitions](/docs/advanced/configuring_partitions/)).

```yaml
#cloud-config
install:
  auto: true
  device: /dev/vda
  extra-partitions:
    - name: DBDATA
      size: 2048 # MiB
      fs: ext4
      label: DBDATA
stages:
  initramfs:
    - name: mount the database partition
      commands:
        - mkdir -p /var/lib/mydb
        - mountpoint -q /var/lib/mydb || mount LABEL=DBDATA /var/lib/mydb
```

The `persistent` partition takes the rest of the disk. Only one partition can fill the disk, so if the extra partition must fill it (`size: 0`), give `persistent` a fixed size. The `initramfs` stage runs before services start, so a database service never sees an unmounted directory. The `mountpoint -q` check makes the stage safe to run more than once. To encrypt the partition, see [Partition encryption](/docs/advanced/partition_encryption/).

## ZFS on Hadron

The [hadron-layers](https://github.com/kairos-io/hadron-layers) project publishes a `zfs` layer: the OpenZFS kernel module, the tools and the systemd units. Keep the pool on its own disk. ZFS holds your data, and the rollback of the operating system still comes from the OCI images.

```dockerfile
FROM ghcr.io/kairos-io/hadron-layers/zfs:2.4.4 AS zfs
FROM quay.io/kairos/hadron:v0.5.3-core-amd64-generic-v4.4.0-rc2
COPY --from=zfs / /
RUN for k in /usr/lib/modules/*; do depmod -a "$(basename "$k")"; done && \
    systemctl enable zfs.target zfs-import.target zfs-import-cache.service \
      zfs-import-scan.service zfs-mount.service
```

Things to know:

- The layer must match the kernel of the Hadron release you build on. Use the layer tag and the Hadron tag that belong together; the versions above are the ones tested.
- The layer ships the unit files and a preset, but the preset is not applied. Without the `systemctl enable` line, the pool is not imported at boot.
- The root file system is read-only. Mount the pool under a writable path such as `/usr/local/...`, or use `mountpoint=none`.
- Create the pool once, for example `zpool create -m /usr/local/zfsdata data /dev/vdb`. `/etc/zfs` is persistent, so the pool cache survives upgrades.
- Only Hadron was tested here.

## Kubernetes storage drivers

`/var/lib/longhorn` and `/var/lib/rook` are persistent paths by default, so they need no extra mount. The Hadron k0s image used for the test carries `iscsiadm`, `iscsid` and the `iscsi_tcp`, `dm_crypt` and `nvme_tcp` kernel modules, and Kairos enables `iscsid` by default. Load the modules and make sure `iscsid` runs at boot:

```yaml
stages:
  boot.after:
    - name: prepare Longhorn
      commands:
        - modprobe iscsi_tcp
        - modprobe dm_crypt
        - systemctl enable --now iscsid
```

Then install the storage driver as usual. This was tested with Longhorn v1.9.1 on a single k0s node. The first start can be slow while the images are pulled.

## Not covered

More than one node or replica, Rook with Ceph, a database engine on the dedicated partition, ZFS on a partition of the install disk, and ZFS under LUKS were not tested.
