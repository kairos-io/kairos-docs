---
title: "Upgrades"
linkTitle: "Upgrades"
weight: 7
description: The supported version window, upgrading one minor at a time, the A/B image model, and what rollback does and does not recover.
sidebar_position: 7
---

An upgrade is two things done together: you boot a newer provider-kubernetes image, and you bump the version pin in the node's cloud-config. On the next boot the provider notices the difference and drives `kubeadm upgrade`.

Neither half alone does anything. A newer image with the old pin is a no-op, deliberately, so a routine OS refresh never silently re-versions your cluster. A newer pin than the image ships is a hard error, refused before anything runs.

## The supported window

v0.4.0 supports Kubernetes 1.35, 1.36 and 1.37, and publishes one image per minor. The window is the three most recent in-support upstream minors and rolls forward as new ones ship. Releases up to v0.3.0 shipped 1.34, 1.35 and 1.36.

`clusterConfiguration.kubernetesVersion` must be inside the window and must match the kubeadm binary in the image you booted. There is no best-effort "close enough" behavior.

## One minor at a time

kubeadm upgrades one minor at a time, and so does the provider. Within the current window the supported edges are 1.35 to 1.36 and 1.36 to 1.37. To get from 1.35 to 1.37, step through 1.36: boot the 1.36 image with the 1.36 pin, let it converge, then do the same for 1.37.

Downgrades, skip-level targets and out-of-window targets are refused loudly, before anything destructive runs. The reconcile log records `refuse-upgrade` and the status document reports `reason: UpgradeRefused`.

A cluster still on 1.34, which has left the window, upgrades out the same way: boot the 1.35 image with the pin bumped to 1.35. Only the upgrade target has to be inside the window.

### The 1.36 to 1.37 edge moves etcd

kubeadm 1.37 upgrades stacked etcd from 3.6.8, which kubeadm 1.36.x deploys, directly to 3.7.0. etcd's own [3.7 upgrade guide](https://etcd.io/docs/v3.7/upgrades/upgrade_3_7/) asks for 3.6.11 or later before a rolling upgrade. This edge has not been validated on multi-control-plane clusters with stacked etcd. Take your own off-node etcd backup before crossing it, rather than relying on the provider's snapshot, and upgrade control planes strictly one at a time.

## Upgrading a single control plane

1. Check the cluster is healthy: `kubectl get nodes`, control-plane pods Running. Take an etcd backup, see below.
2. Bump the pin in the node's cloud-config, which on an installed node is under `/oem`, to the new minor: `kubernetesVersion: v1.37.0`.
3. Move the node to the matching image and reboot, either with `sudo kairos-agent upgrade --source oci:ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.37` followed by a reboot, or through your own provisioning flow.
4. On reboot the reconcile pass sees that the bundled binary is a minor ahead of the cluster and runs `kubeadm upgrade apply`. The kubelet is restarted onto the new version.
5. Verify with `kubectl version` for the server version and `kubectl get nodes` for the node.

## Upgrading several nodes

One node at a time, control planes first, then workers.

Upgrade the first control plane as above and wait until the cluster version has flipped and the node is Ready. Then each remaining control plane, one at a time: a follower runs `kubeadm upgrade node`, because the provider detects that the cluster has already advanced and does not re-apply. It waits, bounded, for the control plane to be healthy before it starts. Workers last, one at a time, each running `kubeadm upgrade node`.

This sequencing is yours to do. The provider adds bounded health gates but builds no cross-node lock, for the same reason it builds none for joins: a lock is something that can hang.

## The A/B image model, and the repair it needs

Kairos upgrades an OS by swapping one of two image slots and rebooting into it. That means the kubelet binary on disk is the new one before any `kubeadm upgrade` command has run.

Kubernetes removes and renames kubelet flags across minors, so the new kubelet can crash-loop on a flag the old kubeadm wrote, for example `--pod-infra-container-image`, removed in 1.35. Left alone that takes the control plane down before the upgrade can start.

The provider handles it. When an upgrade is due and the local API is unreachable, it runs `kubeadm init phase kubelet-start` to regenerate the kubelet configuration with the new kubeadm, which needs neither the API nor any secret. The kubelet starts, the existing control plane comes back, and then `kubeadm upgrade apply` runs. You do not need to do anything for this.

Do not list `/system/provider-kubernetes` in `kairos-agent upgrade` excluded paths. The bundled control-plane images must come from the image you boot.

## etcd backups

`kubeadm upgrade apply` mutates etcd and is largely forward-only. An etcd snapshot is a full dump of every cluster Secret, so it is as sensitive as the cluster CA. Three different backups can exist around an upgrade, and they are not interchangeable.

### The provider's pre-upgrade snapshot

On the control plane that runs `kubeadm upgrade apply`, and only with stacked etcd, the provider tries to take one snapshot with the bundled `/usr/bin/etcdctl` before applying.

It writes only onto encrypted storage: `/usr/local/provider-kubernetes/etcd-backup/` on the persistent partition, and only if that filesystem is ext4 or xfs sitting directly on a dm-crypt device, as it is when `COS_PERSISTENT` is encrypted with [partition encryption](/docs/advanced/partition_encryption/). On anything else, including a default unencrypted install, it refuses and writes nothing. It never creates a plaintext full-cluster dump.

It is bounded at two minutes, skipped when free space is below twice the etcd database size plus 1 GiB, and it never blocks the upgrade. It is taken once per cluster and target minor, so a retried apply or a reboot mid-upgrade keeps the first, clean, pre-upgrade snapshot rather than replacing it with a partially upgraded one. Files are 0600 root:root in a 0700 directory, kept until the next upgrade's snapshot replaces them. A reset does not remove them, and the provider never copies them off the node.

It does not replace your own backup. It lives on the same disk as etcd and exists only on the node that ran the apply.

Each attempt logs exactly one line in the reconcile log:

```bash
sudo grep 'etcd-snapshot outcome=' /var/log/provider-kubernetes-reconcile.log
```

| Outcome | Meaning |
|---------|---------|
| `taken` | Written. The line carries the path. |
| `skipped-already-taken` | A snapshot for this cluster and target already exists. |
| `skipped-encryption-unconfirmed` | The directory is not on dm-crypt. This is the default install. Take a manual backup. |
| `skipped-external-etcd` | No stacked etcd on this node. Back up your external etcd with its own tooling. |
| `skipped-etcdctl-missing` | The image predates the bundled `etcdctl`. Take a manual backup. |
| `skipped-insufficient-space` | Not enough free space on the persistent partition. |
| `failed` | The line carries the sanitized reason. The upgrade continues. Take a manual backup. |

### kubeadm's own copy

Independently of the provider, `kubeadm upgrade apply` and `kubeadm upgrade node` copy the etcd data directory to `/etc/kubernetes/tmp/kubeadm-backup-etcd-` plus a timestamp, on every stacked control plane, on every upgrade, even when the etcd version does not change. kubeadm uses it to roll back a failed etcd upgrade and leaves it there afterwards.

It contains every Secret and is plaintext unless the persistent partition is encrypted. The provider cannot prevent it, and the refusal described above does not apply to it. One copy accumulates per upgrade per control plane, on the same device etcd writes to, and a full disk raises etcd's `NOSPACE` alarm and makes the cluster read-only. Once an upgrade is verified, delete the older copies:

```bash
sudo ls -1d /etc/kubernetes/tmp/kubeadm-backup-etcd-*
sudo rm -rf /etc/kubernetes/tmp/kubeadm-backup-etcd-the-older-timestamp
```

A provider reset removes them.

### Your own backup

Images bundle `etcdctl` and `etcdutl` in `/usr/bin`, extracted at build time from the same signature-verified etcd image the bundle carries, so they match the etcd version that image's kubeadm deploys. Since etcd 3.6 `snapshot status` and `snapshot restore` live in `etcdutl`, not `etcdctl`.

On one healthy control plane, before booting the new image:

```bash
# On an unencrypted node write to tmpfs, copy it off the node, then delete it.
sudo install -d -m 0700 /run/etcd-backup
sudo /usr/bin/etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  --dial-timeout=10s --command-timeout=5m \
  snapshot save /run/etcd-backup/etcd-pre-upgrade.db
sudo /usr/bin/etcdutl snapshot status /run/etcd-backup/etcd-pre-upgrade.db -w table
```

Copy the file off the node over an authenticated, encrypted channel and remove the local copy.

## Rollback

kubeadm upgrades, and etcd upgrades in particular, are forward-only. There is no automatic rollback, and the provider never auto-resets a control plane when an upgrade fails. It fails loudly and leaves the node for you to inspect.

Rolling the OS back is a Kairos operation: you boot the other image slot. That restores `/usr`, the kubelet and kubeadm binaries, and the image-owned systemd units to what that older image shipped. It does not roll back the cluster. etcd has already been upgraded and the cluster's control-plane version has already moved, so an OS rollback on its own leaves an older kubeadm facing a newer cluster.

To actually recover, restore an etcd snapshot and boot the previous image. The outline for a kubeadm control plane follows the upstream [etcd recovery guide](https://etcd.io/docs/v3.7/op-guide/recovery/): use the `etcdutl` matching the etcd version that will run the restored data, stop the static control plane on every control plane by moving the manifests out of `/etc/kubernetes/manifests`, move `/var/lib/etcd/member` aside on each, restore the same snapshot on each member with its own `--name` and `--initial-advertise-peer-urls` and a new `--initial-cluster-token`, then put the manifests back. The provider's own documentation marks this outline as not yet validated on a VM.

A node wedged mid-upgrade can be reset and rejoined instead, which is usually simpler than a restore. See [Troubleshooting](../troubleshooting).

### What rollback does to the systemd units

Since v0.4.0 the units the provider owns live in `/usr/lib/systemd/system`, which is part of the image and is replaced wholesale by every A/B swap. Earlier releases installed them into `/etc/systemd/system`, which Kairos keeps on the persistent partition and refreshes from the image with `rsync --update`. A copy there was replaced only when the new build's mtime happened to be newer, survived a rollback, and could never be removed by an upgrade.

The first boot of v0.4.0 runs `provider-kubernetes-unit-migrate.service` before containerd, the import unit and the kubelet. It removes the superseded copies it recognizes and reloads systemd, so the same boot already runs the image's units. It deletes only a file that is byte-identical to something this project shipped at that exact path; anything you edited is kept, named in the journal, and the migration unit then fails deliberately so the state shows up in `systemctl --failed`.

Booting an older image re-creates that image's own `/etc` copies and `.wants` links, because immucore copies files that are missing, so the old OS runs exactly its own units. Coming back to v0.4.0 or later removes them again and reloads. Each round trip costs one cleanup and one reload. An edited copy keeps being kept, and the unit keeps failing, until you convert it into a drop-in under `/etc/systemd/system/<unit>.d/`, which the cleanup never touches.

`systemctl disable` is a no-op on these units, because they have no `[Install]` section and `systemctl is-enabled` reports `static`. Use `systemctl mask`, which now works.
