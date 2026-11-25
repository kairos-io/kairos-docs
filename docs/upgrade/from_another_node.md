---
title: "Upgrading from another node over SSH"
sidebar_label: "From another node (SSH)"
sidebar_position: 6
date: 2026-11-25
description: Upgrade or install a node from the system image of another Kairos node, without a registry or file copies
---

In an air-gapped network there is often no registry and no way to hand a file to every machine. Upgrade one node
any way you like, then let the others take the image from it. The source is an `ssh://` URI, the other node is
the registry.

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

Without a user, the `user` of the `ssh-source` block is used, and without that the user running the agent.

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

- An SSH server that accepts the key, for an account that can read the image files. On Kairos the state partition files are
  readable by root, so this is usually `root` with a key in its `authorized_keys`.
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
| `user` | Account to connect with when the source names none. Defaults to the user running the agent. |
| `identity-file` | Path to the private key of this node. Used alone, `ssh` does not try other keys. |
| `known-hosts-file` | A `known_hosts` file with the host key of the other node. |
| `host-key-fingerprints` | List of accepted host key fingerprints, `SHA256:...`. Print one on the other node with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. |

The host key is always checked and an unknown host is refused. With `known-hosts-file` or `host-key-fingerprints` set, only
those are trusted. Without them the `known_hosts` of the user running the agent apply.

Then upgrade as usual. `kairos-agent upgrade --dry-run` connects to the other node and reports the size of the image it
would copy, without transferring it.

The same works for an installation, with `install.system.source`, and for a reset, with `reset.system.source`, run from
the recovery system with the network up. An unreachable node or a failed copy fails the action, as it does for any source.

## Integrity

The other node is asked for the sha256 of the image, and the copy is refused if what arrived does not hash to it.
The other node computes it with `sha256sum`, which reads the whole image before the copy starts. This detects a broken transfer or a changed file. It does not
tell you that the other node runs an image you want.

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
