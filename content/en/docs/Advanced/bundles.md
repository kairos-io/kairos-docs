---
title: "Bundles"
linkTitle: "Bundles"
weight: 5
description: Bundles are a powerful feature of Kairos that allow you to customize and configure your operating system. This section explains how to use and build custom bundles.

---

Bundles are a powerful feature of Kairos that allow you to customize and configure your operating system, as well as your Kubernetes cluster. Whether you want to add custom logic, install additional packages, or make any other changes to your system, bundles make it easy to apply these changes after installation or before bootstrapping a node.

Bundles are container images containing only files (and not full OS) that can be used to install new software or extend the cloud-init syntax. You can find community-supported bundles in the [community-bundles](https://github.com/kairos-io/community-bundles) repository.

## Consuming Bundles

To use a bundle in your Kairos configuration, you will need to specify the type of bundle and the target image in your cloud-config file.

There are two points in time when the bundles may be installed:

- Right after installation, before booting to the installed system.
- On first boot, after booting to the installed system. If you are booting a "standard" image (the one with Kubernetes), the bundle is installed before
  Kubernetes starts.

The first type of installation can be used to create [systemd-sysext extensions](https://www.freedesktop.org/software/systemd/man/devel/systemd-sysext.html).
You can read more [here](/docs/advanced/livelayering/).

The second type of installation can be used to make changes to the installed system.
E.g. create kubernetes resource files in `/var/lib/rancher/k3s/server/manifests/`
like [longhorn community bundle does](https://github.com/kairos-io/community-bundles/blob/4673a2d7002a54e42f2780c30e7185bbe976eb7e/longhorn/run.sh#L5C38-L5C76).


To apply a bundle on the first boot (and before Kubernetes starts),
you can include it in your config like this:

```yaml
#cloud-config

bundles:
- targets:
  - run://<image>
```

Replace `<image>` with the URL or path to the bundle image. The prefix (e.g. `run://`) indicates the type of bundle being used.

To install a bundle after installation instead (for bundles that are created to
be used like that), use the following:

```yaml
#cloud-config
install:
 bundles:
 - targets:
   - run://<image>
```

Bundles have access to the Kairos cloud-config during their installation.
This allows the user to add new blocks of configuration to configure the bundles.

For example, this is how `metalLB` [community bundle](https://github.com/kairos-io/community-bundles) can be configured:

```yaml
#cloud-config

hostname: kairoslab-{{ trunc 4 .MachineID }}
users:
- name: kairos
  ssh_authorized_keys:
  # Add your github user here!
  - github:mudler

k3s:
  enable: true
  args:
  - --disable=servicelb

# Specify the bundle to use
bundles:
- targets:
  - run://quay.io/kairos/community-bundles:metallb_latest

# Specify metallb settings
metallb:
  version: 0.13.7
  address_pool: 192.168.1.10-192.168.1.20
```

{{% alert title="Warning" %}}
For both types of bundle installation (after installation, on first boot),
the installation only happens once. Changing the bundle's configuration block
after Kairos installation is complete, will not have any effect.
{{% /alert %}}

If you want the installation to stop if a bundle installation fails, you can
add set the following option to `true` in your Kairos config:

```
fail_on_bundles_errors: true
```

If you want to install a bundle after installation has finished, you can use
the `kairos-agent` to perform a manual installation. E.g.:

```
kairos-agent install-bundle run://quay.io/kairos/community-bundles:cert-manager_latest
```

## Bundle types

Bundles can carry also binaries that can be overlayed in the rootfs, either while [building images]({{< relref "build" >}}) or with [Live layering]({{< relref "livelayering" >}}).

Kairos supports three types of bundles:

- **Container**: This type is a bare container that simply contains files that need to be copied to the system. It is useful for copying over configuration files, scripts, or any other static content that you want to include on your system (prefixed with `container:` or `docker:`).

- **Run**: This type is also a bare container, but it comes with a script that can be run during the installation phase to add custom logic. This is useful for performing any necessary setup or configuration tasks that need to be done before the cluster is fully deployed (prefixed with `run:`).

- **Package**: This type is a [luet](https://luet.io) package that will be installed in the system. It requires you to specify a `luet` repository in order to work. Luet packages are a powerful way to manage dependencies and install software on your system (prefixed with `luet:`).

You can also specify `local_file: true` in the bundles configuration. In that case the bundle's URL is translated as an absolute path to an image tarball on the filesystem.
This feature can be used in airgap situations, where you can pre-add bundles to the image before deployment.

For example:

```yaml
install:
  bundles:
  - targets:
    - container:///home/kairos/mybundle.tar
    local_file: true
```

The format of the bundle tarball is the one you get when you `docker save myorg/myimage` or `skopeo copy docker-daemon:myorg/myimage docker-archive:myimage.tar`

It's important to note that bundles do not have any special meaning in terms of immutability. They install files over paths that are mutable in the system, as they are simply overlaid during the boot process. This means that you can use bundles to make changes to your system at any time, even after it has been deployed.

## Create bundles

To build your own bundle, you will need to create a Dockerfile and any necessary files and scripts. A bundle is simply a container image that includes all the necessary assets to perform a specific task.

To create a bundle, you will need to define a base image and copy over any necessary files and scripts to the image. For example, you might use the following Dockerfile to create a bundle image that deploys everything inside `assets` in the Kubernetes cluster:

```Dockerfile
FROM alpine
COPY ./run.sh /
COPY ./assets /assets
```

And the associated `run.sh` that installs the assets depending on a cloud-config keyword can be:

```bash
#!/bin/bash

K3S_MANIFEST_DIR="/var/lib/rancher/k3s/server/manifests/"

mkdir -p $K3S_MANIFEST_DIR

# IF the user sets `example.enable` in the input cloud config, we install our assets
if [ "$(kairos-agent config get example.enable | tr -d '\n')" == "true" ]; then
  cp -rf assets/* $K3S_MANIFEST_DIR
fi
```

This Dockerfile creates an image based on the Alpine base image, and copies over a script file and some assets to the image. 
You can then add any additional instructions to the Dockerfile to install necessary packages, set environment variables, or perform any other tasks required by your bundle.

Once you have created your Dockerfile and any necessary script files, you can build your bundle image by running docker build and specifying the path to your Dockerfile. 

For example:

```bash
docker build -t <image> .
```

This command will build an image with the name you specify ( replace `<image>` accordingly ) based on the instructions in your Dockerfile.

After building your bundle image, you will need to push it to a registry so that it can be accessed by Kairos. You can use a public registry like Docker Hub. To push your image to a registry, use the docker push command. For example:

```bash
docker push <image>
```

This will push the `<image>` to your specified registry.

And use it with Kairos:

```yaml
#cloud-config

bundles:
- targets:
  # e.g. run://quay.io/...:tag
  - run://<image>

example:
  enable: true
```

See the [community-bundles repository](https://github.com/kairos-io/community-bundles) for further examples.
