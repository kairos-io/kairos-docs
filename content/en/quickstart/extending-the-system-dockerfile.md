---
title: "Extending the System via Dockerfiles"
linkTitle: "Extending the System (Dockerfile)"
versionBanner: "false"
weight: 2
description: |
  Build a custom Hadron image using a Dockerfile, add an extra binary, publish it to an OCI registry, and upgrade a running node to the new image.
---

{{% alert title="Objective" color="success" %}}
By the end of this quickstart, you will be able to:
- kairosify a Hadron base image with `kairos-init`
- add an additional tool during build time (we’ll install `btm`)
- publish your custom image to an OCI registry
- upgrade a running node to your new image
{{% /alert %}}

Now that you've launched your first Kubernetes cluster on Hadron, you might want to extend the system.
Kairos supports multiple approaches for this—Dockerfiles, systemd system extensions, and bundles. There isn’t a single “best” option: each has trade-offs, and the right choice depends on your needs. In this quickstart, we’ll extend the system using a Dockerfile.

## Prerequisites

{{% alert title="Alternatives" color="success" %}}
This tutorial uses the recommended container and virtualization tools to keep the instructions simple. Other alternatives should work as well, but they’re not documented here. If you successfully follow the tutorial using different tools, please consider opening a PR so others can benefit from your steps.
{{% /alert %}}

To extend and run Hadron, you’ll need a container engine and virtualization software that can run (or emulate) the amd64 architecture. In this guide, we’ll use:

- [Docker](https://docs.docker.com/engine/install/)
- [VirtualBox](https://www.virtualbox.org/)

## Prefer to watch a video?

## Building

Hadron by itself is not immutable. To get the full Kairos experience—immutability, atomic upgrades, and more—we first need to initialize (often called “kairosify”) the system using `kairos-init`.

Create a `Dockerfile` with the following content:

```dockerfile
FROM quay.io/kairos/kairos-init:v0.6.4 AS kairos-init

FROM ghcr.io/kairos-io/hadron:v0.0.1-beta1 AS base
ARG VERSION

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    eval /kairos-init -l debug -s install --model generic --provider k3s --version \"${VERSION}\" && \
    eval /kairos-init -l debug -s init --model generic --provider k3s --version \"${VERSION}\"
```

Build it with the following command. Here, `0.1.0` is the version we’re assigning to `my-hadron`. We tag the image and also pass the version as a build argument so `kairos-init` writes it into `/etc/kairos-release`. We’ll use that in later steps.

{{% alert title="arm64" color="warning" %}}
Hadron is currently in beta, and only amd64 images are available at the moment. If you're running on arm64, you’ll need to build for amd64.
{{% /alert %}}


```bash
docker build -t my-hadron:0.1.0 --build-arg=VERSION=0.1.0 .
```

If the command finishes successfully, you should see `my-hadron` among your local images:

```bash
docker images | grep my-hadron
```

```
my-hadron                          0.1.0          5effd0969bfe   4 minutes ago   397MB
```

## Adding a binary

Hadron doesn’t ship with a package manager. That means the two straightforward options to extend the system are:
- build packages yourself, or
- add a prebuilt binary.

To keep this quickstart short, we’ll use the second approach.

As an example, we’ll download and install `bottom` (`btm`) to inspect system resource usage.

{{% alert title="Toolchain" color="info" %}}
In this example we use the Hadron `hadron-toolchain` image as a build stage. It contains a full build environment (gcc, make, headers, etc.) that is not included in the final production images—useful for build-time tasks, but typically avoided at runtime for security and size reasons.
{{% /alert %}}

```dockerfile
FROM quay.io/kairos/kairos-init:v0.6.4 AS kairos-init

FROM ghcr.io/kairos-io/hadron-toolchain:v0.0.1-beta1 AS bottom
RUN curl -L -o bottom.tar.gz https://github.com/ClementTsang/bottom/releases/download/0.11.4/bottom_x86_64-unknown-linux-musl.tar.gz
RUN tar xvzf bottom.tar.gz

FROM ghcr.io/kairos-io/hadron:v0.0.1-beta1 AS base
ARG VERSION

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    eval /kairos-init -l debug -s install --model generic --provider k3s --version \"${VERSION}\" && \
    eval /kairos-init -l debug -s init --model generic --provider k3s --version \"${VERSION}\"

COPY --from=bottom /btm /usr/bin/btm
```

Now build the image again, but assign a new version. Since we’re using SemVer, bumping the minor version to `0.2.0` is a good next step. This makes it easy to distinguish images and perform upgrades when needed.

```bash
docker build -t my-hadron:0.2.0 --build-arg=VERSION=0.2.0 .
```

Next, push the image to a registry you can access. If you don’t have one available, you can use `ttl.sh`.
Keep in mind `ttl.sh` is an anonymous registry, so an image with the same name might already exist—use a unique image name.

```bash
docker tag my-hadron:0.2.0 ttl.sh/my-hadron:0.2.0
docker push ttl.sh/my-hadron:0.2.0
```

## Upgrade to our newly generated image

If you followed the [quickstart]({{< ref "index.md" >}}), you can use that system to upgrade to the new image. Make sure the VM is running, then SSH into it:

```bash
ssh kairos@IP
```

Run an upgrade using your image:

```bash
sudo kairos-agent upgrade --source oci:ttl.sh/my-hadron:0.2.0
```

Reboot the system:

```bash
sudo reboot
```

Once the system is back up, SSH in again:

```bash
ssh kairos@IP
```

Validate that the new version is running:

```bash
cat /etc/kairos-release | grep KAIROS_VERSION
```

You should see the version you assigned during the build, for example:

```
KAIROS_VERSION="v0.2.0"
```

Finally, check resource usage with `bottom`:

```bash
btm
```

For example, you might see something like `0.9GiB/1.9GiB`.

## Conclusion

Congratulations—you’ve successfully extended a Hadron image and upgraded your running cluster.

## Frequently Asked Questions (FAQs)

**What is the hadron-toolchain container for?**

Hadron builds many packages that are available in the toolchain image but are not included in the final production images. They’re useful for building code from source and other build-time tasks, but you typically avoid shipping them at runtime for security and size reasons.

**How do I downgrade?**

Use the same command, but point it to the image tag you want to downgrade to.

**What if I don't need Kubernetes?**

No problem—remove the `--provider` flag from `kairos-init` and you’ll get a `core` image without Kubernetes installed.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the hadron-toolchain container for?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Hadron builds many packages that are available in the toolchain image but are not included in the final production images. They’re useful for building code from source and other build-time tasks, but you typically avoid shipping them at runtime for security and size reasons."
      }
    },
    {
      "@type": "Question",
      "name": "How do I downgrade?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use the same command, but point it to the image tag you want to downgrade to."
      }
    },
    {
      "@type": "Question",
      "name": "What if I don't need Kubernetes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No problem—remove the `--provider` flag from `kairos-init` and you’ll get a `core` image without Kubernetes installed."
      }
    }
  ]
}
</script>

## What's Next?

Ready to configure and extend your newly deployed Kairos node?

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "../docs/reference/configuration" >}}">
    Configuration
</a>

Learn how to extend the system with system extensions

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< ref "sys-extensions.md" >}}">
    Extending the system with systemd extensions
</a>

Need a highly secure system with TPM-backed attestation and trusted boot?

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "./trusted-boot" >}}">
    Trusted Boot Quickstart
</a>