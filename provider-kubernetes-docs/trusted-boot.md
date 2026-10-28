---
title: "Trusted boot"
linkTitle: "Trusted boot"
weight: 6
description: Running the provider on a UKI node, the first-boot fix in v0.4.0, and what you can and cannot observe afterwards.
sidebar_position: 6
---

The `cluster:` block on a trusted boot (UKI) node is identical to the one on a GRUB node. The provider reads the same keys and does the same work. What differs is how the artifact is built, how the config reaches the node, and what you can see afterwards when something goes wrong.

Build and deliver the artifact the way [Trusted Boot installation](/docs/installation/trustedboot/) describes. Nothing on this page replaces that.

## First boot now works

Through v0.3.0, a UKI node could not bootstrap on its first boot after install.

kairos-sdk's `clusterplugin` writes the cluster configuration to `/usr/local/cloud-config/cluster.kairos.yaml`, opening it with `O_CREATE|O_WRONLY|O_TRUNC`, and never creates the parent directory. A GRUB install creates that directory as a side effect of the install's chroot hook, before the first boot. The UKI install and state-reset paths have no equivalent hook, so on those layouts the directory simply did not exist the first time it was needed. The write failed, nothing was configured, the kubelet crash-looped, and the failure was silent in every channel. A plain reboot made the node converge; a state reset reproduced the problem instead of fixing it.

Since v0.4.0 the provider creates that one directory itself, `/usr/local/cloud-config` and only that directory, never its ancestors, at mode 0700, on every `agent.boot` event. It uses an openat and mkdirat walk that refuses to follow a symlink and refuses an entry that already exists unless it is a plain, root-owned directory.

A fresh UKI install and a UKI state reset both converge with no manual step. This was validated on a secure-boot VM with an emulated TPM.

The same release also fixed the bundled image import on UKI nodes, where the read-only root filesystem is world-writable by mode and the import refused it outright. Air-gapped trusted boot installs work. See [Air-gapped installs](../air-gapped).

## The status document is your only channel

There is no log channel reachable after boot on a UKI node.

The provider does log its cluster-config-directory outcome at error level, the same as everything else it logs. That line lands in a pre-pivot, tmpfs-backed log, which is immucore's own log. A VM run on 2026-09-21 confirmed it appears afterwards in neither `immucore.log`, nor `agent.log`, nor the journal. None of those channels survive the switch-root on a UKI node.

The status document does:

```bash
sudo cat /run/provider-kubernetes/status.yaml         # this boot, tmpfs
sudo cat /var/log/provider-kubernetes/status.yaml     # persistent mirror
```

On a UKI node the `/var/log` mirror is load-bearing rather than a convenience. It is confirmed to survive the pivot, and it is the only copy you can rely on if you did not, or could not, read `/run` before something rebooted the node.

Do not go looking for a boot-log line on a UKI node. Read the `reason:` field.

## The reasons you will see here

Eight reason codes come from this stage, and they fall into three groups.

Three of them make the provider withhold `cluster_token` and emit no bootstrap commands at all for that boot: `ClusterConfigAncestorUnsafe` (`/usr` or `/usr/local` is a symlink, not a plain directory, or not owned by root), `ClusterConfigDirUnsafe` (something already occupies `/usr/local/cloud-config` and is not a plain root-owned directory), and `ClusterConfigTokenFileUnsafe` (the token file exists and is anything other than an intact, root-owned, 0600, single-link regular file). In all three the provider could not verify where the write would land, so it emits an inert configuration instead of the real one: the write Kairos performs regardless then carries nothing worth reading. The status document reports `phase: Failed`, accurately, since nothing bootstraps that boot.

Two report a failure without withholding: `ClusterConfigAncestorMissing` and `ClusterConfigDirCreateFailed`. Here the token is not at risk, because the SDK's own write fails the same way whatever the provider does, but the node genuinely will not converge, so the phase is still `Failed`.

Three are report-only, and the boot converges normally: `ClusterConfigDirWritable`, `ClusterConfigOverrideRejected` and `ClusterConfigNotPersistent`. They never set `phase: Failed` and never overwrite an existing `Converged` phase. `ClusterConfigNotPersistent` is the one to act on: it means `/usr/local` is not a separate mount on this boot, so the token is about to be written to storage that will not survive a reboot. Check that `COS_PERSISTENT` mounted.

The full table, with what to do about each, is in [Troubleshooting](../troubleshooting).

## Read the 0700 mode narrowly

The directory mode is not a security boundary, and the provider's own documentation says so plainly. What it buys is precise and small.

On the one boot where the provider creates the directory, it closes the few milliseconds between the provider's `mkdirat` and the SDK's `open`, during which a non-root actor could otherwise pre-place a symlink, a FIFO, or the token file itself.

It buys nothing on any later boot. The directory exists by then, the provider never changes the mode or owner of an existing directory, and the platform itself widens it to 0770 root:admin from the very next boot's initramfs stage. From that point a member of the `admin` group can pre-place the token file exactly as if the fix did not exist.

It is not a boundary against an actor who already has root, and not a boundary against a hostPath-capable workload. Both already have equivalent or greater access to everything under the persistent partition. See [Security](../security).

It also does not make `cluster.kairos.yaml` itself safe once it exists. The SDK's own `open` is path-based, follows a symlink, and uses neither `O_NOFOLLOW` nor `O_EXCL`. A hazard planted after the provider's checks but before that write is not something the provider can close; only a change in kairos-sdk can.

## Two known issues this does not close

Both were confirmed by a VM run on 2026-09-21 and are listed as known issues in the v0.4.0 release.

A non-regular, open-blocking file such as a FIFO planted under `/usr/local/cloud-config` hangs kairos-agent's own configuration scan unboundedly, before the provider's code runs at all, while holding a shutdown inhibitor. The result is a node that can neither be reached nor rebooted cleanly. This is not specific to this provider and affects every Kairos cluster provider; the provider's own preflight only ever covers a file planted after that scan has already run. Recovery is manual: boot recovery media and remove the file from the persistent partition.

A symlink planted at `/usr/local/cloud-config` is refused by the provider, but kairos-init's own `10_accounting.yaml` runs an unconditional recursive `chown` and `chmod` against that path in the same initramfs stage, and that walk is not symlink-safe. It follows the link and changes the mode and ownership of whatever it points at. Pointing it at `/etc` was confirmed to break `sshd` and non-root `bash`. The provider's withhold reduces `cluster_token` disclosure only. It cannot prevent this, because the damage happens in another component's step that runs regardless of what the provider refuses.

## Overriding the config path

`cluster_config_path` is honored, but its directory part must be exactly `/usr/local/cloud-config`. Anything else, including a relative path or one containing `..`, is rejected with `reason: ClusterConfigOverrideRejected` and nothing is created. Pre-creating your own directory safely is then your job.
