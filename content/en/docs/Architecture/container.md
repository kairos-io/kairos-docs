---
title: "Container based"
linkTitle: "Container"
description: Discover how Kairos delivers its entire OS as a container image, enabling predictable upgrades and simple version control.
weight: 2
date: 2022-11-13
---

Kairos is a container-based operating system (OS).

A container-based operating system is an OS that is shipped via containers. Indeed, if it happens to be based on Linux (most probably), you can run the container image as well on your Docker daemon. The image being booted is the container, which contains all the required pieces in order to boot (Kernel, Initrd, Init system). There is no real container runtime running the image. The container is used to construct an image internally that is then used to boot the system in an A/B fashion, so there is no overhead introduced. The system being booted is actually a snapshot of the container.

- **Single-image** The OS is a single container image which contains all the OS components, including Kernel and Initrd.
- **Tamper-proof upgrades** Upgrades are atomic, A/B swaps with fallback mechanisms and automatic boot assessment.
- **Distributed via container registries** Bootable images are standard OCI artifacts that can be hosted in any container registry.
- **Platform Engineer-friendly** Adapt the infrastructure to your needs by plugging images into your already-existing workflow pipeline. Customizing an immutable OS becomes as easy as writing a Dockerfile.

## A/B Upgrades

![upgrade](https://user-images.githubusercontent.com/2420543/197806999-587632a1-0292-44df-bb8f-176ff702f62d.png)

Upgrades are atomic operations that can be triggered manually or via Kubernetes. The node will create a transition image that will be swapped for the Active system, and the Active system becomes Passive. This ensures tamper-proof upgrades and automated fallback and boot assessment strategies are in place to automatically boot from the fallback system. The recovery image can be furthermore exploited to completely automatize node recovery.

## Benefits

- Container registries are already widely supported and used by anyone.
- Reduce infrastructure drift, by pushing upgrades as single images, with atomic upgrades.

If you are operating a Kubernetes cluster and deploying applications on top, chances are that you already have a container registry deployed somewhere and configured to store them or manage your infrastructure stack. By using container images, you can reuse the same infrastructure to propagate upgrades to the nodes and handle customizations.

![kairos-factory](https://user-images.githubusercontent.com/2420543/197808767-e213709d-af21-4e32-9a78-818f34170077.png)

Container images can be extended after a build by using standard container building practices and can seamlessly plug into your existing pipelines. Kairos allows you to seamlessly upgrade to container images that are derived from other versions.

We believe that bringing rollbacks, or incremental patches upgrades increases the exposure to infrastructure drift. In opposition, immutable, single images are deployed to the nodes as they were apps - no more discrepancies in your nodes - no need of configuration management tools like Chef, Ansible, or alikes.

This means that to customize a Kairos version, all that is required is to build a standard container image with a plain Dockerfile—plus, the bits that are actually needed - we can't touch a system as we are typically used to.

If you are familiar with Dockerfiles, then you are good to go to roll your own custom OS version to provision in the nodes. That removes any friction to questions like, "How do I add this package to my nodes?", or more complex ones as, "How can I replace with my own Kernel?".

## Container Image based OS

The Image support matrix in [here]({{< relref "../reference/image_matrix" >}}) lists all the container images built from our CI on every release of Kairos.

To inspect an image and run it locally, you can use a container engine like Docker or Podman:

```bash
docker pull {{<oci variant="core" >}}
```

We can run it locally with docker as a container to inspect it, as it is runnable:

```bash
$ docker run -ti --rm {{<oci variant="core" >}}
$ cat /etc/os-release
...
KAIROS_NAME="kairos-core-@flavor"
KAIROS_VERSION="{{< kairosVersion >}}"
KAIROS_ID="kairos"
KAIROS_ID_LIKE="kairos-core-@flavor"
KAIROS_VERSION_ID="{{< kairosVersion >}}"
KAIROS_PRETTY_NAME="kairos-core-@flavor {{< kairosVersion >}}"
KAIROS_BUG_REPORT_URL="https://github.com/kairos-io/kairos/issues"
KAIROS_HOME_URL="https://github.com/kairos-io/kairos"
KAIROS_IMAGE_REPO="{{<oci variant="core" >}}
KAIROS_IMAGE_LABEL="latest"
KAIROS_GITHUB_REPO="kairos-io/kairos"
KAIROS_VARIANT="core"
KAIROS_FLAVOR="@flavor"
```

And check out things like what's the kernel inside:

```bash
$ ls -liah /boot/
total 102M
6692018 drwxr-xr-x 2 root root 4.0K Apr 16  2020 .
6817515 drwxr-xr-x 1 root root 4.0K Oct 10 16:11 ..
6692019 -rw-r--r-- 1 root root   65 Apr 16  2020 .vmlinuz-5.14.21-150400.24.21-default.hmac
6692020 -rw-r--r-- 1 root root 4.9M Apr 16  2020 System.map-5.14.21-150400.24.21-default
6692021 -rw-r--r-- 1 root root 1.7K Apr 16  2020 boot.readme
6692022 -rw-r--r-- 1 root root 245K Apr 16  2020 config-5.14.21-150400.24.21-default
6692023 lrwxrwxrwx 1 root root   35 Apr 16  2020 initrd -> initrd-5.14.21-150400.24.21-default
6692024 -rw------- 1 root root  69M Apr 16  2020 initrd-5.14.21-150400.24.21-default
6692025 -rw-r--r-- 1 root root 443K Apr 16  2020 symvers-5.14.21-150400.24.21-default.gz
6692026 -rw-r--r-- 1 root root  484 Apr 16  2020 sysctl.conf-5.14.21-150400.24.21-default
6692027 -rw-r--r-- 1 root root  17M Apr 16  2020 vmlinux-5.14.21-150400.24.21-default.gz
6692028 lrwxrwxrwx 1 root root   36 Apr 16  2020 vmlinuz -> vmlinuz-5.14.21-150400.24.21-default
6692029 -rw-r--r-- 1 root root  11M Apr 16  2020 vmlinuz-5.14.21-150400.24.21-default
```

The CI process generates bootable medium by the container images, and similarly, we can modify this image to introduce our changes and remaster an ISO as described in [Automated installation]({{< relref "../installation/automated" >}}), but that can be resumed in the following steps:

```bash
$ docker run -ti --name custom-container {{<oci variant="core" >}}
# # Do your changes inside the container..
# echo "foo" > /foo
# ...
# exit
$ docker commit custom-container custom-image
 > sha256:37176f104a870480f9c3c318ab51f6c456571b6612b6a47b96af71b95a0a27c7
# Builds an ISO from it
$ docker run -v $PWD:/cOS -v /var/run/docker.sock:/var/run/docker.sock -i --rm quay.io/kairos/auroraboot:{{< auroraBootVersion >}} --debug build-iso --name "custom-iso" --date=false --output /cOS/ custom-image
 > ...
 > ...
 > xorriso : UPDATE : Writing:     147456s   84.0%   fifo 100%  buf  50%   60.5xD
 > ISO image produced: 175441 sectors
 > Written to medium : 175472 sectors at LBA 48
 > Writing to '/cOS/custom-iso.iso' completed successfully.
$ ls
custom-iso.iso custom-iso.iso.sha256
```

In order to go further and upgrade nodes using this image, now the only requirement is to push it in a container registry and upgrade the nodes using that container image.

For upgrading to a container image see [manual upgrades]({{< relref "../upgrade/manual" >}}) and [kubernetes upgrades]({{< relref "../upgrade/kubernetes" >}}).

## See also

- [ISO remastering]({{< relref "../installation/automated#iso-remastering" >}})
