---
title: "Extending the System via Dockerfiles"
linkTitle: "Extending the System (Dockerfile)"
versionBanner: "false"
weight: 2
description: |    
---

{{% alert title="Objective" color="success" %}}
{{% /alert %}}

Now that you've launched your first Kubernetes cluster on Hadron, you might be interested in extending the system. Kairos provides different ways to accomplishing this: Dockerfiles, systemd system extensions and bundles. Neither of them is the best or recommended way to extend your system, each of them have their pros and cons and only you can decide which one makes the most sense for you. In this tutorial we are going to extend the system using Dockerfiles.

## Prerequisites

{{% alert title="Alternatives" color="success" %}}
This tutorial uses the recommended container and virtualization tools to keep the instructions simple. Other alternatives should work as well, but they’re not documented here. If you successfully follow the tutorial using different tools, please consider opening a PR so others can benefit from your steps.
{{% /alert %}}

To run extend and run Hadron, you’ll need both a container engine and virtualization software that can run or emulate the amd64 architecture. In this guide, we’ll be using:

- [Docker](https://docs.docker.com/engine/install/)
- [VirtualBox](https://www.virtualbox.org/)

## Prefer to watch a video?

## Building 

Hadron by its own is not immutable, to get all the benefits like immutability, atomic upgrades and everything that Kairos provides, we need to initialize (or more comonly known as "kairosify") the system with `kairos-init`.

Create a `Dockerfile` with the following content

```dockerfile
FROM quay.io/kairos/kairos-init:v0.6.4 AS kairos-init

FROM ghcr.io/kairos-io/hadron:v0.0.1-beta1 AS base
ARG VERSION

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    eval /kairos-init -l debug -s install --model generic --provider k3s --version \"${VERSION}\" && \
    eval /kairos-init -l debug -s init --model generic --provider k3s --version \"${VERSION}\"
```

Build it with the following command. `0.1.0` is the version we are going to assign to my-hadron, so we tag the image but we also pass it as a build argument so kairos-init sets it in the `/etc/kairos-release` file. This will be useful for the next steps we take.

{{% alert title="arm64" color="warning" %}}
Hadron is currently in beta and only amd64 images are available atm. If you are running this on an arm64 system, you need to crosscompile to amd64.
{{% /alert %}}


```bash
docker build -t my-hadron:0.1.0 --build-arg=VERSION=0.1.0 .
```

If the command finishes successfully you should be able to see `my-hadron` as part of your images

```bash
docker images | grep my-hadron
```

```
my-hadron                          0.1.0          5effd0969bfe   4 minutes ago   397MB
```

## Adding a binary

Hadron doesn't come with a package manager, this means that the two options we have out of the box to extend the system are either building a package ourselves or adding a binary. We'll go with the latter for now to keep this tutorial as short as possible.

As an example, we are going to download and install bottom to check the system resource consumption.

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

Now let's build this imabe but assing a new version. Since we are using semver, bumping the minor to `0.2.0` should be good enough. This way we can clearly differenciate between our images and do the upgrades when needed.

```
docker build -t my-hadron:0.2.0 --build-arg=VERSION=0.2.0 .
```

Let's also push this image to a repository we have access to, if you don't have one handy you can use ttl.sh. Keep in mind that this is an annonimous repository so there might already be an image named like this, so better come up with your own image name.

```
docker tag my-hadron:0.2.0 ttl.sh/my-hadron:0.2.0
docker push ttl.sh/my-hadron:0.2.0
```

## Upgrade to our newly generated image

If you followed the [quickstart]({{< ref "index.md" >}}) we will use that system to upgrade to our new image. Make sure the system is running and ssh into it.

```bash
ssh kairos@IP
```

And run an upgrade with your image

```bash
sudo kairos-agent upgrade --source oci:ttl.sh/my-hadron:0.2.0
```

Reboot the system

```bash
sudo reboot
```

Once the system is ready we ssh again

```bash
ssh kairos@IP
```

And validate that the new version is running 

```bash
cat /etc/kairos-release | grep KAIROS_VERSION
```

You should see the version you assigned during build, in this example

```
KAIROS_VERSION="v0.2.0"
```

And last but not least, let's check the resources consumption with bottom

```bash
btm
```

In my case I can see `0.9GiB/1.9GiB` 

## Conclusion

Congratulations :tada: You have successfully extended a Hadron image and upgraded your running cluster.

## Frequently Asked Questions (FAQs)

**What is the hadron-toolchain container for?**

Hadron's builds many packages that are available in the toolchain but not included in the final production images. They are useful for building code from source and other tasks which you might find useful during build time but which you want to avoid having during runtime for either security reasons or size.

**How do I downgrade?**

You can use the exact same command but point it to the image you want to downgrade to.

**What if I don't need Kubernetes?**

No problem, just remove the `--provider` flag from `kairos-init` and you will get a `core` image without Kubernetes installed.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a Kairos flavor?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Kairos flavor is a specific version of Kairos that is built on top of a specific Linux distribution. For example, the Alpine Kairos flavor is built on top of Alpine Linux. You can choose the flavor that best suits your needs."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use Kairos without Kubernetes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, absolutely! You can use Kairos as a standalone Linux distribution without Kubernetes. Just download the Kairos Core artifacts if you don't want to use Kubernetes, or configure the Standard artifacts with the `k3s` option disabled."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use a different Kubernetes distribution with Kairos?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Kairos uses providers to install Kubernetes distributions. The Kairos provider is the only one that is built and tested by the Kairos team, but there are other providers by the community and you can build your own!"
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

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="{{< ref "sys-extensions.md" >}}">
    Extending the system with systemd extensions
</a>

Need a highly secure system with TPM-backed attestation and trusted boot?

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="{{< relref "./trusted-boot" >}}">
    Trusted Boot Quickstart
</a>