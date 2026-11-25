---
title: "Peer-to-peer image distribution (experimental)"
sidebar_label: "P2P upgrades (experimental)"
sidebar_position: 9
date: 2026-11-25
description: Experimental, opt-in image sharing between the nodes of an isolated network
---

:::danger Experimental
This feature is **alpha**, **opt-in** and may change or disappear without notice. It is meant for
isolated, trusted networks only. Do not enable it on networks you do not control.
:::

In a closed network (no registry, no internet) every node can pull its image from a single place,
which then becomes the bottleneck. With the experimental `p2p://` image source, nodes offer their
`active`, `passive` and `recovery` images to each other, and a node that installs, upgrades or resets
downloads from several peers at once. A node that is still downloading already shares the parts it has,
so the load spreads over the nodes, and a peer that goes away mid-download is replaced by another one.

It only uses plain HTTP. There is no tracker, no DHT and no extra service.

:::note Not the p2p network
This has nothing to do with the `p2p:` block of the Kairos p2p network. The settings live in
`p2p-source:`.
:::

## The source

Only the three system images can be shared, by name. The source carries a **pin** that says which image you
want (see [the security model](#security-model) for the three forms, `?pin=` is the one to use):

```
p2p://10.0.0.2,10.0.0.3:4000/active?pin=<pin>   # explicit peers (a port per peer, 42069 unless given)
p2p://recovery?pin=<pin>                    # no host: find peers with mDNS
```

It works wherever an image source does: `install.system.source`, `upgrade.system.source`,
`upgrade.recovery-system.source`, `reset.system.source` and the `uri` of those blocks, and on the command
line:

```bash
sudo kairos agent upgrade --experimental-p2p --source 'p2p://10.0.0.2,10.0.0.3/active?pin=<pin>'
```

Nothing runs until you opt in, with `p2p-source.experimental: true` in the cloud config, the
`--experimental-p2p` flag of `upgrade`, or `KAIROS_P2P_EXPERIMENTAL=1`. The recovery image can only be
used for the recovery system, and the active and passive images only for the system. Trusted boot (UKI)
does not support it.

### Getting the pin: the workflow

There are no keys to manage. The node that has the new image tells you the source to use:

1. Update (or install) one node the usual way, for example from your registry.
2. Run `kairos agent p2p seed` on it (or enable the service, see below). It prints one source per image it
   serves, pin included:
   ```
   p2p://10.0.0.2/active?pin=7c1e5f6a0f3d3c3a4f1b9d0b6a2e8c47d3f5a9b1c6e2d8f04a7b3c9e1d5f2a68
   ```
   The pin is the hash of the image's manifest (its size, chunk size and the hash of every chunk and of the
   whole image). You do not have to understand it, copy the line.
   `kairos agent p2p pin` prints the same for one image, without starting anything.
3. Put that source in the other nodes' command or cloud config, for a fleet in the cloud config:
   ```yaml
   #cloud-config
   p2p-source:
     experimental: true
   upgrade:
     system:
       source: p2p://10.0.0.2/active?pin=7c1e5f...
   ```
   and the nodes pull the image from the first node and from each other.

The seeder also serves the pin at `/active/pin` for convenience. Nodes never use it: a pin that comes from the
peer it is supposed to check proves nothing.

## How it works

- **Seeder**: serves the images that exist, read only, over one HTTP port (42069 by default): a manifest
  with the size, the sha256 of every 4 MiB chunk and the sha256 of the whole image, and byte ranges of the
  image. The seeder computes the manifest itself from one pass over the file, so it always agrees with the image
  (an `<image>.sha256` file next to the image is only compared with the result and logged). The image file is
  opened once, never through a symlink, and served from that handle.
  Nothing else is served, and never the persistent partition.
- **Downloader**: asks every peer for its manifest, keeps those that match the pin, and takes the chunks from all the peers that serve the same manifest, in
  parallel. One address counts as one peer, however many ports or manifests it announces. The manifest that more
  different addresses serve is tried first, then the others in the order the peers were listed. Every chunk is verified against that
  manifest, a bad or failed chunk is fetched again from another peer, a peer that serves bad chunks is dropped
  and a slow one is demoted: a peer that delivers less than a quarter of what the best peer does keeps at most one
  chunk, and a faster peer takes over the chunks only slow peers hold. A download dropped only for looking too slow
  is retried at the end and continues from the chunks it already has. At the end the sha256 of the whole image must match the manifest (and the `sha256` pin, if the source has one). Redirects are never
  followed.
- **Limits**: images larger than `max-image-size` (16 GiB by default) are refused, and so is a download that does
  not fit in the free space (before anything is written).
- **Resume**: the download goes into the image file with a small state file next to it (both only readable by
  root), so a rerun continues where the previous one stopped. Chunks found on disk are verified again before they
  are trusted. A failed download that cannot be resumed is removed.
- **Sharing**: a node that installed or upgraded offers its images to the others through the seeding service
  (`p2p-source.enabled: true`), which picks up the new image on its own. `kairos agent p2p fetch --linger` offers
  the image it just fetched for a while. A node that is still downloading serves nothing: chunks that were only
  checked against a manifest a peer supplied are never handed on.
- **Allowlist**: peers must be in the allowed networks, for incoming and outgoing connections. When you do not
  set one, the allowlist is the addresses of the peers you listed (which must be on a private network), or the
  local subnet when peers are discovered.

## Security model

An image installed from a p2p source runs as root on the node: the upgrade runs the new image's own agent
before the reboot, and the image becomes the system. **Whoever controls the bytes of the image controls the
node.**

**The pin is the one thing that protects you.** A source has one of three forms, and which one to use is
easy: use the one `kairos agent p2p seed` prints.

| form | what it pins | use it |
|---|---|---|
| `?pin=<hash>` | the manifest of the image: its size, chunk size and the hash of every chunk and of the whole image | **always, this is what `seed` and `pin` print** |
| `?sha256=<hash>` | only the sha256 of the final image | when you only know the image hash; weaker, see below |
| `?sha256=<hash>&size=<bytes>` | the image hash and its size | same, a little better |

If both `?pin=` and `?sha256=` are given, both must hold. A source that only has `?sha256=` works, and the agent logs a note
asking you to use the `?pin=` source that `seed` prints.

With `?pin=` a node checks every manifest against the pin before it downloads a single chunk, so a rogue
peer cannot make it waste anything beyond one small manifest, however many rogue peers there are and whatever
they claim. A node installs an image only if it hashes to what the pin says, so a rogue peer can serve garbage
but it cannot make the node install another image.

`?sha256=` authenticates the image only once it has been completely read. A rogue peer that announces the
true hash and size can make the node download its image before the check fails. A manifest that fails
for any reason (it claims a size that does not fit, nothing arrives for a minute, the transfer is slower than
64 KiB/s, or would take far longer than the size needs, the image does not hash to the pin) is dropped and the
next one is tried, the agent stops after wasting four times the image size, and a whole download is bounded
in time (`p2p-source.timeout`, 6 hours by default). So a few rogue peers cost time and bandwidth, but enough
rogue addresses listed before the honest one can still keep a `?sha256=` node from getting the image. That is
why `?pin=` is the recommended form. Treat the pin like an image digest: whoever can change the source in your
cloud config decides what your nodes run.

A source **without** any pin is refused, before any partition is touched, because then any host on the network
could serve an image that runs as root. `p2p-source.insecure: true` (or `--p2p-insecure`) switches that off, with
a loud warning in the log. Do not use it anywhere you would not give every host of the network root on the node.

What is **not** protected:

- The allowlist is a network filter, not authentication. Any host in the allowed networks can download the
  images (they contain your OS, possibly secrets baked into it: never bake secrets into an image you share) and
  can talk to a seeder. A seeder limits each address (connections, streams, request rate), counts everything it
  sends against the upload limit (manifests, which can be a megabyte, have their own per address allowance too), and when it is full an address that holds little takes the place of the one that
  holds the most, so a few hosts cannot keep every slot. It cannot tell a friend from an enemy.
- mDNS discovery is unauthenticated and only works inside one L2 segment. A rogue host can announce itself and
  have nodes talk to it: the pin is what keeps it from serving anything the nodes accept. Announcements only give
  a port, the address is where the answer came from, at most 16 peers are kept.
- Nothing is encrypted, and there is no peer authentication. Do not use it on networks you do not trust.
- Trusted boot (UKI) systems are not supported.

## Seeding

Seeding is **off by default**. Enable it in the cloud config. The agent then installs and starts a
systemd unit running `kairos agent p2p seed`:

```yaml
#cloud-config
p2p-source:
  enabled: true          # run the seeding service
  experimental: true     # acknowledge that it is experimental, required
  # everything below is optional
  bind: 10.0.0.2         # default: the address of the only network interface; required when there are several
  port: 42069
  allow: [10.0.0.0/24]   # default: the local subnet
  upload-limit: 20480    # KiB/s, 0 = the default, 64 MiB/s
  max-peers: 32          # image streams served at the same time
  max-image-size: 16384  # MiB
  timeout: 360           # minutes, bounds a whole download
  insecure: false        # DANGEROUS: allow sources without a pin, see the security model
  disable-announce: false  # announce with mDNS
```

The unit is sandboxed (no new privileges, read-only file system except its manifest cache, no capabilities,
restricted system calls and address families, memory and descriptor limits). The seeder serves at most 128
connections, 8 per address, 4 image streams per address, 32 streams in total, and cuts a client that stops
reading.

The seeder checks the images every few seconds. When an image changes (for example during an upgrade) it
is dropped at once and served again once it has been stable for a poll interval, so half written images are
never served. Computed manifests are cached by size, modification time and inode, so a restart does not
rehash multi-GB images.

The same options exist as flags of `kairos agent p2p seed` (`--bind`, `--port`, `--allow-cidr`,
`--upload-limit`, `--max-peers`, `--no-announce`) and flags win over the cloud config.

## Limits

- IPv4 only.
- The nodes of a swarm only share chunks if their images are byte identical.
- Several network interfaces: set `p2p-source.bind`, the agent does not guess.
- There is no download side rate limit.
