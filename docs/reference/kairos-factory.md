---
title: "The Kairos Factory"
sidebar_label: "The Kairos Factory"
sidebar_position: 4
description: "Converting any base image into a Kairos ready image"
---

:::warning Ongoing Project
The Kairos factory is an ongoing project. Things might change, and we are working on improving the documentation and the process. If you encounter any issues, please feel free to open up issues and help us improve the Documentation!

For further info check out [#1914](https://github.com/kairos-io/kairos/issues/1914)
:::
Kairos is not just an OS, it's also a way to turn an existing OS into a Kairos-ready image. This process is called "Kairosification" and it's done by the Kairos Factory.

For the newcomer or someone who simply needs an immutable OS with k3s and edgeVPN, the Kairos OS is the way to go. As long as this components work, you don't need to worry about the changes in the underlying OS. However, if you need to ensure certain packages are present or remain stable in your system, you can use the Kairos Factory to convert your base image into a Kairos-ready image. This is particularly useful if you have special firmware requirements, or if you want to have your own release cadence.

:::info Requirements
In order to run the Kairos Factory, you will need docker installed on your system. You can find the installation instructions [here](https://docs.docker.com/get-docker/).
:::
## The Kairos Factory Process

The Kairos factory is a single step process applied on a container image. All you need to do is run [kairos-init](https://github.com/kairos-io/kairos-init) in your Dockerfile. Optionally, you can use [auroraboot.md](auroraboot.md) to generate artifacts (isos, raw images, etc..) based on the generated OCI artifact.


## What is Kairos-init?

kairos-init is a tool designed to facilitate the initialization and customization of Kairos-based images.
The primary purpose of kairos-init is to convert an existing base image into a Kairos-ready image.

kairos-init should be available to plug into your existing dockerfile and would allow you to only use docker to generate valid Kairos compatible artifacts


:::warning Platforms
Note that as we are using standard docker tools, the platform to build for is provided by docker, either by the default value or by the `--platform` setting when building images. The platform to build the Kairos OCI artifacts is based on that, so running it under an arm64 platform will build and arm64 Kairos artifact.

See the [docker multi-platform docs](https://docs.docker.com/build/building/multi-platform/) for more info.
:::
## How to use

Create a single Dockerfile:

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< kairosInitVersion >}} AS kairos-init

FROM ubuntu:24.04
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init --version "${VERSION}"
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
  quay.io/kairos/auroraboot:{{< auroraBootVersion >}} build-iso --output /output/ oci:ubuntu-kairos:24.04
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

:::warning Bind mount the binary instead of copying?
As you will see over the examples, we do not copy the kairos-init binary into the image, but rather we bind mount it from the kairos-init image. This is in order to save space due to how docker works with layers and caching. If you want to copy the binary instead, you can use the `COPY --from=kairos-init /kairos-init /kairos-init` command instead of the `RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init` command, the output will be the same but the end image will be a bit larger.
:::
## Why the Version Matters

When using kairos-init, the --version argument you set isn't just cosmetic — it defines the version metadata for the image you're building. This version is embedded into /etc/kairos-release inside the image, and it becomes critical for:

 - Upgrade management: Kairos upgrade tooling checks versions to decide when and how to upgrade systems safely.

 - Tracking changes: It helps users, automation, and debugging processes know exactly what version of a system they are running.

 - Compatibility validation: Different components, like trusted boot artifacts or upgrade servers, rely on accurate versioning to operate properly.

:::warning Important!
Kairos Factory prepares base artifacts. It's the responsibility of the derivative project or user (you!) to define and manage the versioning of your images. The only requirement is that versions must follow Semantic Versioning (semver.org) conventions to ensure upgrades and compatibility checks work predictably.
:::
Different users may adopt different strategies:

 - A project building nightly or weekly Kairos images might automatically bump the patch or minor version each time, pulling in the latest OS package updates and security fixes.

 - Another team might maintain stable, long-lived releases, only issuing a new version every six months after extensive testing, validation, and certification.

Both are perfectly valid.
What matters is that you track and manage your own version history, ensuring each new artifact has a clear and correct version that reflects its expected upgrade and compatibility behavior.

If you don't set a meaningful version when running kairos-init, you risk confusing upgrade flows, making troubleshooting harder, and potentially breaking compatibility guarantees for users and automated systems.



:::info Kairos releases
Kairos releases its own artifacts with our own cadence, as we are also consumers of kairos-init. We use the same recommendations as above for our own "vanilla" Kairos releases.
:::
## Configuration

kairos-init can generate both core and standard images, and standard images can be bundled with provider plugins (e.g. k3s, k0s) and any version of the software that you want.

It can also prepare OCI artifacts for [Trusted Boot](/docs/architecture/trustedboot/) which are slimmer than the usual ones, as they have size limitations plus we dont want to ship things like grub or dracut in them as they are useless.

:::warning Breaking change (kairos-init v0.6.0+)
The flags `-k` / `--kubernetes-provider` and `--k8sversion` were removed. Use `--provider` / `-p` and `--provider-<name>-version` instead. For example, `-k k3s --k8sversion v1.28.0` becomes `--provider k3s --provider-k3s-version v1.28.0`. In Dockerfiles, use build args `PROVIDER_NAME` and `PROVIDER_VERSION` instead of `KUBERNETES_PROVIDER` / `KUBERNETES_DISTRO` and `KUBERNETES_VERSION`.
:::
Here is a list of flags, explanation and what are the possible and default values

| Flag                       | Explanation                                                       | Possible values            | Default value   |
|----------------------------|-------------------------------------------------------------------|----------------------------|-----------------|
| -v                         | Set version of the artifact that we are building                  | Any                        | None (REQUIRED) |
| -l                         | Sets the log level                                                | info,warn,debug,trace      | info            |
| -s                         | Sets the stage to run                                             | install, init, all         | all             |
| -m                         | Sets the model                                                    | generic, rpi3, rpi4        | generic         |
| -p / --provider            | Provider plugin name (repeatable for multiple providers)          | e.g. k3s, k0s              | None            |
| --provider-&lt;NAME&gt;-version | Version for the given provider (e.g. `--provider-k3s-version`)     | Any valid provider version | None            |
| --provider-&lt;NAME&gt;-config  | Config file for the given provider (e.g. `--provider-k3s-config`)  | Path to config file        | None            |
| -t                         | Sets Trusted Boot on                                              | true,false                 | false           |
| --fips                     | Use FIPS 140-2 compliance packages for images                     | bool                       | false           |
| -x                         | Enable the loading of stage extensions                            | bool                       | false           |
| --skip-steps                | Skip the given steps during the image build                       | Steps or Stages            | None            |

When you pass `--provider k3s` (or `-p k3s`), kairos-init registers the provider and expects you to pass the version via `--provider-k3s-version` and optionally a config path via `--provider-k3s-config`. Same pattern applies for other providers (e.g. k0s).


You can provide a generic Dockerfile that gets all this values and passes them down into kairos-init like we do under Kairos:

{{< getRemoteSource "https://raw.githubusercontent.com/kairos-io/kairos/refs/heads/master/images/Dockerfile" >}}


:::info K8s versions
When selecting a provider (e.g. with `--provider k3s`), you can pin the version using `--provider-k3s-version v1.28.0` (or the appropriate `--provider-<name>-version` flag). If you omit the version, the provider plugin typically installs its default or latest. The Kairos provider for Kubernetes is included when you use a k8s provider.
:::
## Phases

kairos-init is divided in 2 phases, one its the install phase which install all needed packages and binaries and the other is the init phase, which gets the system ready. This are the main parts of each phase:

Install:
 - Install required packages via system package manager
 - Install the kernel
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

This is an example output of the stages and steps available. We recommend you run `kairos-init steps-info` to see the updated list of steps and stages available, as this is subject to change:

```dockerfile
FROM quay.io/kairos/kairos-init:{{< kairosInitVersion >}} AS kairos-init

FROM ubuntu:24.04
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init steps-info
```

```bash
2025-07-07T09:53:05Z INF [7] Starting kairos-init version 59628ad
2025-07-07T09:53:05Z INF [7] Step name & Description
2025-07-07T09:53:05Z INF [7] --------------------------------------------------------
2025-07-07T09:53:05Z INF [7] "branding": applies the branding for the system
2025-07-07T09:53:05Z INF [7] "cleanup": cleans up the system of unneeded packages and files
2025-07-07T09:53:05Z INF [7] "cloudconfigs": installs the cloud-configs for the system
2025-07-07T09:53:05Z INF [7] "grub": configures the grub bootloader
2025-07-07T09:53:05Z INF [7] "init": The full init stage, which includes kairosRelease, kubernetes, initrd, services, workarounds and cleanup steps
2025-07-07T09:53:05Z INF [7] "initramfsConfigs": configures the initramfs for the system
2025-07-07T09:53:05Z INF [7] "initrd": generates the initrd
2025-07-07T09:53:05Z INF [7] "install": The full install stage, which includes installPackages, kubernetes, cloudconfigs, branding, grub, services, kairosBinaries, providerBinaries, initramfsConfigs and miscellaneous steps
2025-07-07T09:53:05Z INF [7] "installKernel": installs the kernel packages
2025-07-07T09:53:05Z INF [7] "installPackages": installs the base system packages
2025-07-07T09:53:05Z INF [7] "kairosBinaries": installs the kairos binaries
2025-07-07T09:53:05Z INF [7] "kairosRelease": creates and fills the /etc/kairos-release file
2025-07-07T09:53:05Z INF [7] "kernel": installs the kernel
2025-07-07T09:53:05Z INF [7] "kubernetes": installs the kubernetes provider
2025-07-07T09:53:05Z INF [7] "miscellaneous": applies miscellaneous configurations
2025-07-07T09:53:05Z INF [7] "providerBinaries": installs the kairos provider binaries for k8s
2025-07-07T09:53:05Z INF [7] "services": creates and enables required services
2025-07-07T09:53:05Z INF [7] "workarounds": applies workarounds for known issues
```


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

## RHEL family notes (RHEL, CentOS, Rocky, AlmaLinux, etc.)

### Using systemd-networkd

When building RHEL family images, the default is to use NetworkManager for networking. If systemd-networkd is preferred, you should install it before running `kairos-init` and it will be used instead.

### EPEL repos

When building RHEL family images, the EPEL repository is added automatically as some required packages are only available there.
If you want to remove the repository after the build, first run the `install` stage and then remove the EPEL repository in your Dockerfile:

```bash
dnf remove epel-release
```


### Building RHEL images

Before running `kairos-init`, you need to register the system with the subscription manager and attach a subscription to it. You can do this by modifying the Dockerfile to register the system before running `kairos-init`:

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< kairosInitVersion >}} AS kairos-init

FROM redhat/ubi9
RUN subscription-manager register --username <your-username> --password <your-password>
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init
```


## Examples

All the examples are using the [kairos default dockerfile](https://github.com/kairos-io/kairos/blob/master/images/Dockerfile) as the base Dockerfile and its reproduced below:

{{< getRemoteSource "https://raw.githubusercontent.com/kairos-io/kairos/refs/heads/master/images/Dockerfile" >}}


You can see more examples in the [Kairos repo](https://github.com/kairos-io/kairos/tree/master/examples).

### Build rpi4 k3s oci artifacts (arm64 platform)

Based on Alpine 3.19:

```bash
$ docker build --platform=linux/arm64 -t alpine-rpi:3.19 --build-arg MODEL=rpi4 --build-arg BASE_IMAGE=alpine:3.19 --build-arg VERSION=v1.0.0 .
```

Based on Ubuntu 22.04:

```bash
$ docker build --platform=linux/arm64 -t ubuntu-rpi:22.04 --build-arg MODEL=rpi4 --build-arg BASE_IMAGE=ubuntu:22.04 --build-arg VERSION=v1.0.0 .
```


### Add a specific kernel to ubuntu 24.04 (amd64 platform)

```Dockerfile
FROM quay.io/kairos/kairos-init:{{< kairosInitVersion >}} AS kairos-init

FROM ubuntu:24.04
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init -l debug -s install --version "v0.0.1" --skip-steps installKernel
# Install Smaller virtual kernel, useful for testing things in VMS
RUN apt-get install -y linux-image-virtual
# Run the init phase as normal, it will find the new kernel and link it + generate initrd
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init -l debug -s init --version "v0.0.1"
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

Core (no Kubernetes provider):

```bash
$ docker build -t ubuntu-kairos-trusted-core:24.04 --build-arg BASE_IMAGE=ubuntu:24.04 --build-arg TRUSTED_BOOT=true --build-arg VERSION=v1.0.0 .
```

The Dockerfile runs kairos-init without `--provider`, so the image stays core (no k8s).

Standard with k3s: use `PROVIDER_NAME` and optionally `PROVIDER_VERSION` build args. The Dockerfile should invoke kairos-init with `--provider "${PROVIDER_NAME}"` and `--provider-"${PROVIDER_NAME}"-version "${PROVIDER_VERSION}"` (e.g. `--provider k3s --provider-k3s-version v1.28.0`). Omit `PROVIDER_VERSION` to use the provider’s default/latest.

```bash
$ docker build -t ubuntu-kairos-trusted-standard:24.04 --build-arg BASE_IMAGE=ubuntu:24.04 --build-arg TRUSTED_BOOT=true --build-arg VERSION=v1.0.0 --build-arg PROVIDER_NAME=k3s --build-arg PROVIDER_VERSION=v1.28.0 .
```

Now lets build a Trusted Boot ISO from the standard image:
Note that for Trusted Boot builds we need to pass the keys dir, please refer to Trusted Boot docs for more info about this.

```bash
$ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD/e2e/assets/keys:/keys \
  -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:{{< auroraBootVersion >}} build-uki --output-dir /output/ -k /keys --output-type iso \
  oci:ubuntu-kairos-trusted-standard:24.04                       
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

## GitHub Actions Integration

For users who prefer to automate their Kairos image builds using GitHub Actions, the [Kairos Factory Action](https://github.com/kairos-io/kairos-factory-action) provides a reusable workflow that simplifies the build process.

### What is the Kairos Factory Action?

The Kairos Factory Action is a GitHub Actions reusable workflow that automates the entire Kairos image building process. It handles:

- **Multi-platform builds**: Support for `amd64` and `arm64` architectures
- **Multiple base images**: Ubuntu, OpenSUSE, and other distributions
- **Kubernetes integration**: Built-in support for K3s and K0s distributions
- **Artifact generation**: Create ISO and RAW disk images
- **Security scanning**: Integrated Grype and Trivy vulnerability scanning
- **Digital signing**: Cosign integration for artifact signing
- **Trusted boot**: Support for UKI/USI (Unified Kernel/System Image) builds
- **Registry publishing**: Push to any container registry

### Basic Usage Example

```yaml
jobs:
  build:
    uses: kairos-io/kairos-factory-action/.github/workflows/reusable-factory.yaml@main
    with:
      version: "v1.0.0"
      base_image: "ubuntu:24.04"
      model: "generic"
      kubernetes_distro: "k3s"
      iso: true
      summary_artifacts: true
```

This example builds a Kairos image based on Ubuntu 24.04 with K3s, generates an ISO artifact, and provides a rich build summary with artifact links.

### Key Features

- **Flexible versioning**: Automatic git-based versioning or manual semver
- **Security-focused**: Optional vulnerability scanning and digital signing
- **Custom naming**: Flexible tag and artifact naming formats
- **Cloud config support**: Integration with cloud-init configurations
- **GitHub integration**: Rich build summaries and optional release creation

For complete documentation, configuration options, and advanced examples, visit the [Kairos Factory Action repository](https://github.com/kairos-io/kairos-factory-action).

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
