---
title: "Image source: ssh"
sidebar_label: "ssh"
sidebar_position: 2
date: 2026-11-25
description: Install, upgrade or reset a node from the system image of another Kairos node over SSH, without a registry or file copies
---

In an air-gapped network there is often no registry and no way to hand a file to every machine. Upgrade one node
any way you like, then let the others take the image from it. The source is an `ssh://` URI, the other node is
the registry. It works wherever an image source does: upgrade, install and reset.

```bash
sudo kairos-agent upgrade --source ssh://root@10.0.0.5
```

The node that upgrades runs the `ssh` client of the system, so your SSH configuration, agent, `known_hosts` and options like
`ProxyJump` apply. It checks the host key of the other node, finds the image the other node booted from, copies it and
verifies its sha256 before it deploys it. A connection that drops is resumed where it stopped.

Nothing has to be installed or configured on the other node. It only has to run an SSH server, and the account you
connect with has to be able to read the image.

## The source

```
ssh://[user@]host[:port][/path]
```

Without a user, the `user` of the `ssh-source` block is used, and without that the default of `ssh`, which is the user running the agent unless your `ssh` configuration says otherwise. A port other than 22 goes in the
URI, `ssh://root@10.0.0.5:2222`, or in your `ssh` configuration.

| Path | Image copied |
|---|---|
| none | The image the other node booted from, found on its kernel command line. A node that fell back to passive gives its passive image. |
| `/active` | `/run/initramfs/cos-state/cOS/active.img` of the other node. |
| `/passive` | `/run/initramfs/cos-state/cOS/passive.img` of the other node. |
| `/some/absolute/file.img` | That file. |

With no path the agent only works if the other node booted from its active or passive image. If it booted its recovery
system, or the command line does not say, name the image.

The URI cannot carry a password. Authentication is by key, `ssh` never asks for a password.

## Requirements

On the other node:

- An SSH server that accepts the key, for an account that can read the image files. This is usually `root` with a key in
  its `authorized_keys`. Images an install or a reset takes from a registry are mode 0644, but images written by an upgrade, or copied
  from another node, are 0600, so only root can read those. To use another account on a node that was upgraded, make the files readable for it yourself, for
  example with a `chmod` in an `after-upgrade` stage of that node.
- `cat`, `tail`, `stat` and `sha256sum`, which coreutils and busybox both have. Nothing else, no Kairos component.

On the node that upgrades: the `ssh` client. To pin host keys by fingerprint it also needs `ssh-keyscan` and `ssh-keygen`.

## Set up the nodes that upgrade

Each node needs a private key, which must not be readable by other users, and a way to verify the other node.
Without any setting `ssh` uses its own: your `~/.ssh/config`, agent and default `known_hosts`. To be explicit, set the
`ssh-source` block. It can sit at the root of the cloud config, for install, upgrade and reset, and inside `install`, `upgrade`
or `reset` to override the root block for that action. A key set in the action wins, keys it leaves out come from the root.

```yaml
#cloud-config
write_files:
  - path: /oem/ssh/fleet_upgrade
    permissions: "0600"
    content: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...
      -----END OPENSSH PRIVATE KEY-----

ssh-source:
  user: upgrader
  identity-file: /oem/ssh/fleet_upgrade
  host-key-fingerprints:
    - SHA256:Zq3m...

upgrade:
  system:
    source: ssh://10.0.0.5
```

| Key | |
|---|---|
| `user` | Account to connect with when the source names none. Without it, the default of `ssh`: the user running the agent, unless your `ssh` configuration sets a `User`. |
| `identity-file` | Path to the private key of this node. Used alone, `ssh` does not try other keys. |
| `known-hosts-file` | A `known_hosts` file with the host key of the other node. |
| `host-key-fingerprints` | List of accepted host key fingerprints, `SHA256:...`. Print one on the other node with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. |

The host key is always checked and an unknown host is refused. With `known-hosts-file` or `host-key-fingerprints` set, only
those are trusted. Without them the `known_hosts` of the user running the agent apply.

Then upgrade as usual. `kairos-agent upgrade --dry-run` connects to the other node, checks its host key and reads the size
of its image to size the transition image, then prints a summary with a `Serving node` line and changes nothing: no image is
hashed or copied. The `Image size` in the summary is the size of the image the upgrade would create, which is at least the
default image size, not the size of the remote image.

## Install and reset

`kairos-agent upgrade`, `manual-install`, `interactive-install` and the pairing `install` take `--source`. `kairos-agent reset`
has no `--source` flag, and an install started on its own from a cloud config has none either. For those, set the source in the cloud
config, `install.system.source` and `reset.system.source`, with the same `ssh-source` block.

```yaml
#cloud-config
install:
  system:
    source: ssh://10.0.0.5
ssh-source:
  user: upgrader
  identity-file: /oem/ssh/fleet_upgrade
  known-hosts-file: /oem/ssh/known_hosts
```

A reset runs from the recovery system with the network up. An unreachable node or a failed copy fails the action, as it
does for any source.

For an install, the agent reads the source and the `ssh-source` block, and connects to measure the image, when it builds
the install, before the stages of the install run. The key files and the network have to exist before the install starts. If
they do not, the install fails or hangs at the ssh step, so have the key files on the install medium and the network up first.

## Integrity

The other node is asked for the sha256 of the image, and the copy is refused if what arrived does not hash to it.
The other node computes it with `sha256sum`, which reads the whole image before the copy starts. This detects a broken transfer or a changed file. It does not
tell you that the other node runs an image you want.

With `image-checksum.create` on, the node also writes the `.sha256` file for the image it deployed, hashed again once the image is final, and `image-checksum.verify` checks it at boot, like for any other source.

## Limits

- Only the active system can be upgraded this way, not the recovery system.
- Trusted Boot (UKI) systems are not supported.
- The image is copied as it is, so both nodes have to be of the same architecture.
- Every copy reads the whole image on the other node. Upgrade a few nodes at a time.
- A copy interrupted for good starts again from the beginning on the next run.

## Security

Whatever account you give the key to can read whatever that account can read. Nothing on the other node limits it
to the system image. Prefer an account that cannot read more than it has to, and keep the key to the fleet only.

The nodes that upgrade trust the other node, they run whatever it gives them. The host key check and the digest tell
them they reached the right machine and that the bytes arrived intact, not that the image is a good one. The image is
what the other node booted from, with everything that was built into it, so do not build secrets into images.
