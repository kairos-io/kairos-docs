---
title: "Choosing how to extend Kairos"
sidebar_label: "Choosing how to extend"
sidebar_position: 0
description: Compare Dockerfiles, system extensions, bundles and providers, and learn which one to use for a given change.
---

Kairos gives you four ways to put your own software and configuration on a node:
a **Dockerfile**, a **system extension**, a **bundle**, or a **provider**. They
are not alternatives to each other in every case. Each one acts at a different
moment in the life of a node, and that moment is what decides which one you
need.

This page compares them so you can pick one. Each mechanism has its own page with
the full instructions, linked from the sections below.

## The short answer

- You want a package or a binary to be part of the OS itself, and you are happy
  to rebuild and republish the image: use a **Dockerfile**.
- You want to add a binary or a directory tree to an existing image without
  rebuilding it, and your image runs systemd: use a **system extension**.
- You want to run your own logic once, at install time or on the first boot,
  with access to the cloud config: use a **bundle**.
- You want to react to node lifecycle events every time they happen, for
  example to bootstrap a component: use a **provider**.

## Comparison

|  | Dockerfile | System extension | Bundle | Provider |
| --- | --- | --- | --- | --- |
| When the change happens | Image build | Every boot | Once, at install time or on the first boot | On every lifecycle event it subscribes to |
| Needs the base image rebuilt and republished | Yes | No | No | Yes, the binary ships in an image |
| Survives an upgrade | Yes, it is the image | Yes, it is kept outside the OS image | Only what it wrote to a persistent path | Yes, it is the image |
| Works under Trusted Boot | Yes | Yes, if signed | Yes | Yes |
| Needs systemd | No | **Yes** | No | No |
| Can run your own code | At build time only | No | Yes | Yes |
| Can read the cloud config | No | No | Yes | Yes |

## Dockerfile

A Dockerfile change becomes part of the OS image. This is the most direct
option, and the only one where the result is indistinguishable from the rest of
the system: there is no extra layer to mount, nothing to sign separately, and
nothing that can fail to load at boot.

The cost is the build and publish cycle. Every change, however small, means a
new image tag and an upgrade of the nodes that use it.

Use it when the change belongs to the OS: an extra package, a kernel module, a
system service, or a different base distribution. See
[Customizing the system image](/docs/advanced/customizing/) and the
[Extending the system via Dockerfiles](/quickstart/extending-the-system-dockerfile/)
quickstart.

## System extensions

A system extension (`sysext`) is a signed disk image that systemd merges into
`/usr` at boot. A configuration extension (`confext`) is the same idea for
`/etc`. The extension is stored outside the OS image, so you can add, enable and
remove one without rebuilding or upgrading the node.

Extensions are the right answer to "I need this binary on the node, and the
image does not have it". They are not a way to run code: an extension only
contributes files.

Use them when you want to add software to an image you do not control, when you
want different nodes to run the same base image with different tools, or when
you are on Trusted Boot and cannot modify `/usr`. See
[Extending the system with systemd extensions](/docs/advanced/sys-extensions/).

:::info Declaring extensions in the cloud config
Extensions can also be listed under `install.extensions` in the cloud config, so
that an install places them on the node without a manual
`kairos-agent sysext install` step. The mechanism, and every limitation on this
page, is the same. To publish your own extensions and install them by name, see
[Running your own extensions catalog](/docs/advanced/extensions-catalog/).
:::

## Bundles

A bundle is a container image that holds files, and optionally a script that
Kairos runs. Unlike the other three mechanisms, a bundle can read the Kairos
cloud config, so a bundle can be configured by the same YAML that configures the
node. This is what makes bundles the usual way to package an add-on that needs
settings from the user.

A bundle runs **once**. Changing its configuration block after the node is
installed has no effect.

There are two moments to choose between, and they behave differently:

- `install.bundles` runs at install time, from the live media. At that point the
  installed system is not the running root: only the persistent partition,
  mounted at `/usr/local`, and the extensions directory are written through to
  the node. This is why install time bundles are mostly used to place system
  extensions rather than to install software directly.
- `bundles` runs on the first boot of the installed node, before Kubernetes
  starts on a standard image. Use this one to make changes to the installed
  system.

In both cases, anything the bundle writes to a path that is not persistent is
lost on the next boot, because Kairos discards changes to the OS image. See
[Bundles](/docs/advanced/bundles/).

## Providers

A provider is a plugin binary, named with the `agent-provider` prefix, that
subscribes to Kairos lifecycle events and runs its own logic when they fire.
Providers are the only mechanism here that keeps reacting for the life of the
node rather than acting once.

The provider binary ships in the image, so adding a provider means building an
image, the same as any other Dockerfile change.

Use a provider when the behaviour you need is a reaction to something Kairos
does, such as bootstrapping a component when a node joins. Kubernetes bootstrap
is the best known case, but it is not the only one. See
[Providers](/docs/architecture/providers/).

## Limitations on systemd-only systems

**System extensions are the only mechanism on this page that requires systemd.**
Dockerfiles, bundles and providers all work the same way whichever init system
the image uses.

Kairos images do not all run systemd. As described in
[Kairos meta](/docs/architecture/meta/), an image booted with GRUB may use either
systemd or OpenRC, while Trusted Boot requires systemd 256 or newer. So the
question only arises on GRUB images.

On an image that uses OpenRC there is no `systemd-sysext` and no
`systemd-confext`, so extensions cannot be merged at all. `kairos-agent sysext`
can still copy an image onto the node, but nothing will ever load it. On such an
image, use a Dockerfile for files and a bundle for logic.

Even on a systemd image there are version boundaries and other constraints worth
knowing before you choose extensions:

- **systemd 255 is the minimum.** The base image of the OS needs at least that
  version for extensions to work.
- **Below systemd 256, a merged directory becomes read-only.** If an extension
  contributes `/usr/local/bin`, that directory is read-only for everything else
  once the extension is merged. Several extensions still merge together
  correctly, but the result cannot be written to.
- **Extension binaries are not available during the initramfs stage.** They
  appear only after it. Anything that has to run earlier cannot come from an
  extension.
- **Under Trusted Boot, extensions must be signed** with the same PK, KEK or DB
  key that signed the EFI files, otherwise they are ignored and a warning is
  written to `/run/immucore/`. On GRUB images the signature is not enforced yet.
- **Merge order follows the name, parsed as a version**, not the order you
  enabled them in. Name your extensions in a versioned format.

The [Known issues](/docs/advanced/sys-extensions/#known-issues) section of the
system extensions page carries the full list.

## Using more than one

These mechanisms compose, and most real images use several. A common shape is a
Dockerfile for everything the whole fleet needs, a system extension for the
tools that only some nodes need, and a bundle for the add-on that has to read
the user's configuration. Providers sit alongside all three, because they answer
a different question: not what is on the node, but what the node does when
something happens to it.
