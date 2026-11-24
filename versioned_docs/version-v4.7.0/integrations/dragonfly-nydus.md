---
title: "Dragonfly and Nydus"
sidebar_label: "Dragonfly and Nydus"
description: Run the Dragonfly and Nydus snapshotter on Kairos with a persistent snapshotter state directory
---

Install Dragonfly and the Nydus snapshotter by following the upstream guide:
[Dragonfly Helm charts installation](https://github.com/dragonflyoss/helm-charts/blob/main/INSTALL.md).

The rest of this page covers only what is different on Kairos.

## Keep the snapshotter state across reboots

The Nydus snapshotter keeps its state under `/var/lib/nydus-snapshotter`. On Kairos, `/var` is an
ephemeral overlay, so that directory is wiped on every boot unless you make it persistent.
Add it to `CUSTOM_BIND_MOUNTS` in your cloud-config:

```yaml
#cloud-config

stages:
  rootfs:
    - name: "Persist the Nydus snapshotter state"
      environment_file: /run/cos/custom-layout.env
      environment:
        CUSTOM_BIND_MOUNTS: "/var/lib/nydus-snapshotter"
```

You can put this in the cloud-config you install with, or drop it in a file under `/oem/` on a
running node. It takes effect on the next boot. The directory is then bind mounted from the
persistent partition.

`CUSTOM_BIND_MOUNTS` takes a space-separated list, and the last value written wins. If you
already set it elsewhere, including through `install.bind_mounts`, add `/var/lib/nydus-snapshotter`
to that list instead of adding a second entry.

See [Bind mounts](/docs/advanced/customizing#bind-mounts) for how custom mounts work.
