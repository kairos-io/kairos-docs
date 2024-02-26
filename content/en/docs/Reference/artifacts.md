---
title: "Artifact Naming Convention"
linkTitle: "Artifact Naming Convention"
weight: 1
date: 2023-07-19
description: Detailed information about how we name our artifacts including repositories.
---

There are many different artifacts that Kairos produces. In this page we try to summarize them all and have a clear naming convention for them.

{{% alert title="Info" %}}
Architecture names are based on the [Go architecture names](https://go.dev/doc/install/source#environment), so `amd64` is used instead of `x86_64`, `386` instead of `i386` and `arm64` instead of `aarch64`.
{{% /alert %}}

## Images

OS images are stored in GitHub Releases, so the name of the artifact includes all the information about the image. The only exception is when the image is too big to be stored in GitHub Releases, in that case the image is stored in Quay.io.

The format of the name is the following:

```
kairos-<flavor>-<flavor_release>-<variant>-<arch>-<device>-<version>.<extension>
```

Where:

- `<flavor>`: Underlying Linux distribution e.g. `ubuntu`, `debian`, `fedora`, `alpine`, etc
- `<flavor_release>`: The version of the above distribution e.g. `23.04` for Ubuntu
- `<variant>`: `core` or `standard`
- `<arch>`: `amd64` or `arm64`
- `<device>`: either the specific device name, e.g. `rpi4` or `generic` for generic images
- `<version>`: the version of Kairos e.g. `v1.0.0` for Core, and can also include the K3S version e.g. `v1.0.0-k3s1` for Standard
- `<extension>`: `iso`, `squashfs`, `ipxe`

### Examples

- `kairos-ubuntu-23.04-core-amd64-generic-{{< kairosVersion >}}`
- `kairos-ubuntu-23.04-standard-arm64-rpi4-{{< kairosVersion >}}-k3sv1.28.2+k3s1.iso`

## Kernel and RAM Disk Images

Kernel and RAM Disk images are stored in GitHub Releases and follow a similar convention to images, but they have no extension:

```
kairos-<flavor>-<flavor_release>-<variant>-<arch>-<device>-<version>-<type>
```

Where:

- `<type>`: `kernel` or `initrd`

### Examples

- `kairos-ubuntu-23.04-core-amd64-generic-{{< kairosVersion >}}-kernel`
- `kairos-ubuntu-23.04-standard-arm64-rpi4-{{< kairosVersion >}}-k3sv1.28.2+k3s1-initrd`

## iPXE Images

For iPXE we deliver three types of artifacts. The first one is the iPXE script, with the ipxe extension, and the other two are iPXE bootable images, with the iso and img extensions.

### Examples

- `kairos-ubuntu-23.04-core-amd64-generic-{{< kairosVersion >}}.ipxe`
- `kairos-ubuntu-23.04-core-amd64-generic-{{< kairosVersion >}}-ipxe.iso`
- `kairos-ubuntu-23.04-core-amd64-generic-{{< kairosVersion >}}-ipxe-usb.img`

## Reports

Reports are also stored in GitHub Releases and follow a similar convention to images, but they include the name of the report:

```
kairos-<flavor>-<flavor_release>-<variant>-<arch>-<device>-<version>-<report>.<extension>
```

Where:

- `<report>`: `trivy`, `sbom`, `grype`, etc

### Examples

- `kairos-alpine-3.18-core-arm64-generic-{{< kairosVersion >}}-trivy.sarif`
- `kairos-alpine-3.18-core-arm64-generic-{{< kairosVersion >}}-grype.json`

## Container Images

Container images are stored in Quay.io and follow the following convention:

```
quay.io/kairos/<flavor>:<flavor_release>-<variant>-<arch>-<device>-<version>
```

This nomenclature for container images lacks some information for the following reasons:

1. All version information (kairos, k3s, etc) is in the tag. This makes it easier to publish
   new versions under the same container repository.
3. The name Kairos is already part of the repository name, so it is not included in the image name.

### Examples

- `{{< oci variant="core" >}}`

## IMG Images

As mentioned before, some images are too big to be delivered via GitHub Releases, so they are stored in Quay.io. At the moment this is only for arm `.img` images.

The convention is the following:

```
quay.io/kairos/<flavor>:<flavor_release>-<variant>-<arch>-<device>-<version>-img
```

### Examples

- `{{< oci variant="core" arch="arm64" model="rpi4" suffix="img" >}}`

## Framework images

There are 2 framework flavors currently, `generic` and `fips`, the latter builds Kairos packages in compliance with FIPS.

All different framework flavors are stored in the same image, so the details are included in the tag. The name is simplified since not all attributes apply for framework images.

```
quay.io/kairos/framework:<version>[-fips]
```

### Examples

- `quay.io/kairos/framework:{{< defaultFrameworkRelease >}}`
- `quay.io/kairos/framework:{{< defaultFrameworkRelease >}}-fips`
- `quay.io/kairos/framework:main`
- `quay.io/kairos/framework:main-fips`
- `quay.io/kairos/framework:latest`
- `quay.io/kairos/framework:latest-fips`

## Binaries

```
<name>-<version>-<os>-<arch>.<extension>
```

Where:

- `<name>`: the name of the binary e.g. `kairosctl`, `kairos-agent`, `provider-kairos`, etc
- `<version>`: the version of the binary e.g. `v1.0.0`
- `<os>`: `Linux`, `Windows`, `Darwin`, etc
- `<arch>`: `amd64`, `arm64`, `386`, etc
- `<extension>`: `tar.gz`, `zip`, etc

### Examples

- kairosctl-v2.3.0-Linux-386.tar.gz
- provider-kairos-2.3.0-Windows-amd64.tar.gz
- kairos-agent-v2.1.10-Linux-arm64.tar.gz
