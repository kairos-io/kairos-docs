---
title: "Artifact Naming Convention"
linkTitle: "Artifact Naming Convention"
weight: 1
date: 2023-07-19
description: >
  Detailed information about how we name our artifacts including repositories.
---

There are many different artifacts that Kairos produces. In this page we try to summarize them all and have a clear naming convention for them.

{{% alert title="Info" %}}
Architecture names are based on the [Go architecture names](https://go.dev/doc/install/source#environment), so `amd64` is used instead of `x86_64`, `386` instead of `i386` and `arm64` instead of `aarch64`.
{{% /alert %}}

# Images

Images are named using the following convention:

```
kairos-<support>-<type>-<flavor>-<arch>-<device>-<version>.<extension>
```

Where:

- `<support>`: `official` or `community`
- `<type>`: `core` or `standard`
- `<flavor>`: Underlying Linux distribution e.g. `ubuntu`, `debian`, `fedora`, `alpine`, etc
- `<arch>`: `amd64` or `arm64`
- `<device>`: either the specific device name, e.g. `rpi64` or `generic` for generic images
- `<version>`: the version of Kairos e.g. `v1.0.0` for Core, and can also include the K3S version e.g. `v1.0.0-k3s1` for Standard
- `<extension>`: `iso`, `squashfs`, `ipxe`

## Examples

- `kairos-official-core-ubuntu-amd64-generic-1.0.0.iso`
- `kairos-official-standard-ubuntu-arm64-rpi64-1.0.0-k3s1.img`

# Reports

Reports follow a similar convention to images, but they include the name of the report:

```
kairos-<support>-<type>-<flavor>-<arch>-<device>-<version>-<report>.<extension>
```

Where:

- `<report>`: `trivy`, `sbom`, `grype`, etc

## Examples

- `kairos-community-core-alpine-arm64-generic-v1.0.0-trivy.sarif`
- `kairos-community-core-alpine-arm64-generic-v1.0.0-grype.json`

# Container Images

{{% alert title="Warning" %}} 
The repositories are not yet available, they will be published soon.
{{% /alert %}}

```
domain/kairos/<support>-<type>-<flavor>-<device>:<version>
```

This nomenclature for repositories lacks some information that is included in the artifacts for the following reasons:

1. Docker repositories can be multi-arch, so the same image can be used in different architectures and therefore the name does not include the architecture.
2. The version is not included in the repository name, but in the tag of the image.
3. The name Kairos is already part of the repository name, so it is not included in the image name.

## Examples

- quay.io/kairos/official-core-ubuntu-generic:v1.0.0

# Image artifacts that are too big to be delivered via GitHub Releases

```
domain/kairos/<support>-<type>-<flavor>-<device>-<extension>:<version>
```
- quay.io/kairos/official-core-ubuntu-generic-img:v1.0.0

# Framework images

All different framework images are stored in the same repository, so the details of the image are included in the tag and don't require all the information in the name:

```
domain/kairos/framework:<version>_<flavor>
```

## Examples

- quay.io/kairos/framework:v1.0.0_ubuntu
- quay.io/kairos/framework:master_alpine

# Binaries

```
<name>-<version>-<os>-<arch>.<extension>
```

Where:

- `<name>`: the name of the binary e.g. `kairosctl`, `kairos-agent`, `provider-kairos`, etc
- `<version>`: the version of the binary e.g. `v1.0.0`
- `<os>`: `Linux`, `Windows`, `Darwin`, etc
- `<arch>`: `amd64`, `arm64`, `386`, etc
- `<extension>`: `tar.gz`, `zip`, etc

## Examples

- kairosctl-v2.3.0-Linux-386.tar.gz
- provider-kairos-2.3.0-Windows-amd64.tar.gz
- kairos-agent-v2.1.10-Linux-arm64.tar.gz