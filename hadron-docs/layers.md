---
title: "Adding Hadron layers"
sidebar_label: "Adding Hadron layers"
sidebar_position: 2
---

# Extending your Hadron image with layers

The [`kairos-io/hadron-layers`](https://github.com/kairos-io/hadron-layers) project publishes a
growing collection of **pre-built OCI layers** for Hadron. Each layer compiles a software
component from source with the [Hadron toolchain](toolchain.md) and ships a minimal `FROM scratch`
image containing only the runtime binaries and their shared-library dependencies — no headers,
static libraries or docs.

They are the "add-a-package" companion to the [firmware images](linux-firmware.md): drop them on
top of your Hadron base with a `COPY --from=...`, and you get the tool available in your image
without needing a build environment yourself.

:::info Browse available layers
The full list of layers, tags and pinned digests is available on the project's
[GitHub Pages site](https://kairos-io.github.io/hadron-layers/) (raw data at
[`releases.json`](https://kairos-io.github.io/hadron-layers/releases.json)).
:::

## What gets published

Every layer is published to `ghcr.io/kairos-io/hadron-layers/<name>` as a multi-arch
(`linux/amd64`, `linux/arm64`) image, `FROM scratch`, containing runtime files under standard
paths (`/usr/bin`, `/usr/lib`, ...). Current layers include:

| Layer | Image | Description |
|-------|-------|-------------|
| `git` | `ghcr.io/kairos-io/hadron-layers/git` | Git version control system |
| `gpg` | `ghcr.io/kairos-io/hadron-layers/gpg` | GnuPG and its runtime libraries |
| `fwupd` | `ghcr.io/kairos-io/hadron-layers/fwupd` | Firmware update daemon |
| `drbd` | `ghcr.io/kairos-io/hadron-layers/drbd` | Out-of-tree DRBD 9 kernel module and `drbd-utils` |

Check the releases page above for the up-to-date list.

## Bundle a layer into your Hadron image

Same pattern as the [firmware images](linux-firmware.md#option-1-bundle-firmware-into-your-hadron-image-oci-images):
build a derived image `FROM` your Hadron base and `COPY` the layer's whole root into your image
root.

```dockerfile
# Start from the Hadron image you already use.
FROM ghcr.io/kairos-io/hadron:main

# Add as many layers as you need.
COPY --from=ghcr.io/kairos-io/hadron-layers/git:latest / /
COPY --from=ghcr.io/kairos-io/hadron-layers/gpg:latest / /
```

Build it:

```bash
docker build -t my-registry.example.com/my-hadron:latest .
```

:::warning This image is not bootable yet
The image produced above is **not** a bootable/upgradeable Kairos image yet — it is just a Hadron
rootfs with extra software. To turn it into a proper Kairos image you must "kairosify" it with
[`kairos-init`](https://github.com/kairos-io/kairos-init), then either push the resulting image
to upgrade to, or turn it into installable media (ISO, raw disk, etc.) with
[AuroraBoot](https://github.com/kairos-io/AuroraBoot). See the
[Adding Linux firmware](linux-firmware.md#option-1-bundle-firmware-into-your-hadron-image-oci-images)
page and the [Kairos Factory documentation](/docs/reference/kairos-factory/) for the full flow.
:::

Tips:

- Pin to a specific tag rather than `:latest` for reproducible builds. Every tag also has an
  immutable digest listed on the [releases page](https://kairos-io.github.io/hadron-layers/).
- Only add the layers you actually need — each `COPY --from` grows the final image.

:::warning Layers are not sysext-ready
The `hadron-layers` images are meant to be layered into a Hadron image with `COPY --from`, not
converted directly into a [system extension](expand-with-sysext.md). Sysexts only ship files
under `/usr` (and confexts under `/etc`), and layers may place files outside those paths — a
direct sysext conversion would silently drop them. If you need a sysext, build a dedicated
image whose last layer contains only `/usr` content and feed that to AuroraBoot; see
[Extending Hadron with extensions](expand-with-sysext.md) for the flow.
:::

## Kernel-module layers

Layers that ship an **out-of-tree kernel module** (currently `drbd`) are tied to the exact
kernel version of the toolchain image they were built against. The consumer image must run a
Hadron release whose kernel matches the layer's toolchain — pin the layer tag accordingly.

The module ships under `/usr/lib/modules/<kernelrelease>/updates/`. When you kairosify the image
with [`kairos-init`](https://github.com/kairos-io/kairos-init), `depmod` runs as part of the
build, so `modules.*` indexes pick it up automatically. Anything else (userspace binaries,
libraries, config) behaves like a normal layer.

## Building your own layer

The [`hadron-layers` repository](https://github.com/kairos-io/hadron-layers) is designed to be
extended: adding a new layer means dropping a `Dockerfile` in a new subdirectory that follows the
project's build → merge → `FROM scratch AS default` → `test` pattern, wiring it into
`docker-bake.hcl`, and (optionally) adding an `updatecli` config so upstream releases are picked
up automatically.

See the [`README`](https://github.com/kairos-io/hadron-layers/blob/main/README.md) in the
repository for the full contribution flow, and the [Hadron toolchain](toolchain.md) page for what
the build stage has available.
