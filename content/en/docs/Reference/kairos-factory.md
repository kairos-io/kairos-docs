---
title: "The Kairos Factory"
linkTitle: "The Kairos Factory"
weight: 4
description: "Converting any base image into a Kairos ready image"
---

{{% alert title="Ongoing Project" color="warning" %}}
The Kairos factory is an ongoing project. Things might change, and we are working on improving the documentation and the process. If you encounter any issues, please feel free to open up issues and help us improve the Documentation!

For further info check out [#1914](https://github.com/kairos-io/kairos/issues/1914)
{{% /alert %}}

Kairos is not just an OS, it's also a way to turn an existing OS into a Kairos-ready image. This process is called "Kairosification" and it's done by the Kairos Factory.

For the newcomer or someone who simply needs an immutable OS with k3s and edgeVPN, the Kairos OS is the way to go. As long as this components work, you don't need to worry about the changes in the underlying OS. However, if you need to ensure certain packages are present or remain stable in your system, you can use the Kairos Factory to convert your base image into a Kairos-ready image. This is particularly useful if you have special firmware requirements, or if you want to have your own release cadence.

{{% alert title="Requirements" color="info" %}}
In order to run the Kairos Factory, you will need docker installed on your system. You can find the installation instructions [here](https://docs.docker.com/get-docker/).
{{% /alert %}}


## The Kairos Factory Process

The Kairos factory is a single step process applied on a container image. All you need to do is run [kairos-init](https://github.com/kairos-io/kairos-init) in your Dockerfile. Optionally, you can use [auroraboot.md](auroraboot.md) to generate artifacts (isos, raw images, etc..) based on the generated OCI artifact.


## What is Kairos-init?

kairos-init is a tool designed to facilitate the initialization and customization of Kairos-based images.
The primary purpose of kairos-init is to convert an existing base image into a Kairos-ready image.

kairos-init should be available to plug into your existing dockerfile and would allow you to only use docker to generate valid Kairos compatible artifacts


{{% alert title="Platforms" color="warning" %}}

Note that as we are using standard docker tools, the platform to build for is provided by docker, either by the default value or by the `--platform` setting when building images. The platform to build the Kairos OCI artifacts is based on that, so running it under an arm64 platform will build and arm64 Kairos artifact.

See the [docker multi-platform docs](https://docs.docker.com/build/building/multi-platform/) for more info.
{{% /alert %}}


## How to use

Create a single Dockerfile:

```Dockerfile
FROM quay.io/kairos/kairos-init:v0.2.6 AS kairos-init

FROM ubuntu:24.04
ARG VERSION=1.0.0
COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init --version "${VERSION}"
RUN rm /kairos-init
```

The only required argument for kairos-init is the version, which will be set under the `/etc/kairos-release` values to track the artifacts version so you can upgrade to those and track changes.

Then you can just build it like any other Dockerfile ever:
```bash
$ docker build -t ubuntu-kairos:24.04 .
[+] Building 92.1s (10/10) FINISHED                                                      docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 249B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.4s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.2.6                                 0.3s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => CACHED [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.2.6@sha256:35f581dbc480385b21f7a2  0.0s
 => [stage-1 1/4] FROM docker.io/library/ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308d3e9  1.2s
 => => resolve docker.io/library/ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308d3e9ec7ed1c3  0.0s
 => => sha256:72297848456d5d37d1262630108ab308d3e9ec7ed1c3286a32fe09856619a782 6.69kB / 6.69kB     0.0s
 => => sha256:3afff29dffbc200d202546dc6c4f614edc3b109691e7ab4aa23d02b42ba86790 424B / 424B         0.0s
 => => sha256:a04dc4851cbcbb42b54d1f52a41f5f9eca6a5fd03748c3f6eb2cbeb238ca99bd 2.30kB / 2.30kB     0.0s
 => => sha256:5a7813e071bfadf18aaa6ca8318be4824a9b6297b3240f2cc84c1db6f4113040 29.75MB / 29.75MB   0.6s
 => => extracting sha256:5a7813e071bfadf18aaa6ca8318be4824a9b6297b3240f2cc84c1db6f4113040          0.5s
 => [stage-1 2/4] COPY --from=kairos-init /kairos-init /kairos-init                                0.0s
 => [stage-1 3/4] RUN /kairos-init -l debug --version "1.0.0"                                     87.9s
 => [stage-1 4/4] RUN rm /kairos-init                                                              0.1s
 => exporting to image                                                                             2.4s 
 => => exporting layers                                                                            2.4s 
 => => writing image sha256:316c2db8ce9e0a2fe4a60acaa417257a4c813d3cd5afec7f77ed2fbf4d96637b       0.0s 
 => => naming to docker.io/library/ubuntu-kairos:24.04
```

That will give you a nice local image tagged `ubuntu-kairos:24.04` that can be feed to [auroraboot.md](auroraboot.md) to generate an ISO, Trusted Boot artifacts or Cloud Images.

For example:

```bash
$ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:v0.5.0 build-iso --output /output/ docker:ubuntu-kairos:24.04
2025-02-27T13:33:42Z INF Copying ubuntu-kairos:24.04 source to /output/temp-rootfs
2025-02-27T13:33:47Z INF Finished copying ubuntu-kairos:24.04 into /output/temp-rootfs
2025-02-27T13:33:47Z INF Preparing squashfs root...
2025-02-27T13:33:47Z INF Copying /output/temp-rootfs source to /tmp/auroraboot-iso220411365/rootfs
2025-02-27T13:33:47Z INF Starting rsync...
2025-02-27T13:33:49Z INF Finished syncing
2025-02-27T13:33:49Z INF Finished copying /output/temp-rootfs into /tmp/auroraboot-iso220411365/rootfs
2025-02-27T13:33:49Z INF Preparing ISO image root tree...
2025-02-27T13:33:49Z INF Copying /tmp/geniso2408076146 source to /tmp/auroraboot-iso220411365/iso
2025-02-27T13:33:49Z INF Starting rsync...
2025-02-27T13:33:49Z INF Finished syncing
2025-02-27T13:33:49Z INF Finished copying /tmp/geniso2408076146 into /tmp/auroraboot-iso220411365/iso
2025-02-27T13:33:49Z INF Creating EFI image...
2025-02-27T13:33:49Z INF Detected Flavor: ubuntu
2025-02-27T13:33:49Z INF Ubuntu based ISO detected, copying grub.cfg to /EFI/ubuntu/grub.cfg
2025-02-27T13:33:49Z INF Creating file system image /tmp/auroraboot-iso220411365/iso/boot/uefi.img with size 4Mb
2025-02-27T13:33:49Z INF Creating squashfs...
2025-02-27T13:33:53Z INF Creating ISO image...
$ ls build      
config.yaml  kairos.iso  kairos.iso.sha256  netboot  temp-rootfs
```


## Configuration

kairos-init can generate both core and standard images, and standard images can be bundled with either k3s or k0s and any version of the software that you want.

It can also prepare OCI artifacts for [Trusted Boot](../Architecture/trustedboot.md) which are slimmer than the usual ones, as they have size limitations plus we dont want to ship things like grub or dracut in them as they are useless.



Here is a list of flags, explanation and what are the possible and default values

| Flag         | Explanation                                              | Possible values             | Default value   |
|--------------|----------------------------------------------------------|-----------------------------|-----------------|
| --version    | Set version of the artifact that we are building         | Any                         | None (REQUIRED) |
| -l           | Sets the log level                                       | info,warn,debug,trace       | info            |
| -s           | Sets the stage to run                                    | install, init, all          | all             |
| -m           | Sets the model                                           | generic, rpi3, rpi4         | generic         |
| -v           | Sets the variant                                         | core, standard              | core            |
| -k           | Sets the Kubernetes provider                             | k3s,k0s                     | k3s             |
| -r           | Sets registry and org (Checks this repo when upgrading)  | Any valid registry and org  | quay.io/kairos  |
| -t           | Sets Trusted Boot on                                     | true,false                  | false           |
| -f           | Sets the framework version to use                        | Any valid framework version | latest          |
| --fips       | Use FIPS framework for FIPS 140-2 compliance images      | true,false                  | false           |
| --k8sversion | Sets the provider version to use                         | Any valid provider version  | latest          |
| --validate   | Sets the run to validate which only validates the system | true,false                  | true            |


You can provide a generic Dockerfile that gets all this values and passes them down into kairos-init like we do under Kairos:

```Dockerfile
ARG BASE_IMAGE=ubuntu:20.04

FROM quay.io/kairos/kairos-init:v0.2.6 AS kairos-init

FROM ${BASE_IMAGE} AS base-kairos
ARG VARIANT=core
ARG MODEL=generic
ARG TRUSTED_BOOT=false
ARG KUBERNETES_DISTRO=k3s
ARG KUBERNETES_VERSION=latest
ARG VERSION

COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init -l debug -s install -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -l debug -s init -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -l debug --validate -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN rm /kairos-init
```

{{% alert title="Variant" color="note" %}}

When selecting the `standard` variant, the produced image will contain the default kubernetes provider (k3s) with the latest published version of k3s, the Kairos provider for kubernetes and some extra k8s utils like k9s or kube-vip.

If you want to override those see the flags `-k` and `--k8sversion`

{{% /alert %}}

## Phases

kairos-init is divided in 2 phases, one its the install phase which install all nedeed packages and binaries and the other is the init phase, which gets the system ready. This are the main parts of each phase:

Install:
 - Install required packages via system package manager
 - Install [kairos-framework](https://github.com/kairos-io/kairos-framework) into the system
 - Install the Kairos' provider, including a k8s distribution and tools if it's a standard image

Init:
 - Fill the /etc/kairos-release data (needed for upgrades, grub booting, kernel cmdline, etc...)
 - Remove Old kernel links and duplicates
 - Get and link kernel to `/boot/vmlinuz`
 - Remove all existing initrds
 - Build a new initrd and link it to `/boot/initrd`
 - Enable/disable needed services
 - Run some workarounds (grub vs grub2 naming for example)
 - Run system cleanup to avoid leftovers


As you can see, both of these stages runs separately so you can hijack this in the middle and add or remove things.

For example, it's possible to add extra modules to be added to the initrd, or a specific kernel instead of the default latest one.
Extra services can be either added or made required, etc..

The separation it's also very useful for caching, as once the install phase has been cached by docker we can modify the following steps to fix any issues before the init phase is run, without removing the cache. This is particularly useful under cross platform builds where speed can take a big impact depending on your setup. 

## Examples

All the examples are using the [kairos default dockerfile](https://github.com/kairos-io/kairos/blob/master/images/Dockerfile) as the base Dockerfile and its reproduced below:

```Dockerfile
ARG BASE_IMAGE=ubuntu:20.04

FROM quay.io/kairos/kairos-init:v0.2.6 AS kairos-init

FROM ${BASE_IMAGE} AS base-kairos
ARG VARIANT=core
ARG MODEL=generic
ARG TRUSTED_BOOT=false
ARG KUBERNETES_DISTRO=k3s
ARG KUBERNETES_VERSION=latest
ARG FRAMEWORK_VERSION=v2.16.1
ARG VERSION

COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug -s install -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug -s init -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN /kairos-init -f "${FRAMEWORK_VERSION}" -l debug --validate -m "${MODEL}" -v "${VARIANT}" -t "${TRUSTED_BOOT}" -k "${KUBERNETES_DISTRO}" --k8sversion "${KUBERNETES_VERSION}" --version "${VERSION}"
RUN rm /kairos-init
```

### Build rpi4 k3s oci artifacts (arm64 platform)

Based on Alpine 3.19:

```bash
$ docker build --platform=arm64 -t alpine-rpi:3.19 --build-arg MODEL=rpi4 --build-arg BASE_IMAGE=alpine:3.19 --build-arg VERSION=v1.0.0 .
```

Based on Ubuntu 22.04:

```bash
$ docker build --platform=arm64 -t ubuntu-rpi:22.04 --build-arg MODEL=rpi4 --build-arg BASE_IMAGE=ubuntu:22.04 --build-arg VERSION=v1.0.0 .
```


### Add a specific kernel to ubuntu 24.04 (amd64 platform)

```Dockerfile
FROM quay.io/kairos/kairos-init:v0.2.6 AS kairos-init

FROM ubuntu:24.04
COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init -l debug -s install --version "v0.0.1"
# Remove default kernel that Kairos-init installs
RUN apt-get remove -y linux-base linux-image-generic-hwe-24.04 && apt-get autoremove -y
# Install Smaller virtual kernel, useful for testing things in VMS
RUN apt-get install -y linux-image-virtual
# Run the init phase as normal, it will find the new kernel and link it + generate initrd
RUN /kairos-init -l debug -s init --version "v0.0.1"
RUN /kairos-init -l debug --validate --version "v0.0.1"
RUN rm /kairos-init
```

```bash
$ docker build -t ubuntu-kairos-virtual:24.04 .
[+] Building 0.7s (14/14) FINISHED                                                       docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 478B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.4s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.2.6                                 0.7s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.2.6@sha256:35f581dbc480385b21f7a22317fc5  0.0s
 => [stage-1 1/8] FROM docker.io/library/ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308d3e9  0.0s
 => CACHED [stage-1 2/8] COPY --from=kairos-init /kairos-init /kairos-init                         0.0s
 => CACHED [stage-1 3/8] RUN /kairos-init -l debug -s install --version "v0.0.1"                   0.0s
 => [stage-1 4/8] RUN apt-get remove -y linux-base linux-image-generic-hwe-24.04 && apt-ge         2.0s
 => [stage-1 5/8] RUN apt-get install -y linux-image-virtual                                      10.0s
 => [stage-1 6/8] RUN /kairos-init -l debug -s init --version "v0.0.1"                            21.0s
 => [stage-1 7/8] RUN /kairos-init -l debug --validate --version "v0.0.1"                          0.0s
 => [stage-1 8/8] RUN rm /kairos-init                                                              0.1s
 => exporting to image                                                                             0.0s
 => => exporting layers                                                                            0.8s
 => => writing image sha256:f695a8c45e2cab01c834d4dc3a1f130750d7863955c5be812c96015eafc19753       0.8s
 => => naming to docker.io/library/ubuntu-kairos-virtual:24.04                                     0.8s
```

As you can see, most of the steps were already cached, so we gained that. If we wanted we could now go back and change it further but take advantage of the cached layers.


## Build Trusted Boot images (core and standard)

Core:

```bash
$ docker build -t ubuntu-kairos-trusted-core:24.04 --build-arg BASE_IMAGE=ubuntu:24.04 --build-arg TRUSTED_BOOT=true --build-arg VERSION=v1.0.0 .
[+] Building 61.6s (13/13) FINISHED                                                      docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 981B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.7s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.2.6                                 0.5s
 => [auth] library/ubuntu:pull token for registry-1.docker.io                                      0.0s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.2.6@sha256:35f581dbc480385b21f7a22317fc5  0.0s
 => [base-kairos 1/6] FROM docker.io/library/ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308  0.0s
 => CACHED [base-kairos 2/6] COPY --from=kairos-init /kairos-init /kairos-init                     0.0s
 => [base-kairos 3/6] RUN /kairos-init -f "v2.16.1" -l debug -s install -m "generic" -v "core" -  57.7s
 => [base-kairos 4/6] RUN /kairos-init -f "v2.16.1" -l debug -s init -m "generic" -v "core" -t "t  1.8s
 => [base-kairos 5/6] RUN /kairos-init -f "v2.16.1" -l debug --validate -m "generic" -v "core" -t  0.1s
 => [base-kairos 6/6] RUN rm /kairos-init                                                          0.1s
 => exporting to image                                                                             1.2s 
 => => exporting layers                                                                            1.2s 
 => => writing image sha256:2cfdfaddf5d59375209d76d2c019fa42c5d56e410c3fc401e0b7fd820ffcf0d6       0.0s 
 => => naming to docker.io/library/ubuntu-kairos-trusted-core:24.04      
```

Standard, default latest k3s:

```bash
$ docker build -t ubuntu-kairos-trusted-standard:24.04 --build-arg BASE_IMAGE=ubuntu:24.04 --build-arg TRUSTED_BOOT=true --build-arg VERSION=v1.0.0 --build-arg VARIANT=standard .
[+] Building 78.3s (12/12) FINISHED                                                      docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 981B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.4s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.2.6                                 0.3s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.2.6@sha256:35f581dbc480385b21f7a22317fc5  0.0s
 => [base-kairos 1/6] FROM docker.io/library/ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308  0.0s
 => CACHED [base-kairos 2/6] COPY --from=kairos-init /kairos-init /kairos-init                     0.0s
 => [base-kairos 3/6] RUN /kairos-init -f "v2.16.1" -l debug -s install -m "generic" -v "standar  74.5s
 => [base-kairos 4/6] RUN /kairos-init -f "v2.16.1" -l debug -s init -m "generic" -v "standard" -  1.7s
 => [base-kairos 5/6] RUN /kairos-init -f "v2.16.1" -l debug --validate -m "generic" -v "standard  0.1s
 => [base-kairos 6/6] RUN rm /kairos-init                                                          0.1s
 => exporting to image                                                                             1.4s 
 => => exporting layers                                                                            1.4s 
 => => writing image sha256:74dbec2d7a9ad2b8e8aa4893c349633803172ab9a180b463219c128bdd4d51e4       0.0s 
 => => naming to docker.io/library/ubuntu-kairos-trusted-standard:24.04      
```


Now lets build a Trusted Boot ISO from the standard image:
Note that for Trusted Boot builds we need to pass the keys dir, please refer to Trusted Boot docs for more info about this.

```bash
$ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD/e2e/assets/keys:/keys \
  -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:v0.5.0 build-uki --output-dir /output/ -k /keys --output-type iso \
  docker:ubuntu-kairos-trusted-standard:24.04                       
2025-02-27T14:54:41Z INF Extracting image to a temporary directory
2025-02-27T14:54:41Z INF Copying ubuntu-kairos-trusted-standard:24.04 source to /tmp/auroraboot-build-uki-1771870410
2025-02-27T14:54:44Z INF Finished copying ubuntu-kairos-trusted-standard:24.04 into /tmp/auroraboot-build-uki-1771870410
2025-02-27T14:54:44Z INF Creating additional directories in the rootfs
2025-02-27T14:54:44Z INF Copying kernel
2025-02-27T14:54:44Z INF Creating an initramfs file
`2025-02-27T14:55:09Z INF Running ukify for cmdline: Kairos: console=ttyS0 console=tty1 net.ifnames=1 rd.immucore.oemlabel=COS_OEM rd.immucore.oemtimeout=2 rd.immucore.uki selinux=0 panic=5 rd.shell=0 systemd.crash_reboot=yes install-mode
2025-02-27T14:55:09Z INF Generating: norole.efi
2025-02-27T14:55:12Z INF Creating kairos and loader conf files
2025-02-27T14:55:12Z INF Calculating the size of the img file
2025-02-27T14:55:12Z INF Creating the img file with size: 434Mb
2025-02-27T14:55:13Z INF Created image: /tmp/auroraboot-iso-dir-805355778/efiboot.img
2025-02-27T14:55:13Z INF Creating directories in the img file
2025-02-27T14:55:13Z INF Copying files in the img file
2025-02-27T14:55:13Z INF Adding files from /tmp/auroraboot-build-uki-1771870410 to iso
2025-02-27T14:55:13Z INF Copying /tmp/auroraboot-build-uki-1771870410 source to /tmp/auroraboot-iso-dir-805355778
2025-02-27T14:55:13Z INF Starting rsync...
2025-02-27T14:55:14Z INF Finished syncing
2025-02-27T14:55:14Z INF Finished copying /tmp/auroraboot-build-uki-1771870410 into /tmp/auroraboot-iso-dir-805355778
2025-02-27T14:55:14Z INF Creating the iso files with xorriso
2025-02-27T14:55:15Z INF Done building iso at: /output/
```

## Web UI

The Kairos Factory is also available as a web UI, which is currently under development but you can already preview since version `0.6.0` of [AuroraBoot](auroraboot.md).

To use the web UI, you need to run the AuroraBoot with the `web` command:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
           --privileged \
           -v $PWD/build/:/output \
           -p 8080:8080 \
           quay.io/kairos/auroraboot:{{< auroraBootVersion >}} web
```

If the process is successful, you will see the following output:

```
   ____    __
  / __/___/ /  ___
 / _// __/ _ \/ _ \
/___/\__/_//_/\___/ v4.13.3
High performance, minimalist Go web framework
https://echo.labstack.com
____________________________________O/_______
                                    O\
⇨ http server started on [::]:8080
```

From there you can access the web UI by visiting `http://localhost:8080` in your browser.

{{< figure
  src="https://github.com/user-attachments/assets/685e85b4-9559-48c6-973c-221b43883baa"
  alt="Kairos Web UI running on localhost:8080"
  width="75%"
>}}
