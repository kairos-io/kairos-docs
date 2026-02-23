---
title: "Using /opt with System Extensions"
sidebar_label: "Using /opt with System Extensions"
sidebar_position: 3
---

## Using /opt with System Extensions

By default, Kairos does not include `/opt` as a system extension (`sysext`) overlay hierarchy. This is because in normal runtime, `/opt` is writable and bind-mounted to the persistent partition, allowing users and applications to freely write data that persists across reboots.

However, when a system extension is loaded that includes a `/opt` hierarchy, the behavior of that directory changes: it becomes **read-only**, overridden by the overlay from the system extension image. This is a consequence of how `systemd-sysext` currently operates and reflects a known upstream limitation.

### Why `/opt` Might Be Needed

If your use case includes deploying system extensions that provide optional software, plugins, or third-party tools installed under `/opt`, you might need to explicitly enable `/opt` as a supported hierarchy for sysext overlays.

This can be done by configuring the environment variable `SYSTEMD_SYSEXT_HIERARCHIES` to include `/opt`, and ensuring that the `systemd-sysext` service uses this setting both at runtime and in the initramfs phase.

:::warning ⚠️
Once `/opt` is included in the sysext overlay, the directory becomes read-only as soon as any system extension mounts a `/opt` subtree. This can break applications or scripts expecting to write to `/opt`.

As of systemd 255, there is no way to mark overlay hierarchies as mutable. However, upstream efforts are underway to address this in [systemd 256](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html#Mutability) and beyond, allowing finer control over the mutability of sysext mount points.
:::

---

## Enabling `/opt` in System Extensions: Cloud-Init Configuration

To allow system extensions to provide content under `/opt`, you can modify the `systemd-sysext` configuration using Kairos cloud config.

Below is an example cloud-init YAML you can embed in your OEM configuration or custom image. It ensures that `/opt` is registered as a sysext hierarchy both in normal and Trusted Boot installations. In here we are overriding the existing files to include the `/opt` directory in the `SYSTEMD_SYSEXT_HIERARCHIES` environment variable that Kairos sets by default.

```yaml
name: "sysext using /opt"
stages:
  initramfs.after:
    - name: "systemd-sysext uki config"
      if: '[ -e "/run/cos/uki_boot_mode" ] && [ ! -e "/run/cos/recovery_mode" ] && [ ! -e "/run/cos/autoreset_mode" ]'
      files:
        - path: /etc/systemd/system/systemd-sysext.service.d/kairos-uki.conf
          permissions: 0644
          owner: 0
          group: 0
          content: |
            [Service]
            TimeoutStartSec=10
            ExecStart=
            ExecStart=systemd-sysext refresh --image-policy="root=verity+signed+absent:usr=verity+signed+absent"
            ExecReload=
            ExecReload=systemd-sysext refresh --image-policy="root=verity+signed+absent:usr=verity+signed+absent"
            Environment="SYSTEMD_SYSEXT_HIERARCHIES=/usr/local/bin:/usr/local/sbin:/usr/local/include:/usr/local/lib:/usr/local/share:/usr/local/src:/usr/bin:/usr/share:/usr/lib:/usr/include:/usr/src:/usr/sbin:/opt"
            [Unit]
            JobRunningTimeoutSec=5

    - name: "systemd-sysext config"
      if: '[ ! -e "/run/cos/uki_boot_mode" ] && [ ! -e "/run/cos/recovery_mode" ] && [ ! -e "/run/cos/autoreset_mode" ]'
      files:
        - path: /etc/systemd/system/systemd-sysext.service.d/kairos.conf
          permissions: 0644
          owner: 0
          group: 0
          content: |
            [Service]
            TimeoutStartSec=10
            ExecStart=
            ExecStart=systemd-sysext refresh --image-policy="root=verity+absent:usr=verity+absent"
            ExecReload=
            ExecReload=systemd-sysext refresh --image-policy="root=verity+absent:usr=verity+absent"
            Environment="SYSTEMD_SYSEXT_HIERARCHIES=/usr/local/bin:/usr/local/sbin:/usr/local/include:/usr/local/lib:/usr/local/share:/usr/local/src:/usr/bin:/usr/share:/usr/lib:/usr/include:/usr/src:/usr/sbin:/opt"
            [Unit]
            JobRunningTimeoutSec=5

    - name: "systemd-sysext set hierarchy system-wide"
      if: '[ ! -e "/run/cos/recovery_mode" ] && [ ! -e "/run/cos/autoreset_mode" ]'
      files:
        - path: /etc/profile.d/systemd-sysext.sh
          permissions: 0644
          owner: 0
          group: 0
          content: |
            export SYSTEMD_SYSEXT_HIERARCHIES="/usr/local/bin:/usr/local/sbin:/usr/local/include:/usr/local/lib:/usr/local/share:/usr/local/src:/usr/bin:/usr/share:/usr/lib:/usr/include:/usr/src:/usr/sbin:/opt"

    - name: "systemd-sysext initramfs settings"
      if: '[ -e "/sbin/systemctl" ] || [ -e "/usr/bin/systemctl" ] || [ -e "/usr/sbin/systemctl" ] || [ -e "/bin/systemctl" ]'
      systemctl:
        enable:
          - systemd-sysext
