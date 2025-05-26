---
title: "Build a Kairos Image and Upgrade Your Cluster"
linkTitle: "Building & Upgrading"
versionBanner: "false"
weight: 3
description: |
    Kairos is an immutable OS so we cannot install new packages on a running system. Instead, adding packages is achieved by building a container image and upgrading the node with it.
---

{{% alert title="Objective" color="success" %}}
This guide will walk you through the steps to build a new Kairos container image and add additional packages. You will then use the newly built image to upgrade a Kairos node manually.
{{% /alert %}}

## Prerequisites

- A single node Kairos cluster as the one deployed in the [Getting Started guide](/docs/getting-started).
- Access to Docker or a different container engine on your machine

## Do you prefer to watch a video?

{{< youtube id="bXTvNMs1wcI" title="Building and Upgrading Kairos" >}}

## Containers

As we saw in the previous section on how to configure Kairos, it is not possible to add packages on a running system because it is mounted as read-only. Instead we are going to use containers to extend our base Kairos image. Containers play a central role on Kairos lifecycle.

Start by creating a file called `Dockerfile` with the following content

```
ARG BASE_IMAGE=ruby:3.4.4-bookworm # The ruby image is based on Debian bookworm, you can do the same with any of your images as long as they use a supported distro

FROM quay.io/kairos/kairos-init:v0.4.8 AS kairos-init

FROM ${BASE_IMAGE} AS base-kairos
ARG VARIANT=standard          # we want kubernetes, otherwise core
ARG MODEL=generic             # we will run as an amd64 VM
ARG TRUSTED_BOOT=false
ARG KUBERNETES_DISTRO=k3s     # alternatively k0s
ARG KUBERNETES_VERSION=latest
ARG FRAMEWORK_VERSION=v2.22.0 # https://github.com/kairos-io/kairos-framework
ARG VERSION=v1.0.0

COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug -s install -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug -s init -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug --validate -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN rm /kairos-init
```

The Dockerfile above creates a Kairos image by using a multi-stage build. It starts with the kairos-init container which provides the initialization tools, then uses your chosen base distribution (in this example, a Ruby image based on Debian Bookworm) and configures it with Kairos components. You can specify various build arguments to customize the image, such as which Kubernetes distribution to use (k3s or k0s), whether to include Kubernetes at all (standard vs core variant), the model (e.g. generic for amd64 VMs), trusted boot settings, and which version of the Kairos framework to use. The build process involves three steps using kairos-init: installation, initialization, and validation.

Now we build the image

```
docker build -t ttl.sh/mauros-v1.0.0:24h .
```

I'm using `ttl.sh` as my repositoy becuase it is a temporary one, but you can use whichever you prefer. In this case the `24h` tag means that this image will only be accessible for 24 hours. I also named my image in a way that is helpful for me to keep track of the different changes within my images, in this case I use semver but you can use whatever other means for tracking changes.

And we need to push it out to a registry

```
docker push ttl.sh/mauros-v1.0.0:24h
```

## Upgrading a Kairos node manually

There are different ways to upgrade a Kairos node, in this case we will follow a manual approach just to get you initiated on doing Day-2 operations to a Kairos cluster. Make sure to also check out the other ways to [upgrade your Kairos system and clusters](/docs/upgrade/).

1. SSH into the node
2. Run an upgrade with the Kairos agent and add your image as the source

```
kairos-agent upgrade --source oci:ttl.sh/mauros-v1.0.0:24h
```

3. Reboot the system

## Conclusion

Congrats! You have now taken your Kairos experience to another level. You can now create your own images and upgrade your nodes, soon you will be an expert.

## Frequently Asked Questions (FAQs)

**When should I add things on the Dockerfile and when to the cloud-config?**

The answer to this will depend on your setup but here are two things to keep in mind. If you can install software via Kubernetes, then you don't need to build your own images, for example for a Ruby on Rails application, you don't need Ruby at the host system, since it will running in containers. If you cannot or don't want to install on Kubernetes, then just keep this in mind. Changes to your cloud-config can be applied on a node and the effects will be present as soon as you reboot, giving you a faster feedback loop, while changes done at the Dockerfile level, will require that you build a new image and upgrade all your nodes.

**What if I don't want to base my image on the Kairos released artifacts?**

No problem, just [build your image from scratch](/reference/kairos-factory/)

**Can I easily rollback an upgrade?**

Yes you can! Boot into the passive (fallback) system, and apply an upgrade with the previous image (or to any image you'd rather upgrade to). This will completely replace the active image with the one you specify, keeping your passive image intact.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "When should I add things on the Dockerfile and when to the cloud-config?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The answer to this will depend on your setup but here are two things to keep in mind. If you can install software via Kubernetes, then you don't need to build your own images, for example for a Ruby on Rails application, you don't need Ruby at the host system, since it will running in containers. If you cannot or don't want to install on Kubernetes, then just keep this in mind. Changes to your cloud-config can be applied on a node and the effects will be present as soon as you reboot, giving you a faster feedback loop, while changes done at the Dockerfile level, will require that you build a new image and upgrade all your nodes."
      }
    },
    {
      "@type": "Question",
      "name": "What if I don't want to base my image on the Kairos released artifacts?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No problem, just [build your image from scratch](/reference/build-from-scratch/)"
      }
    },
    {
      "@type": "Question",
      "name": "Can I easily rollback an upgrade?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes you can! Boot into the passive (fallback) system, and apply an upgrade with the previous image (or to any image you'd rather upgrade to). This will completely replace the active image with the one you specify, keeping your passive image intact."
      }
    },
  ]
}
</script>

## What's next?

Check other ways to upgrade Kairos

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "../docs/upgrade/" >}}">
    Upgrade Guide
</a>

Create your own Kairos Flavor

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "../docs/reference/build-from-scratch/" >}}">
    Build from Scratch Guide
</a>

Got stuck?

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "../docs/reference/troubleshooting/" >}}">
    Troubleshooting Guide
</a>
