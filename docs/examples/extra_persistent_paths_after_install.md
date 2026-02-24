---
title: "Adding persistent paths after install"
sidebar_label: "Adding persistent paths after install"
description: This section describes examples on how to add persistent paths after install
---

Drop a file under `/oem/91_paths.yaml` with the following content:

```yaml
stages:
  rootfs:
    - name: "Custom mounts"
      environment_file: /run/cos/cos-layout.env
      environment:
        CUSTOM_BIND_MOUNTS: "/var/lib/path1 /var/lib/path2 /var/lib/path3"
```

This will indicate to Kairos to bind mount the paths `/var/lib/path1`, `/var/lib/path2`, and `/var/lib/path3` to the persistent partition under `/usr/local/.state` after the next reboot.


:::info Note

The example mentions `/oem/91_paths.yaml`, but you can use any file name as long as it is under `/oem/` and has a `.yaml` extension. The file will be processed by Kairos during the next boot.

:::

