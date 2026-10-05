---
title: "SELinux"
sidebar_label: "SELinux"
sidebar_position: 2
slug: /security/selinux
description: How SELinux works on Kairos, which bases support it, how to turn it on with install.selinux, and how labels are kept on an immutable system.
---

# SELinux

Kairos can boot RHEL and SUSE family images with SELinux on, in permissive or enforcing mode, using the distribution's own `targeted` policy. SELinux is off unless you turn it on at install time.

:::note Release status
SELinux support is on kairos master and ships with the next kairos release after v4.3.0. Images built with v4.3.0 or older always boot with `selinux=0`. SELinux on Trusted Boot (UKI) images also needs an AuroraBoot release newer than v0.27.1.
:::

## Supported bases

| Base | SELinux | Tested in CI |
|---|---|---|
| Fedora, Rocky Linux, AlmaLinux, Oracle Linux, CentOS Stream | ✅ | Rocky 9 |
| openSUSE Leap, Tumbleweed | ✅ | Leap 16.0 |
| Hadron, Ubuntu, Debian, Alpine | ❌ | |

On the RHEL and SUSE families, `kairos-init` installs `policycoreutils` and `selinux-policy-targeted` into the image. Kairos does not ship a policy module of its own. The other bases get no policy packages and always boot with `selinux=0`, even if you set `install.selinux.enabled: true`.

CI tests both modes on Rocky 9 and openSUSE Leap 16.0, booted with GRUB on amd64. See [Feature sets](../reference/featuresets.md) for the full per-base table.

## Turning it on

Add an `install.selinux` block to the cloud-config you install with:

```yaml
#cloud-config
install:
  selinux:
    enabled: true
    mode: enforcing
```

| Field | Values | Default | Notes |
|---|---|---|---|
| `enabled` | `true`, `false` | `false` | Boot the installed system with SELinux on. |
| `mode` | `permissive`, `enforcing` | `permissive` | Ignored when `enabled` is `false`. An unknown value falls back to `permissive`. |

The installer logs a warning if `mode` is set while `enabled` is `false`, and if `mode` has an unknown value.

There is no `selinux` block under `upgrade` or `reset`. The setting is written once at install time as `selinux_enabled` and `selinux_mode` in a GRUB environment file:

- `/oem/grubenv` by default.
- `grubenv` at the root of the STATE partition if `COS_OEM` is in `install.encrypted_partitions`, because GRUB cannot read an encrypted OEM. On the running system this is `/run/initramfs/cos-state/grubenv`.

The setting survives upgrades and resets, because neither rewrites that file. A reset with `reset-oem: true` formats OEM, so on a default install it removes the setting and the system boots with SELinux off afterwards.

To change the mode on an installed GRUB system, edit the GRUB environment and reboot:

```bash
grub2-editenv /oem/grubenv set selinux_enabled=true selinux_mode=enforcing
```

With `COS_OEM` encrypted, edit the STATE copy instead. STATE is mounted read-only, so remount it first:

```bash
mount -o remount,rw /run/initramfs/cos-state
grub2-editenv /run/initramfs/cos-state/grubenv set selinux_enabled=true selinux_mode=enforcing
mount -o remount,ro /run/initramfs/cos-state
```

Do not edit `/etc/selinux/config`. Kairos rewrites its `SELINUX=` line on every boot to match the kernel cmdline, so a manual edit is lost on the next boot.

## How it works

SELinux on an immutable system has one main problem: files need labels, and most of the filesystem is either a read-only image, a tmpfs overlay that is empty on each boot, or a bind mount from the persistent partition. Kairos handles this at install, at boot, and when the persistent layout changes.

### At install time

After the active image is written, `kairos-agent` runs `setfiles` against the image in a chroot. The persistent partition is bound at `/usr/local` and OEM at `/oem` during that chroot, so both are labeled too. The passive image file gets the `boot_t` label. Reset relabels the same way. Upgrade relabels the new image only when it is not squashfs, since a squashfs image cannot be relabeled after it is built.

If `setfiles` or the policy's `file_contexts` is missing, as on bases without SELinux, this step does nothing.

### Kernel cmdline

On GRUB, the boot script reads `selinux_enabled` and `selinux_mode` from the GRUB environment. On a RHEL or SUSE family image with `selinux_enabled=true`, it adds:

```text
security=selinux selinux=1 enforcing=0 rd.cos.selinux=<mode>
```

In every other case it adds `selinux=0`. The recovery entry always gets `selinux=0`, so recovery is a safe way back into a system with a broken policy or bad labels.

`enforcing=0` is always set, even in enforcing mode. The kernel starts in permissive mode and Kairos moves to enforcing later in boot, after labels are fixed. `rd.cos.selinux=` carries the requested mode to that step.

### At boot

When `selinux=1` is on the cmdline, the `initramfs` stage of the bundled SELinux cloud-config does three things:

1. Writes `file_contexts.subs` under `/etc/selinux/targeted/contexts/files/` from the bind mounts in `/etc/fstab`. Persistent paths are stored under `/usr/local/.state/<name>.bind` and bind-mounted to their real path, for example `/usr/local/.state/var-lib-rancher.bind` to `/var/lib/rancher`. The substitutions make `restorecon` label those directories with the policy rules for their real path.
2. Creates and enables `kairos-selinux-relabel.service`.
3. Sets `SELINUX=` in `/etc/selinux/config` to `enforcing`, `permissive` or `disabled`, to match the cmdline. This step also runs with SELinux off.

`kairos-selinux-relabel.service` is a oneshot unit that runs after `cos-setup-fs.service` and `kairos-agent.service`, and before `multi-user.target`. It runs, in order:

1. `restorecon -Riv /etc`
2. `restorecon -Rivx /var /srv`
3. `selinux-relabel-persistent`, which relabels `/usr/local /etc /var /home /oem /root /opt /srv`. It only does this when the policy version or the set of `*.bind` directories changed since the last run. It records both in `/usr/local/.state/selinux/.kairos-selinux-relabeled` after a successful run. The first boot after install, after a policy update, or after adding a bind mount does the full walk. Other boots skip it.
4. `setenforce 1` in enforcing mode, `setenforce 0` in permissive mode.

If the persistent relabel fails, the stamp is not written, `setenforce` does not run, and the system stays permissive. The relabel runs again on the next boot.

`immucore` keeps the extended attributes of the persistent state directories when it syncs them on boot, so their labels are not lost between boots.

### Trusted Boot (UKI)

A UKI has its cmdline baked in and signed, and a Trusted Boot system does not read `/oem/grubenv`. The SELinux mode is therefore chosen when you build the UKI, not when you install it.

Pass a cloud-config with an `install.selinux` block to `build-uki` with `--cloud-config`. AuroraBoot replaces `selinux=0` in the UKI cmdline with the same `security=selinux selinux=1 enforcing=0 rd.cos.selinux=<mode>` fragment GRUB uses:

```bash
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys -v $PWD/config.yaml:/config.yaml \
  quay.io/kairos/auroraboot build-uki -t iso -d /result/ \
  --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY \
  --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT \
  --cloud-config /config.yaml $CONTAINER_IMAGE
```

`install.selinux` in the install-time cloud-config has no effect on a UKI system. To change the mode, build a new signed UKI and upgrade to it.

Known gaps with UKI, both still open:

- AuroraBoot adds the SELinux fragment even when the image family has no SELinux policy, and only logs a warning ([kairos-io/AuroraBoot#893](https://github.com/kairos-io/AuroraBoot/pull/893)). Only set `install.selinux` when building UKIs from RHEL or SUSE family images.
- UKI recovery does not force SELinux off like GRUB recovery does ([kairos-io/kairos#5120](https://github.com/kairos-io/kairos/pull/5120)).

SELinux on UKI is not tested in CI yet.

## Checking and debugging

Check the current mode and the cmdline:

```bash
getenforce
cat /proc/cmdline
grub2-editenv /oem/grubenv list   # GRUB systems only
grub2-editenv /run/initramfs/cos-state/grubenv list   # GRUB, with COS_OEM encrypted
```

Check that the relabel unit ran:

```bash
systemctl status kairos-selinux-relabel.service
journalctl -u kairos-selinux-relabel.service
```

`kairos-agent logs` collects this unit's journal, see [Troubleshooting](../reference/troubleshooting.md).

`auditd` is installed and enabled as part of the [CIS hardening](./cis.md#linux-controls-in-place), and `/var/log/audit` is kept on the persistent partition, so AVC denials survive a reboot:

```bash
ausearch -m avc -ts boot
```

To force a full relabel of the persistent paths on the next boot, remove the stamp file and reboot:

```bash
rm /usr/local/.state/selinux/.kairos-selinux-relabeled
```

## Limitations

- Every boot starts in permissive mode. Enforcing mode starts when `kairos-selinux-relabel.service` finishes, before `multi-user.target`. Anything that runs earlier in boot is not confined.
- The first boot after install, after a policy update, or after adding a bind mount runs a full `restorecon` over the persistent paths. On a node with a lot of data under `/var` or `/usr/local`, this delays boot.
- Kubernetes under SELinux is not tested. Kairos skips the `k3s-selinux` RPM when it installs k3s, and `container-selinux` is not part of the image. Add the policy packages your workloads need when you build the image, and test in permissive mode first.
- Kairos does not ship tooling for custom policy modules. Add them to the image when you build it, for example with `semodule -i` in your Dockerfile, so the install-time `setfiles` run already sees them.
- SELinux enforcing is not yet part of the [CIS L1 hardening](./cis.md). CIS hardening installs audit rules that watch `/etc/selinux/` and `/usr/share/selinux/`, but does not turn SELinux on.
