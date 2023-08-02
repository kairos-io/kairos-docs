---
title: "Configuring partitions"
linkTitle: "Configuring partitions"
weight: 1
description: >
---

{{% alert title="Note" color="warning" %}}

This feature will be available in Kairos version `2.4.0` and in all future releases.

{{% /alert %}}


Kairos configuration mechanism for partitions is based on the [cloud-config]({{< relref "../Reference/configuration" >}}) file 
given during installation to override the default values set by the installer.

We allow certain flexibility in the sizes and filesystems used for the default install and allow to create extra partitions as well.

For example, the following cloud-config will make the `oem` partition have a size of 512Mb and an `ext4` filesystem, 
recovery with a size of 10000Mb and a `ext4` filesystem, while leaving the rest of the partitions to their default sizes and filesystems. 

```yaml
#cloud-config

install:
  device: "/dev/sda"
  auto: true
  partitions:
    oem:
      size: 512
      fs: ext4
    recovery:
      size: 10000
      fs: ext4
```



And the following config will leave the default partitions as is, but create 2 new extra partitions with the given sizes, filesystems and labels:

```yaml
#cloud-config

install:
  device: "/dev/sda"
  auto: true
  extra-partitions:
    - name: first_partition
      size: 512
      fs: ext3
    - name: second_partition
      size: 100
      fs: ext2
      label: PARTITION_TWO
```

In the case of wanting an extra partition to take over the rest of the disk space (by setting the size to 0), we need to also mark persistent with a fixed size.
Currently, the default value for the persistent partition is set to 0 which means "take over the rest of the disk space free".
In order to mark a different partition with that value, we need to set it to a fixed size, as there cannot be 2 partitions that want to take over the rest of the space.

An example of this would be as follows:

```yaml
#cloud-config

install:
  device: "/dev/sda"
  auto: true
  partitions:
    persistent:
      size: 500
  extra-partitions:
    - name: big_partition
      size: 0
      fs: ext3
```


Note that there are some caveats in the `extra partitions` setup:
 - only `size`, `fs`, `name` and `label` are used for the partition creation, the name is currently used for the partition label.
 - if a partition has no fs set, the partition will be created, but it will not be formatted
 - No mounting of any type is done during installation to the extra partitions. That part should be done on the stages of the cloud-config manually, with something like the following step:

```yaml
  initramfs:
    - name: "Mount PARTITION_TWO under /opt/extra"
      commands:
        - mkdir -p /opt/extra
        - mount -o rw /dev/disk/by-label/PARTITION_TWO /opt/extra
```



For more information about the full config available for partitions and extra partitions see the full [cloud-config page]({{< relref "../Reference/configuration" >}})