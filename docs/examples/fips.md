---
title: "FIPS"
sidebar_label: "FIPS"
description: Build a Kairos image with FIPS packages enabled using kairos-init.
---

This example shows how to build a Kairos image with FIPS support.

Use the `--fips` flag in both `kairos-init` stages. Fedora 41 is the base Kairos builds with FIPS in CI:

```dockerfile
FROM fedora:41

ARG VERSION=v1.0.0

RUN --mount=type=bind,from=quay.io/kairos/kairos-init:{{< KairosInitVersion >}},src=/kairos-init,dst=/kairos-init \
  /kairos-init -l debug -s install --version "${VERSION}" --fips && \
  /kairos-init -l debug -s init --version "${VERSION}" --fips
```

Build the image:

```bash
docker build -t my-kairos-fips:v1.0.0 .
```

The image does not turn FIPS on in the kernel by itself. Add `fips=1` to the kernel command line at install time:

```yaml
#cloud-config
install:
  grub_options:
    extra_cmdline: "fips=1"
```

After install, `cat /proc/sys/crypto/fips_enabled` returns `1`.

## Ubuntu

`kairos-init --fips` refuses Ubuntu, because the FIPS packages need an Ubuntu Pro subscription. Build from one of the Ubuntu FIPS examples instead. They attach Pro during the build and install `linux-image-fips`:

- [Ubuntu 20.04](https://github.com/kairos-io/kairos/tree/master/examples/builds/ubuntu-20.04-fips)
- [Ubuntu 22.04](https://github.com/kairos-io/kairos/tree/master/examples/builds/ubuntu-22.04-fips)
- [Ubuntu 24.04](https://github.com/kairos-io/kairos/tree/master/examples/builds/ubuntu-24.04-fips)

For full flag reference, see [Kairos Factory](/docs/reference/kairos-factory/).
