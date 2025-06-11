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
FROM quay.io/kairos/kairos-init:{{< kairosInitVersion >}} AS kairos-init

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
[+] Building 69.9s (10/10) FINISHED                                                      docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 240B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.0s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.5.0                                 0.4s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => CACHED [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.5.0@sha256:8d6a0000b6dfcf905eceeb  0.0s
 => [stage-1 1/4] FROM docker.io/library/ubuntu:24.04                                              0.0s
 => CACHED [stage-1 2/4] COPY --from=kairos-init /kairos-init /kairos-init                         0.0s
 => [stage-1 3/4] RUN /kairos-init --version "1.0.0"                                              66.7s
 => [stage-1 4/4] RUN rm /kairos-init                                                              0.1s
 => exporting to image                                                                             2.6s 
 => => exporting layers                                                                            2.6s 
 => => writing image sha256:78d8ba90a19bfa472438f207002a0ba2178917ab4c5190c3b2146f1964bac6dc       0.0s 
 => => naming to docker.io/library/ubuntu-kairos:24.04                                             0.0s 
```

That will give you a nice local image tagged `ubuntu-kairos:24.04` that can be feed to [auroraboot.md](auroraboot.md) to generate an ISO, Trusted Boot artifacts or Cloud Images.

For example:

```bash
$ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:{{< auroraBootVersion >}} build-iso --output /output/ docker:ubuntu-kairos:24.04
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



## Why the Version Matters

When using kairos-init, the --version argument you set isn't just cosmetic — it defines the version metadata for the image you're building. This version is embedded into /etc/kairos-release inside the image, and it becomes critical for:

 - Upgrade management: Kairos upgrade tooling checks versions to decide when and how to upgrade systems safely.

 - Tracking changes: It helps users, automation, and debugging processes know exactly what version of a system they are running.

 - Compatibility validation: Different components, like trusted boot artifacts or upgrade servers, rely on accurate versioning to operate properly.

{{% alert title="Important!" color="warning" %}}
Kairos Factory prepares base artifacts. It's the responsibility of the derivative project or user (you!) to define and manage the versioning of your images. The only requirement is that versions must follow Semantic Versioning (semver.org) conventions to ensure upgrades and compatibility checks work predictably.
{{% /alert %}}

Different users may adopt different strategies:

 - A project building nightly or weekly Kairos images might automatically bump the patch or minor version each time, pulling in the latest OS package updates and security fixes.

 - Another team might maintain stable, long-lived releases, only issuing a new version every six months after extensive testing, validation, and certification.

Both are perfectly valid.
What matters is that you track and manage your own version history, ensuring each new artifact has a clear and correct version that reflects its expected upgrade and compatibility behavior.

If you don't set a meaningful version when running kairos-init, you risk confusing upgrade flows, making troubleshooting harder, and potentially breaking compatibility guarantees for users and automated systems.



{{% alert title="Kairos releases" color="info" %}}
Kairos releases its own artifacts with our own cadence, as we are also consumers of kairos-init. We use the same recommendations as above for our own "vanilla" Kairos releases.
{{% /alert %}}


## Configuration

kairos-init can generate both core and standard images, and standard images can be bundled with either k3s or k0s and any version of the software that you want.

It can also prepare OCI artifacts for [Trusted Boot](../Architecture/trustedboot.md) which are slimmer than the usual ones, as they have size limitations plus we dont want to ship things like grub or dracut in them as they are useless.



Here is a list of flags, explanation and what are the possible and default values

| Flag         | Explanation                                              | Possible values            | Default value   |
|--------------|----------------------------------------------------------|----------------------------|-----------------|
| -v           | Set version of the artifact that we are building         | Any                        | None (REQUIRED) |
| -l           | Sets the log level                                       | info,warn,debug,trace      | info            |
| -s           | Sets the stage to run                                    | install, init, all         | all             |
| -m           | Sets the model                                           | generic, rpi3, rpi4        | generic         |
| -k           | Sets the Kubernetes provider                             | k3s,k0s                    | None            |
| --k8sversion | Set the Kubernetes version to use for the given provider | Any valid provider version | Latest          |
| -t           | Sets Trusted Boot on                                     | true,false                 | false           |
| --fips       | Use FIPS framework for FIPS 140-2 compliance images      | bool                       | false           |
| -x           | Enable the loading of stage extensions                   | bool                       | false           |
| --skip-steps | Skip the given steps during the image build              | Steps or Stages            | None            |


You can provide a generic Dockerfile that gets all this values and passes them down into kairos-init like we do under Kairos:

{{< getRemoteSource "https://raw.githubusercontent.com/kairos-io/kairos/refs/heads/master/images/Dockerfile" >}}


{{% alert title="K8s versions" color="info" %}}
When selecting a k8s provider, the produced image will contain the latest published version of that provider, the Kairos provider for kubernetes and some extra k8s utils like k9s.
If you want to override the version installed see the flag `--k8sversion`
{{% /alert %}}

## Phases

kairos-init is divided in 2 phases, one its the install phase which install all needed packages and binaries and the other is the init phase, which gets the system ready. This are the main parts of each phase:

Install:
 - Install required packages via system package manager
 - Install the Kairos binaries, like the agent or immucore
 - Install the Kairos configurations, like oem yip configs, initrd configs, etc..
 - Install the Kairos' provider, including a k8s distribution and tools if requested

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

## Skipping steps and stages

We recognize that one size does not fit all, and sometimes you may want to skip certain steps or stages during the image build process. To accommodate this, kairos-init provides the `--skip-steps` flag. 

This is useful if you want to customize the image yourself and find that some steps collide with your customization. You can choose between `install` and `init` to skip those full stages or go into specific steps.

Run `kairos-init steps-info` to see the available steps and their descriptions. You can pass more than one step, separated by comma, to skip multiple steps, for example: `--skip-steps installPackages,kernel`.


## Extending stages with custom actions

This allows to load stage extensions from a dir in the filesystem to expand the default stages with custom logic.

You can enable this feature by using the `-x` flag

The structure is as follows:

We got a base dir which is `/etc/kairos-init/stage-extensions` (this is the default, but you can override it using the `KAIROS_INIT_STAGE_EXTENSIONS_DIR` env var)

You can drop your custom [yip files](https://github.com/mudler/yip) and as usual, they will be loaded and executed in lexicographic order.

So for example, if we have:
- /etc/kairos-init/stage-extensions/10-foo.yaml
- /etc/kairos-init/stage-extensions/20-bar.yaml
- /etc/kairos-init/stage-extensions/30-baz.yaml

The files will be loaded in the following order:
- 10-foo.yaml
- 20-bar.yaml
- 30-baz.yaml

The files are loaded using the yip library, so you can use all the features of [yip](https://github.com/mudler/yip) to expand the stages.

The current stages available are:
- before-install: Good for adding extra repos and such.
- install: Good for installing packages and such.
- after-install: Do some cleanup of packages, add extra packages, add different kernels and remove the kairos default one, etc.
- before-init: Good for adding some dracut modules for example to be added to the initramfs.
- init: Anything that configures the system, security hardening for example.
- after-init: Good for rebuilding the initramfs, or adding a different initramfs like a kdump one, add grub configs or branding, etc.

So for example, if we were to add an extra repo for zfs and install the package we could do the following:

`/etc/kairos-init/stage-extensions/10-zfs.yaml`
```yaml
stages:
  after-install:
    - files:
        - path: /etc/apt/sources.list.d/zfs.list
          permissions: 0644
          owner: 0
          group: 0
          content: |
            deb http://deb.debian.org/debian bookworm-backports main contrib
            deb-src http://deb.debian.org/debian bookworm-backports main contrib
    - packages:
        install:
          - "zfs-dkms"
          - "zfsutils-linux"
        refresh: true
```

This would run the `before-install` and `install` stages as normal, but then on the `after-install` stage it would add the zfs repo and install the zfs packages.


## Validation

You can validate the image you built using the `kairos-init validate` command inside the image. This will check if the image is valid and if it has all the necessary components to run Kairos.


## Building RHEL images

Before running `kairos-init`, you need to register the system with the subscription manager and attach a subscription to it. You can do this by modifying the Dockerfile to register the system before running `kairos-init`:

```Dockerfile
FROM quay.io/kairos/kairos-init:latest AS kairos-init

FROM redhat/ubi9
RUN subscription-manager register --username <your-username> --password <your-password>
COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init
RUN rm /kairos-init
```


## Examples

All the examples are using the [kairos default dockerfile](https://github.com/kairos-io/kairos/blob/master/images/Dockerfile) as the base Dockerfile and its reproduced below:

{{< getRemoteSource "https://raw.githubusercontent.com/kairos-io/kairos/refs/heads/master/images/Dockerfile" >}}


You can see more examples in the [Kairos repo](https://github.com/kairos-io/kairos/tree/master/examples).

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
FROM quay.io/kairos/kairos-init:{{< kairosInitVersion >}} AS kairos-init

FROM ubuntu:24.04
COPY --from=kairos-init /kairos-init /kairos-init
RUN /kairos-init -l debug -s install --version "v0.0.1"
# Remove default kernel that Kairos-init installs
RUN apt-get remove -y linux-base linux-image-generic-hwe-24.04 && apt-get autoremove -y
# Install Smaller virtual kernel, useful for testing things in VMS
RUN apt-get install -y linux-image-virtual
# Run the init phase as normal, it will find the new kernel and link it + generate initrd
RUN /kairos-init -l debug -s init --version "v0.0.1"
RUN rm /kairos-init
```

```bash
$ docker build -t ubuntu-kairos-virtual:24.04 .
[+] Building 106.1s (13/13) FINISHED                                                     docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 629B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.0s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.5.0                                 0.2s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => CACHED [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.5.0@sha256:8d6a0000b6dfcf905eceeb  0.0s
 => [stage-1 1/7] FROM docker.io/library/ubuntu:24.04                                              0.0s
 => CACHED [stage-1 2/7] COPY --from=kairos-init /kairos-init /kairos-init                         0.0s
 => [stage-1 3/7] RUN /kairos-init -l debug -s install --version "v0.0.1"                         74.8s
 => [stage-1 4/7] RUN apt-get remove -y linux-base linux-image-generic-hwe-24.04 && apt-get autor  2.3s 
 => [stage-1 5/7] RUN apt-get install -y linux-image-virtual                                       8.3s 
 => [stage-1 6/7] RUN /kairos-init -l debug -s init --version "v0.0.1"                            17.9s 
 => [stage-1 7/7] RUN rm /kairos-init                                                              0.1s 
 => exporting to image                                                                             2.6s 
 => => exporting layers                                                                            2.6s 
 => => writing image sha256:94a792dad87629860094820860d68e8d0587bd758d537835d9c5ae7c476af71c       0.0s 
 => => naming to docker.io/library/ubuntu-kairos-virtual:24.04
```


## Build Trusted Boot images (core and standard)

Core:

```bash
$ docker build -t ubuntu-kairos-trusted-core:24.04 --build-arg BASE_IMAGE=ubuntu:24.04 --build-arg TRUSTED_BOOT=true --build-arg VERSION=v1.0.0 .
[+] Building 64.0s (12/12) FINISHED                                                      docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 717B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.0s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.5.0                                 0.6s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => CACHED [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.5.0@sha256:8d6a0000b6dfcf905eceeb  0.0s
 => [base-kairos 1/6] FROM docker.io/library/ubuntu:24.04                                          0.0s
 => CACHED [base-kairos 2/6] COPY --from=kairos-init /kairos-init /kairos-init                     0.0s
 => [base-kairos 3/6] RUN /kairos-init -l debug -s install -m "generic" -t "true" -k "${KUBERNET  58.3s
 => [base-kairos 4/6] RUN /kairos-init -l debug -s init -m "generic" -t "true" -k "${KUBERNETES_D  2.5s 
 => [base-kairos 5/6] RUN /kairos-init validate -t "true"                                          0.2s 
 => [base-kairos 6/6] RUN rm /kairos-init                                                          0.1s 
 => exporting to image                                                                             2.3s 
 => => exporting layers                                                                            2.3s 
 => => writing image sha256:5ca83ab1eaa4b16210e243f6f9b30e7721e2be0d55b47ae4bd178939e5a44d0f       0.0s 
 => => naming to docker.io/library/ubuntu-kairos-trusted-core:24.04                                0.0s
```

Standard, default latest k3s:

```bash
$ docker build -t ubuntu-kairos-trusted-standard:24.04 --build-arg BASE_IMAGE=ubuntu:24.04 --build-arg TRUSTED_BOOT=true --build-arg VERSION=v1.0.0 --build-arg KUBERNETES_DISTRO=k3s .
[+] Building 51.4s (12/12) FINISHED                                                      docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 717B                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:24.04                                    0.0s
 => [internal] load metadata for quay.io/kairos/kairos-init:v0.5.0                                 0.4s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => CACHED [kairos-init 1/1] FROM quay.io/kairos/kairos-init:v0.5.0@sha256:8d6a0000b6dfcf905eceeb  0.0s
 => [base-kairos 1/6] FROM docker.io/library/ubuntu:24.04                                          0.0s
 => CACHED [base-kairos 2/6] COPY --from=kairos-init /kairos-init /kairos-init                     0.0s
 => [base-kairos 3/6] RUN /kairos-init -l debug -s install -m "generic" -t "true" -k "k3s" --k8s  45.0s
 => [base-kairos 4/6] RUN /kairos-init -l debug -s init -m "generic" -t "true" -k "k3s" --k8svers  3.1s 
 => [base-kairos 5/6] RUN /kairos-init validate -t "true"                                          0.2s 
 => [base-kairos 6/6] RUN rm /kairos-init                                                          0.1s 
 => exporting to image                                                                             2.5s 
 => => exporting layers                                                                            2.5s 
 => => writing image sha256:019237bde8a0a8b5cccf328c86aa2e4090525dadc4037ab6397272454dfd5e55       0.0s 
 => => naming to docker.io/library/ubuntu-kairos-trusted-standard:24.04                            0.0s
```


Now lets build a Trusted Boot ISO from the standard image:
Note that for Trusted Boot builds we need to pass the keys dir, please refer to Trusted Boot docs for more info about this.

```bash
$ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD/e2e/assets/keys:/keys \
  -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:{{< auroraBootVersion >}} build-uki --output-dir /output/ -k /keys --output-type iso \
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

## Factory API

The Kairos Factory exposes a REST API that allows you to programmatically interact with the factory. The API documentation is available through a [ReDoc](https://github.com/Redocly/redoc) page that is served alongside the web UI.

To access the API documentation, simply visit `http://localhost:8080/redoc.html` in your browser after starting the web server. The ReDoc page provides detailed information about:

- Available API endpoints
- Request/response formats
- Example requests and responses

This documentation is automatically generated from the OpenAPI/Swagger specifications and is kept up-to-date with the latest API changes.
