---
title: "Running your own extensions catalog"
sidebar_label: "Running your own extensions catalog"
sidebar_position: 4
description: Build system extensions, publish them to an OCI registry, list them in a releases.json catalog, and install them on nodes, in AuroraBoot and over netboot.
---

A system extension is a small, read-only disk image that `systemd-sysext` merges
over `/usr` at boot. An **extensions catalog** is one JSON file that lists your
extensions, their versions, and where each image lives. Once a node, or
AuroraBoot, knows the URL of your catalog, you refer to an extension by name
(`hello`, or `hello@1.0.0`) instead of by a full image reference.

Kairos already reads one catalog by default: the
[`hadron-layers`](https://github.com/kairos-io/hadron-layers) index at
`https://kairos-io.github.io/hadron-layers/releases.json`. This page shows how to
run your own catalog next to it, or instead of it.

Extensions are reversible. Remove an extension and the node returns to the plain
OS image on the next boot. For what an extension is on the node, and how to
enable and disable one, see
[Extending the system with systemd extensions](/docs/advanced/sys-extensions/).

:::info Version requirements
Catalogs are recent, and not every part is in a release yet. Kairos v4.3.0 is
the latest release. Rows marked "newer than v4.3.0" are on the Kairos `master`
branch and arrive with the next release.

| Feature | Available from |
| --- | --- |
| `kairos-agent sysext install NAME`, with one `--catalog` and an exact `--version` | Kairos v4.3.0 |
| `--extensions-catalog` and `--extension` in AuroraBoot `build-iso`, `build-uki` and `web` | AuroraBoot v0.28.0 |
| `extensions.catalogs` and `extensions.ignore_signatures` in the cloud config | A Kairos release newer than v4.3.0 |
| `install.extensions` in the cloud config | A Kairos release newer than v4.3.0 |
| A repeatable `--catalog`, and semver constraints such as `">= 2.1, < 3"` | A Kairos release newer than v4.3.0 |
| The installer picking up extensions baked into the ISO | A Kairos release newer than v4.3.0 |
| `kairos.extensions=` on the kernel command line | A Kairos release newer than v4.3.0 |
:::

## How the pieces fit

1. You **build** a `<name>.sysext.raw` image per architecture.
2. You **publish** each image to an OCI registry as a one-layer artifact.
3. You **index** the images in a `releases.json` file, by digest, and host the
   file on any HTTPS server.
4. Nodes and AuroraBoot **use** the catalog to turn a name and a version into
   one exact image.

The catalog only maps names to images. The images stay in your registry, and a
node pulls them from there.

## Build an extension

AuroraBoot turns the **last layer** of a container image into a system
extension. Put only the files you want in the extension in that last layer, and
put them under `/usr`.

```dockerfile
FROM busybox:1.37 AS src
RUN printf '#!/bin/sh\necho hello from a system extension\n' > /hello && chmod +x /hello

FROM scratch
COPY --from=src /hello /usr/bin/hello-ext
```

Build the image once per architecture, with one tag per architecture, then
convert each one. AuroraBoot reads the image for the architecture given with
`--arch`. Write each result to its own directory, since every run produces
`hello.sysext.raw`:

```bash
for arch in amd64 arm64; do
  docker buildx build --platform "linux/${arch}" --load -t "example/hello:1.0.0-${arch}" .
  mkdir -p "out/${arch}"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$PWD/out/${arch}":/output \
    quay.io/kairos/auroraboot:v0.28.0 \
    sysext --arch "${arch}" --output /output hello "example/hello:1.0.0-${arch}"
done
```

Building for another architecture than the host's needs QEMU emulation set up
for Docker.

:::warning Use a merged directory
Kairos merges `/usr/bin`, `/usr/sbin`, `/usr/lib`, `/usr/share`, `/usr/include`
and `/usr/src`. It does **not** merge `/usr/local` by default. AuroraBoot warns
when an extension carries files there, because those files never appear on the
node.
:::

**Signing.** To use an extension on a Trusted Boot node, sign it with the keys
of that deployment: add `--private-key` and `--certificate` to the `sysext`
command, as shown in
[Building system extensions](/docs/advanced/sys-extensions/#building-system-extensions).
Without keys, AuroraBoot creates the dm-verity data but no signature. See
[Signing and Trusted Boot](#signing-and-trusted-boot) below.

## Publish it to a registry

Push the raw image as a single layer with the media type
`application/vnd.kairos.sysext.raw`. [ORAS](https://oras.land/) does this in
one command:

```bash
oras push \
  --artifact-type application/vnd.kairos.sysext.raw \
  registry.example.com/extensions/hello:1.0.0-amd64 \
  hello.sysext.raw:application/vnd.kairos.sysext.raw
```

AuroraBoot checks the layer count and the media type when it pulls an
extension. An artifact with more than one layer, or with another media type,
fails the build.

The catalog refers to the **manifest digest**, never to a tag. A tag can move,
and a digest cannot, so a catalog entry always means the same bytes. Read the
digest back with:

```bash
oras resolve registry.example.com/extensions/hello:1.0.0-amd64
```

## Write the catalog

A catalog is a JSON document with a list of `layers`. Each layer is one
extension, with one entry in `tags` per version:

```json
{
  "repo": "example/my-extensions",
  "layers": [
    {
      "name": "hello",
      "title": "Hello",
      "description": "Prints a greeting",
      "latest": "1.0.0",
      "tags": [
        {
          "tag": "1.0.0",
          "sysext": {
            "amd64": { "oci": "registry.example.com/extensions/hello@sha256:<amd64 manifest digest>" },
            "arm64": { "oci": "registry.example.com/extensions/hello@sha256:<arm64 manifest digest>" }
          }
        }
      ]
    }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `layers[].name` | Yes | The name you install the extension by. |
| `layers[].latest` | Yes | The version a request without a version gets. It must match one of the `tags`. |
| `layers[].tags[].tag` | Yes | One published version. Use semver if you want version constraints to work. |
| `layers[].tags[].sysext.<arch>.oci` | Yes | The image for one architecture, named as Go names it (`amd64`, `arm64`, `riscv64`), pinned with `@sha256:` and the 64 hex digits of the manifest digest. A reference by tag is refused. |
| `repo` | No | Names the catalog in log messages and errors. |
| `layers[].title`, `layers[].description` | No | Shown in the AuroraBoot web UI. |

Leave out an architecture you do not publish. A node of that architecture then
gets a "not available" error instead of a wrong image.

**Hosting.** Any static HTTPS server works: GitHub Pages, an object store
bucket, or a web server on your network. The AuroraBoot web UI reads the
catalog from the browser, so the server must allow cross-origin (CORS)
requests if you want to use the catalog there.

**A working example.** The
[`hadron-layers`](https://github.com/kairos-io/hadron-layers) repository builds
its catalog in CI. Its
[`build.yml`](https://github.com/kairos-io/hadron-layers/blob/main/.github/workflows/build.yml)
workflow creates each extension with AuroraBoot and pushes it with ORAS, and its
[`pages.yml`](https://github.com/kairos-io/hadron-layers/blob/main/.github/workflows/pages.yml)
workflow regenerates `releases.json` and publishes it to GitHub Pages. The
[live file](https://kairos-io.github.io/hadron-layers/releases.json) is a
complete catalog to compare yours against.

## Use the catalog

The same catalog serves a node's cloud config, a running node, AuroraBoot, and
netboot.

### Catalog order

Catalogs are searched in order, and the first catalog that publishes a name
wins. Setting your own catalogs **replaces** the public default. To keep the
public extensions as well, list the public catalog after yours:

```yaml
#cloud-config
extensions:
  catalogs:
    - https://extensions.example.com/releases.json
    - https://kairos-io.github.io/hadron-layers/releases.json
```

On a node, a catalog that cannot be read is logged and skipped, as long as at
least one catalog can be read. AuroraBoot is stricter: a build fails if any
catalog it was given cannot be read.

### In the cloud config

List extensions under `install.extensions` to install them at install time. An
entry is a name, a `name@version`, or a direct reference (`oci://`, `https://`,
`file://`, or an absolute path). Use the mapping form for a version constraint
that contains a space:

```yaml
#cloud-config
extensions:
  catalogs:
    - https://extensions.example.com/releases.json
install:
  extensions:
    - hello
    - hello@1.0.0
    - name: fwupd
      version: ">= 2.1, < 3"
```

A version is either an exact published tag or a
[semver constraint](https://github.com/Masterminds/semver#checking-version-constraints).
With no version, the node gets the `latest` version of the catalog entry.

### On a running node

```bash
kairos-agent sysext install --catalog https://extensions.example.com/releases.json hello
kairos-agent sysext enable --active --now hello
```

Without `--catalog`, the agent uses `extensions.catalogs` from the cloud config,
or the public default when that is not set. Add `--version` to select a version.
On Kairos v4.3.0, `--catalog` takes one URL and `--version` takes an exact
version only.

### In AuroraBoot

Pass the catalog and the extensions to `build-iso`. AuroraBoot resolves each
name for the architecture of the build, pulls the image, and places it at the
root of the ISO:

```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD"/build:/output \
  quay.io/kairos/auroraboot:v0.28.0 \
  build-iso --output /output \
  --extensions-catalog https://extensions.example.com/releases.json \
  --extension hello \
  --extension hello-tools@1.2.0 \
  docker:<your Kairos image>
```

Both flags can be repeated. `--extensions-catalog` also takes a local file
path, and `--extension file://<path>` bakes in a `.raw` image you already have,
with no catalog. `build-uki` takes the same two flags.

At install time, the installer copies every `*.sysext.raw` file it finds on the
ISO onto the node. This needs a Kairos release newer than v4.3.0.

The web UI offers the catalogs given at launch with
`auroraboot web --extensions-catalog <url>`, plus any catalogs saved in
**Settings**. The public catalog is always offered for Hadron images. Other
flavors only get the catalogs you configure.

### Over netboot

A netbooted node has no live media to copy from. Declare the extensions on the
kernel command line instead, with a comma-separated list. With AuroraBoot, put it
in `netboot.cmdline`, as described in [Netboot](/docs/installation/netboot/):

```text
kairos.extensions=hello,hello-tools@1.2.0
```

Entries take the same forms as in `install.extensions`. When the cloud config
also lists `install.extensions`, the cloud config wins and the node ignores the
command line.

## Signing and Trusted Boot

The public `hadron-layers` extensions are **unsigned**, because signing needs
keys that belong to your deployment. By default, a node downloads and enables
an unsigned extension, but systemd refuses to merge it. You have two options:

- Set `extensions.ignore_signatures: true` in the cloud config. The node then
  merges extensions that carry no signature systemd can verify. Do not use this
  under Trusted Boot: refusing unverified code is the point of Trusted Boot.
- Re-sign the extension with your own keys, and publish the signed image in
  your own catalog. Under Trusted Boot, this is the only option. See the
  signing note at the top of
  [Extending the system with systemd extensions](/docs/advanced/sys-extensions/).

```yaml
#cloud-config
extensions:
  ignore_signatures: true
```

## Limits

- **Only `/usr` is merged.** A system extension cannot ship files in `/etc`,
  and a catalog lists system extensions only. Put
  defaults under `/usr/share/factory`, and add a `tmpfiles.d` rule that copies
  them into `/etc` on first boot. The `tailscale` layer in `hadron-layers` does
  this for `/etc/default/tailscaled`.
- **Kernel modules must match the kernel.** An extension that ships a kernel
  module works only on a node that runs the exact kernel it was built against.
  Pin the version of such an extension to your OS release.
- **The public catalog targets Hadron.** Its extensions are built with the
  Hadron toolchain, for Hadron images. For another flavor, build and publish
  your own.
- **Air-gapped sites.** A node needs to reach both the catalog and the
  registry. With no network, mirror the registry and host a copy of the catalog
  that points at the mirror, or bake the extensions into the installation media
  with AuroraBoot.
