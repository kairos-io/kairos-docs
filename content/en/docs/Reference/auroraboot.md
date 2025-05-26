---
title: "AuroraBoot"
linkTitle: "AuroraBoot"
weight: 1
description: Reference documentation for AuroraBoot, a tool for generating bootable images
---

{{% alert title="Note" color="info" %}}
This is the reference documentation for AuroraBoot. For a complete guide on creating custom cloud images, including how to use AuroraBoot in the context of a full workflow, see [Creating Custom Cloud Images]({{< ref "/docs/advanced/creating_custom_cloud_images" >}}).
{{% /alert %}}

**AuroraBoot** is a tool designed to make the process of bootstrapping Kairos machines quick, simple and efficient. It is specifically designed for the Kairos operating system and provides a comprehensive solution for downloading required artifacts and provisioning a machine, both from network or manually via flashing to USB stick. 

With AuroraBoot, you can prepare the environment for network-based bootstrapping, download the necessary release assets, and also customize the installation media for USB-based mass-installations. Whether you're looking to install Kairos on a single machine or multiple machines, AuroraBoot makes it easy and efficient. 

AuroraBoot can be useful to:

- prepare multiple-nodes in a lab before shipment
- offer a simple, intuitive and streamlined way to deploy Kairos automatically and manually
- deploy Kairos nodes in a network segment where we can already send workload to (running AuroraBoot in an already-existing downstream cluster)
- build artifacts of any type (isos, Trusted Boot, container upgrades, raw images, cloud images)

![AuroraBoot](https://user-images.githubusercontent.com/2420543/217617696-f993a8e3-55ac-4d3e-98f0-c2317cb54cb9.png)

## Scope

**AuroraBoot** has the following scope:

- **Download** release assets in order to provision one or more machines
- **Prepare** automatically the environment to boot from network
- **Provision** machines from network with a version of Kairos and cloud config
- **Customize** The installation media for installations from USB

## Prerequisites

- `docker` or a container engine of your choice

For netbooting:

- Port `8090`, `8080` and `67` free on the host running AuroraBoot
- The machine running AuroraBoot have to be on the same network segment of the nodes to be bootstrapped
- The nodes need to be configured to boot over network, or be capable of booting via USB for offline mode
- `ProxyDHCP` supported by the `DHCP` network attempting to netboot (see also [pixiecore architecture](https://github.com/danderson/netboot/blob/master/pixiecore/README.booting.md#step-1-dhcpproxydhcp)).
   There should be an already running `DHCP` server on your network. AuroraBoot doesn't take over the `DHCP` server, neither require you to do any specific configuration, however a `DHCP` server which is compliant to `ProxyDHCP` requests should be present in the same network running **AuroraBoot** and the machines to boot.

## MacOS

Unfortunately for macOS systems we cannot run the netboot through docker as it's run inside a VM, as it can't see the host network.
Building ISOs still works as long as you mount the container `/tmp` disk to a local dir so its exported there like so:

```bash
docker run --rm -ti -v "$PWD"/config.yaml:/config.yaml -v ${PWD}:/tmp quay.io/kairos/auroraboot \ 
                    --set "artifact_version={{< kairosVersion >}}" \
                    --set "release_version={{< kairosVersion >}}" \
                    --set "flavor=@flavor" \
                    --set "flavor_release=@flavorRelease" \
                    --set "repository=kairos-io/kairos" \
                    --set "disable_http_server=true" \
                    --set "disable_netboot=true" \
                    --cloud-config /config.yaml
```

This will build the ISO and put the generated artifacts in the current dir under the `${PWD}/iso` dir.

For netboot, we recommend that you run the AuroraBoot binary directly by grabbing it from the [releases page](https://github.com/kairos-io/AuroraBoot/releases).
This requires just one dependency that you can install via [brew](https://brew.sh/) with `brew install xorriso`

## Windows

Netboot in windows is not supported, only iso creation via the docker image.


## Overview

To run AuroraBoot, simply use `docker` or the container engine of your choice (such as `podman`, ...). AuroraBoot images are published in [quay](https://quay.io/repository/kairos/auroraboot) and the source code is available [in GitHub](https://github.com/kairos-io/AuroraBoot).

The basic usage of AuroraBoot involves passing it several parameters that define the installation environment, such as the version of Kairos you want to install, the cloud config you want to use, and other customizations you may need. You can pass these parameters either as command-line arguments, or as a full YAML configuration file.

AuroraBoot will download the artifacts required for bootstrapping the nodes, and prepare the environment required for a zero-touch deployment.

For example, to netboot a machine with the latest version of Kairos and {{<flavorCode >}} using a cloud config, you would run the following command:

```bash
docker run --rm -ti --net host quay.io/kairos/auroraboot \
                    --set "artifact_version={{< kairosVersion >}}" \
                    --set "release_version={{< kairosVersion >}}" \
                    --set "flavor=@flavor" \
                    --set repository="kairos-io/kairos" \
                    --cloud-config https://...
```

This command will download the necessary artifacts and start the provisioning process. The machine will attempt to boot from network, and will be configured with the specified version of Kairos.

### Network-based bootstrapping

By default AuroraBoot will automatically attempt to bootstrap other machines, which are configured to boot from network, within the same network. No further configuration or settings necessary.

There are only 3 steps involved in the process:

1. Select the release of Kairos that you want to deploy and optionally a cloud config (see also our [examples]({{< relref "../examples" >}}))
1. Run AuroraBoot in your workstation with the appropriate CLI args
1. Boot up other nodes, already configured to boot from network

#### 1. Selecting a release

AuroraBoot can bootstrap container images or released assets from our GitHub release process. 

To use GitHub releases set a release version with `--set release_version` (the GitHub release), an artifact version with `--set artifact_version` (the artifact version) a flavor with `--set flavor` and a repository with `--set repository`.
Kairos has releases with (standard) and without (core) k3s both can be downloaded in the [release page at kairos](https://github.com/kairos-io/kairos/releases).

To use a container image, you can use [the Kairos released images]({{< relref "../reference/image_matrix" >}}) or [customized]({{< relref "../advanced/customizing" >}}) by specifying `--set container_image` instead with the container image of choice.

#### 2. Run AuroraBoot

Now we can run AuroraBoot with the version we selected, either from GitHub releases or directly from a container image.

In the example below we selected `{{< kairosVersion >}}-{{< k3sVersion >}}`, {{<flavorCode >}} flavor, so we would run either one of the following:

{{< tabpane text=true  >}}
{{% tab header="Container image" %}}

By indicating a `container_image`, AuroraBoot will pull the image locally and start to serve it for network booting.

You can use [the Kairos released images]({{< relref "../reference/image_matrix" >}}) or [your own]({{< relref "../advanced/customizing" >}}).

```bash
docker run --rm -ti --net host quay.io/kairos/auroraboot \
                    --set "container_image={{<oci variant="standard">}}"
```

{{% /tab %}}
{{% tab header="Container Image, with dockerd" %}}

By indicating a `container_image` prefixed with `docker://`, AuroraBoot will pull the image from the local daemon and start to serve it for network booting.

This implies that the host has a docker daemon, and we have to give access to its socket with `-v /var/run/docker.sock:/var/run/docker.sock`.

```bash
docker pull {{<oci variant="standard">}}
# This will use the container image from the host's docker daemon
docker run --rm -ti -v /var/run/docker.sock:/var/run/docker.sock --net host quay.io/kairos/auroraboot \
                    --set "container_image=docker://{{<oci variant="standard">}}"
```
{{% /tab %}}
{{% tab header="Github releases" %}}

By indicating a `artifact_version`, a `release_version`, a `flavor` and a `repository`, AuroraBoot will use GitHub released assets.

```bash
docker run --rm -ti --net host quay.io/kairos/auroraboot \
                    --set "artifact_version={{< kairosVersion >}}-{{< k3sVersionOCI >}}" \
                    --set "release_version={{< kairosVersion >}}" \
                    --set "flavor=@flavor" \
                    --set "flavor_release=@flavorRelease" \
                    --set "repository=kairos-io/provider-kairos"
```
{{% /tab %}}
{{< /tabpane >}}

To specify a cloud config, you can set it with `--cloud-config`. See the sections below for further examples.

#### 3. Start nodes

Generic hardware based netbooting is out of scope for this document. 

Nodes need to be configured to boot over network, and after AuroraBoot is started should be ready to accept a connection, a typical output of a successfull run is:

```bash                                                                                                                                                                      
2023/02/08 14:27:30 DHCP: Offering to boot 08:00:27:54:1a:d1
2023/02/08 14:27:30 TFTP: Sent "08:00:27:54:1a:d1/4" to 192.168.68.113:6489
2023/02/08 14:27:36 DHCP: Offering to boot 08:00:27:54:1a:d1
2023/02/08 14:27:36 HTTP: Sending ipxe boot script to 192.168.68.113:45435                               
2023/02/08 14:27:36 HTTP: Sent file "kernel" to 192.168.68.113:45435                                     
2023/02/08 14:27:36 HTTP: Sent file "initrd-0" to 192.168.68.113:45435
2023/02/08 14:27:49 HTTP: Sent file "other-0" to 192.168.68.113:43044 
```

If trying on a VM, for instance on VirtualBox or QEMU, a typical setup might be:

- Set Netboot as first boot in the boot process order

![Screenshot from 2023-02-08 10-37-59](https://user-images.githubusercontent.com/2420543/217587463-cd293842-575e-4484-aee5-de46c4f053fb.png)

- Use bridge networking with the host (if running AuroraBoot and the VM in the same host)

![Screenshot from 2023-02-08 10-38-05](https://user-images.githubusercontent.com/2420543/217587465-35486742-26a1-4971-bee0-3049d9ec329a.png)

### USB-based bootstrapping

AuroraBoot by default prepares an ISO with the custom cloud init prepared for being flashed to an USB stick either with `dd` or with [BalenaEtcher](https://www.balena.io/etcher).

To disable netboot and provide only offline artifacts, run `auroraboot` with `--set disable_netboot=true`.

#### 1. Node configuration

Create a cloud config file, see [our documentation]({{< relref "../examples" >}}) for ready-to use examples, but a minimal configuration that automatically installs, and allows us to login afterward can be the following:

```yaml
#cloud-config

install:
  auto: true
  device: "auto"
  reboot: true

# Define the user accounts on the node.
users:
- name: "kairos"                       # The username for the user.
  passwd: "kairos"                      # The password for the user.
  ssh_authorized_keys:                  # A list of SSH keys to add to the user's authorized keys.
  # - github:mudler                       # A key from the user's GitHub account.
  # - "ssh-rsa AAA..."                    # A raw SSH key.
```

Save the file locally or remotely, you can pass it by in the arguments with `--cloud-config` to AuroraBoot. Note that can also be a remote http(s) path.

#### 2. Create an offline ISO

Run AuroraBoot with a cloud-config to create an ISO with the embedded configuration:

{{< tabpane text=true  >}}
{{% tab header="Container image" %}}

Check we have the cloud config file:
```bash
ls 
# config.yaml
```

Build the ISO:
```bash
docker run -v "$PWD"/config.yaml:/config.yaml \
                    -v "$PWD"/build:/tmp/auroraboot \
                    --rm -ti quay.io/kairos/auroraboot \
                    --set container_image={{<oci variant="core">}} \
                    --set "disable_http_server=true" \
                    --set "disable_netboot=true" \
                    --cloud-config /config.yaml \
                    --set "state_dir=/tmp/auroraboot"
```

Results should be available under `build/` in the current directory:
```bash
sudo ls -liah build/iso
#
# total 778M
# 34648528 drwx------ 2 root root 4.0K Feb  8 16:39 .
# 34648526 drwxr-xr-x 5 root root 4.0K Feb  8 16:38 ..
# 34648529 -rw-r--r-- 1 root root  253 Feb  8 16:38 config.yaml
# 34649370 -rw-r--r-- 1 root root 389M Feb  8 16:38 kairos.iso
# 34649372 -rw-r--r-- 1 root root 389M Feb  8 16:39 kairos.iso.custom.iso
# 34649371 -rw-r--r-- 1 root root   76 Feb  8 16:39 kairos.iso.sha256
```
{{% /tab %}}
{{% tab header="Github releases" %}}

Check we have the cloud config file:
```bash
ls 
# config.yaml
```

Build the ISO:
```bash
docker run -v "$PWD"/build:/tmp/auroraboot -v /var/run/docker.sock:/var/run/docker.sock --rm -ti quay.io/kairos/auroraboot \
                    --set "artifact_version={{< kairosVersion >}}-{{< k3sVersionOCI >}}" \
                    --set "release_version={{< kairosVersion >}}" \
                    --set "flavor=@flavor" \
                    --set "flavor_release=@flavorRelease" \
                    --set "repository=kairos-io/provider-kairos" \
                    --set "disable_http_server=true" \
                    --set "disable_netboot=true" \
                    --cloud-config /config.yaml \
                    --set "state_dir=/tmp/auroraboot"
```

Results should be available under `build/` in the current directory:

```bash
sudo ls -liah build/iso
#
# total 778M
# 34648528 drwx------ 2 root root 4.0K Feb  8 16:39 .
# 34648526 drwxr-xr-x 5 root root 4.0K Feb  8 16:38 ..
# 34648529 -rw-r--r-- 1 root root  253 Feb  8 16:38 config.yaml
# 34649370 -rw-r--r-- 1 root root 389M Feb  8 16:38 kairos.iso
# 34649372 -rw-r--r-- 1 root root 389M Feb  8 16:39 kairos.iso.custom.iso
# 34649371 -rw-r--r-- 1 root root   76 Feb  8 16:39 kairos.iso.sha256
```

{{% /tab %}}
{{< /tabpane >}}


The result process will write an iso `kairos.iso.custom.iso` under `build/iso`. That is the iso with our embedded cloud-config.

#### 2. Run the image

The iso now is ready to be written to USB stick with either `dd` or with [BalenaEtcher](https://www.balena.io/etcher), or attached to a VM.

{{< tabpane text=true right=true >}}
  {{% tab header="**Machine**:" disabled=true /%}}
  {{% tab header="Bare-Metal" %}}

  When deploying on a bare metal server, directly flash the image into a USB stick. There are multiple ways to do this:

  **From the command line using the `dd` command**

  ```bash
  dd if=build/kairos.iso.custom.iso of=/path/to/dev bs=4MB
  ```

  or with [BalenaEtcher](https://www.balena.io/etcher).

  {{% /tab %}}
  {{< tab header="QEMU" >}}
    {{% alert title="Warning" color="warning" %}}
    Make sure you have KVM enabled, this will improve the performance of your VM significantly!
    {{% /alert %}}

    This would be the way to start it via the command line, but you can also use the GUI

    {{< highlight bash >}}
      virt-install --name my-first-kairos-vm \
                  --vcpus 1 \
                  --memory 1024 \
                  --cdrom build/kairos.iso.custom.iso \
                  --disk size=30 \
                  --os-variant opensuse-factory \
                  --virt-type kvm

    {{< / highlight >}}
    Immediately after open a viewer so you can interact with the boot menu:
    {{< highlight bash >}}
    virt-viewer my-first-kairos-vm
    {{< / highlight >}}

  {{% /tab %}}
{{< /tabpane >}}

## Configuration

The AuroraBoot configuration file reference is the following:

```yaml
# Corresponding artifact versions from the kairos release page (e.g. kubernetes version included)
artifact_version: "v..."
# Version of the release in github
release_version: "{{< kairosVersion >}}"

# Flavor
flavor: "@flavor"

# Github repository
repository: "kairos-io/kairos"

# Container image (takes over)
container_image: "..."

# Disable netboot
disable_netboot: true

# Disable http server for serving offline generated ISOs
disable_http_server: true

# Specify a directory that will be used by auroraboot to download artifacts
# Reuse the same to cache artifacts.
state_dir: "/tmp/auroraboot"

# Default http binding port for offline ISO generation
listen_addr: ":8080"

# Cloud config to use when booting the machine.
cloud_config: |
```

| Option                | Description                                                                                                                                                                                                                                                       |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `artifact_version`    | Corresponding artifact versions from the Kairos release page (e.g. Kubernetes version included).                                                                                                                                                                  |
| `release_version`     | Version of the release in GitHub.                                                                                                                                                                                                                                 |
| `flavor`              | The Kairos flavor to use. See [the Kairos support matrix]({{< relref "../reference/image_matrix" >}}) for a list.                                                                                                                                                 |
| `repository`          | Github repository to use. This can either be `kairos-io/kairos` or `kairos-io/provider-kairos` for images with `k3s` prior to v2.4.0.                                                                                                                             |
| `container_image`     | Container image. If prefixed with `docker://` it will try to pull from the local docker daemon. If a `container_image` is specified, `artifact_version`, `flavor` and `release_version` are ignored.                                                              |
| `disable_netboot`     | Disable netboot.                                                                                                                                                                                                                                                  |
| `disable_http_server` | Disable http server for serving offline generated ISOs.                                                                                                                                                                                                           |
| `netboot_http_port`   | Specify a netboot HTTP port (defaults to `8090`).                                                                                                                                                                                                                 |
| `state_dir`           | Specify a directory that will be used by auroraboot to download artifacts and reuse the same to cache artifacts.                                                                                                                                                  |
| `listen_addr`         | Default http binding port for offline ISO generation.                                                                                                                                                                                                             |
| `cloud_config`        | Cloud config path to use for the machines. A URL can be specified, use `-` to pass-by the cloud-config from _STDIN_                                                                                                                                               |
| `iso.data`            | Defines a path to be embedded into the resulting iso. When booting, the files will be accessible at `/run/initramfs/live`                                                                                                                                         |
| `netboot.cmdline`     | Override the automatically generated cmdline with a custom one to use during netboot. `config_url` and `rootfs`  are automatically constructed. A reasonable value can be `netboot.cmdline=rd.neednet=1 ip=dhcp rd.cos.disable netboot install-mode console=tty0` |
| `disk.state_size`     | Set the minimum size (in MB) for the state partition in raw disk images. By default, the state partition is sized to 3 times the size of the current image plus some additional space for system files. Use this option to override the default size if you need to accommodate larger future images. |
| `disk.efi`            | Generate an EFI-compatible raw disk image (suitable for AWS and QEMU). When set to `true`, the image will be created with EFI boot support. |
| `disk.size`           | Set the final size (in MB) of the generated disk image. By default, the image size is calculated based on the actual data size. Use this option to create a larger disk image (e.g. `disk.size=16000` will create a 16GB image). |
| `disk.bios`           | Generate a BIOS-compatible raw disk image. When set to `true`, the image will be created with legacy BIOS boot support instead of EFI. |
| `disk.vhd`            | Generate an Azure-compatible VHD image. When set to `true`, the image will be created in VHD format suitable for Azure cloud platform. |
| `disk.gce`            | Generate a Google Cloud Engine (GCE) compatible image. When set to `true`, the image will be created in a format suitable for Google Cloud Platform. |
To use the configuration file with AuroraBoot, run AuroraBoot specifying the file or URL of the config as first argument:

```bash
docker run --rm -ti -v "$PWD"/config.yaml:/config.yaml --net host quay.io/kairos/auroraboot /config.yaml
```

The CLI options can be used in place of specifying a file, and to set fields of it. Any field of the YAML file, excluding `cloud_config` can be configured with the `--set` for instance, to disable netboot we can run AuroraBoot with:

```bash
docker run --rm -ti --net host quay.io/kairos/auroraboot ....  --set "disable_netboot=true"
```

To specify a cloud config file instead, use `--cloud-config` (can be also url):

```bash
docker run --rm -ti -v "$PWD"/config.yaml:/config.yaml --net host quay.io/kairos/auroraboot .... --cloud-config /config.yaml
```

Both the config file and the cloud-config file can be a URL.

### Cloud config

A custom cloud configuration file can be passed either with the `--cloud-config` flag, or in the AuroraBoot configuration file under the `cloud_config` key.

It is possible to apply templating to a cloud config. Indeed any value passed to `--set` is accessible as a template in the cloud config file with the `[[` and `]]` delimiter, for instance consider the following cloud config file, which allows to set a password for the `kairos` user and a GitHub handle allowed to login to the machine:

```yaml
#cloud-config

install:
  auto: true
  device: "auto"
  reboot: true

# Define the user accounts on the node.
users:
- name: "kairos"                       # The username for the user.
  passwd: "[[.kairos.password]]"                      # The password for the user.
  ssh_authorized_keys:                  # A list of SSH keys to add to the user's authorized keys.
  - github:[[.github.user]]
```

We would then set the user to `mudler` and the password to `foobar` when running AuroraBoot like the following:

```bash
docker run --rm -ti -v "$PWD"/config.yaml:/config.yaml --net host \
                                quay.io/kairos/auroraboot \
                                --cloud-config /config.yaml \
                                --set "github.user=mudler" \
                                --set "kairos.password=foobar"
```

Config files can be also hosted remotely, and given as URLs to AuroraBoot.

We can indeed use the template in the example folder with the command above:

```bash
docker run --rm -ti --net host \
                        quay.io/kairos/auroraboot \
                        --cloud-config https://raw.githubusercontent.com/kairos-io/kairos/master/examples/auroraboot/master-template.yaml \
                        --set "github.user=mudler" \
                        --set "kairos.password=foobar"
```

To pass-by a cloud-config via pipes, set `--cloud-config -`, for example:

```yaml
cat <<EOF | docker run --rm -i --net host quay.io/kairos/auroraboot \
                    --cloud-config - \
                    --set "container_image={{<oci variant="standard">}}"
#cloud-config

install:
 device: "auto"
 auto: true
 reboot: true

hostname: metal-bundle-test-{{ trunc 4 .MachineID }}

users:
- name: kairos
  # Change to your pass here
  passwd: kairos
  groups:
  - admin
  ssh_authorized_keys:
  # Replace with your github user and un-comment the line below:
  - github:mudler

k3s:
  enabled: true

# Specify the bundle to use
bundles:
- targets:
  - run://quay.io/kairos/community-bundles:system-upgrade-controller_latest
  - run://quay.io/kairos/community-bundles:cert-manager_latest
  - run://quay.io/kairos/community-bundles:kairos_latest

kairos:
  entangle:
    enable: true
EOF
```

## Examples

{{% alert title="Note" color="success" %}}
The example below are implying a `config.yaml` cloud config file to be present in the current directory. 
{{% /alert %}}

### Offline ISO build from local container image 

First make sure we have the image locally with:

```bash
docker pull <IMAGE>
```

Build the custom ISO with the cloud config:

```bash
docker run -v "$PWD"/config.yaml:/config.yaml \
             -v "$PWD"/build:/tmp/auroraboot \
             -v /var/run/docker.sock:/var/run/docker.sock \
             --rm -ti quay.io/kairos/auroraboot \
             --set container_image=docker://<IMAGE> \
             --set "disable_http_server=true" \
             --set "disable_netboot=true" \
             --cloud-config /config.yaml \
             --set "state_dir=/tmp/auroraboot"
```

### Offline ISO build from container images

Build the custom ISO with the cloud config:

```bash
docker run -v "$PWD"/config.yaml:/config.yaml \
             -v "$PWD"/build:/tmp/auroraboot \
             --rm -ti quay.io/kairos/auroraboot \
             --set container_image={{<oci variant="core">}} \
             --set "disable_http_server=true" \
             --set "disable_netboot=true" \
             --cloud-config /config.yaml \
             --set "state_dir=/tmp/auroraboot"
```

### Override GRUB config file

It is possible to override the default GRUB config file of the ISO by creating a directory that
contains the files that we want to add or replace in it.

For example, to override the GRUB config file:

```bash
mkdir -p data/boot/grub2
# You can replace this step with your own grub config. This GRUB configuration is the boot menu of the ISO
wget https://raw.githubusercontent.com/kairos-io/packages/main/packages/livecd/grub2/config/grub_live_bios.cfg -O data/boot/grub2/grub.cfg

docker run -v "$PWD"/config.yaml:/config.yaml \
             -v "$PWD"/data:/tmp/data \
             -v "$PWD"/build:/tmp/auroraboot \
             --rm -ti quay.io/kairos/auroraboot \
             --set container_image={{<oci variant="core">}} \
             --set "disable_http_server=true" \
             --set "disable_netboot=true" \
             --cloud-config /config.yaml \
             --set "state_dir=/tmp/auroraboot" \
             --set "iso.data=/tmp/data"
```

### Prepare ISO for Airgap installations

See the [Airgap example]({{< relref "../examples/airgap" >}}) in the [examples section]({{< relref "../examples" >}}).

### Netboot with core images from Github releases

```bash
docker run -v "$PWD"/config.yaml:/config.yaml --rm -ti --net host quay.io/kairos/auroraboot \
        --set "artifact_version={{< kairosVersion >}}" \
        --set "release_version={{< kairosVersion >}}" \
        --set "flavor=@flavor" \
        --set repository="kairos-io/kairos" \
        --cloud-config /config.yaml
```

### Netboot with k3s images from Github releases

```bash
docker run -v "$PWD"/config.yaml:/config.yaml --rm -ti --net host quay.io/kairos/auroraboot \
        --set "artifact_version={{< kairosVersion >}}-{{< k3sVersionOCI >}}" \
        --set "release_version={{< kairosVersion >}}" \
        --set "flavor=@flavor" \
        --set "flavor_release=@flavorRelease" \
        --set "repository=kairos-io/provider-kairos" \
        --cloud-config /config.yaml
```

### Netboot from container images

```bash
docker run -v "$PWD"/config.yaml:/config.yaml --rm -ti --net host quay.io/kairos/auroraboot \
        --set container_image={{<oci variant="core">}}
        --cloud-config /config.yaml
```

### Generate RAW disk images

AuroraBoot can generate raw disk images (BIOS/EFI) that can be used as cloud images (for example as AWS AMI images) or QEMU.

{{% alert title="Note" color="success" %}}
This method differs from the ones documented in the [Build raw images with QEMU]({{< ref "/docs/Reference/build_raw_images_with_qemu" >}}). The raw disk images created with AuroraBoot don't run any installation steps and are ready to use. If you need to run installation steps in order to customize your installation flow, please use the [QEMU example]({{< ref "/docs/Reference/build_raw_images_with_qemu" >}}).
{{% /alert %}}

Consider the following example:

```bash
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD:/aurora --rm -ti quay.io/kairos/auroraboot \
  --debug \
  --set "disable_http_server=true" \
  --set "disable_netboot=true" \
  --set "disk.efi=true" \
  --set "container_image={{<oci variant="standard">}}" \
  --set "state_dir=/aurora"
```

The raw disk image will be available in the current directory with the `.raw` image extension. By default, the state partition will be sized to 3 times the size of the current image plus some additional space for system files.

If you need to ensure the state partition can accommodate larger future images, you can override the default size with `disk.state_size`:

```bash
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD:/aurora --rm -ti quay.io/kairos/auroraboot \
  --debug \
  --set "disable_http_server=true" \
  --set "disable_netboot=true" \
  --set "disk.efi=true" \
  --set "disk.state_size=6000" \
  --set "container_image={{<oci variant="standard">}}" \
  --set "state_dir=/aurora"
```

To generate a BIOS raw image just change `disk.efi=true` for `disk.bios=true`

To generate GCE and VHD images set `disk.gce=true` or `disk.vhd=true` respectively in the AuroraBoot command. For example:

```bash
# Build a GCE-compatible image
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD:/aurora --rm -ti quay.io/kairos/auroraboot \
  --debug \
  --set "disable_http_server=true" \
  --set "container_image={{<oci variant="standard">}}" \
  --set "disable_netboot=true" \
  --cloud-config /aurora/config.yaml \
  --set "disk.gce=true" \
  --set "state_dir=/aurora"
```

or for VHD images:

```bash
# Build a VHD image compatible with Azure
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD:/aurora --rm -ti quay.io/kairos/auroraboot \
  --debug \
  --set "disable_http_server=true" \
  --set "container_image={{<oci variant="standard">}}" \
  --set "disable_netboot=true" \
  --cloud-config /aurora/config.yaml \
  --set "disk.vhd=true" \
  --set "state_dir=/aurora"
```


{{% alert title="Note" color="warning" %}}
Note that for creating raw images, the `--privileged` flag is used as the process creates loop devices, which
 requires elevated privileges. This is not needed for the other methods of using AuroraBoot.
{{% /alert %}}

### Use the config file

Write down an aurora config file as `aurora.yaml`:

```yaml
container_image: "{{<oci variant="core">}}"

cloud_config: |
    #cloud-config

    install:
    auto: true
    device: "auto"
    reboot: true

    # Define the user accounts on the node.
    users:
    - name: "kairos"                       # The username for the user.
    passwd: "kairos"                      # The password for the user.
    ssh_authorized_keys:                  # A list of SSH keys to add to the user's authorized keys.
    # - github:mudler                       # A key from the user's GitHub account.
    # - "ssh-rsa AAA..."                    # A raw SSH key.
```

And then run:

```bash
docker run -v "$PWD"/aurora.yaml:/aurora.yaml --rm -ti --net host quay.io/kairos/auroraboot /aurora.yaml
```


## Booting with UKI and Secure Boot via EFI Key Enrollment

AuroraBoot now supports booting **Unified Kernel Images (UKI)** with **Secure Boot**. This process relies on enrolling platform keys at boot time via a helper binary (`efi-key-enroller`) and involves a two-stage PXE boot process. This feature is useful for environments enforcing Secure Boot, allowing boot and installation of Kairos from a signed UKI ISO.

> **Note**: Currently, only PXE boot has been tested and validated for this setup. HTTP boot support exists but has not been thoroughly tested.

<p align="center">
  <img src="/images/uki-secure-boot-flow.png" alt="PXE UKI Secure Boot Flow" style="max-width: 50%; height: auto;">
  <br>
  <em>PXE UKI Workflow</em>
</p>

## How it Works

### Stage 1: PXE Boot and Key Enrollment

1. The machine boots via PXE and executes `efi-key-enroller`.
2. The enroller:
    - Enrolls the provided `PK`, `KEK`, and `db` EFI keys (in `.auth` format).
    - Creates an EFI boot entry pointing to the Kairos UKI ISO.
    - Sets two EFI variables:
        - One marking this as a PXE boot (`kairos.pxe=1`).
        - One storing the ISO URL for use by the agent.

3. The machine reboots and boots into the UKI ISO.

### Stage 2: Kairos Agent Installation

4. The system boots fully from the UKI ISO into memory.
5. The Kairos agent:
    - Reads the EFI variables to detect PXE context.
    - Re-downloads the ISO to perform the installation.
    - Upon success, it cleans up:
        - Removes the temporary EFI variables.
        - Deletes the EFI boot entry.

> ⚠️ **Memory Requirements**: The ISO is downloaded **twice** (once for booting, once for installation). Ensure sufficient memory is available to hold the ISO and run Kairos from memory simultaneously.

---

## Preparing the Boot Environment

You must provide:

- A **UKI-formatted Kairos ISO**
- A directory of EFI keys (`PK`, `KEK`, `db`) in `.auth` format

Example directory structure:

```text
keys/
├── db.auth
├── kek.auth
└── pk.auth
```

Start AuroraBoot with:

```bash
uki-pxe --key-dir $KEY_DIR --iso-file $TRUSTED_BOOT_ISO
```

This serves both the `efi-key-enroller` and the ISO over HTTP.

---

## Resources

- [kairos-agent PR #791](https://github.com/kairos-io/kairos-agent/pull/791)
- [AuroraBoot PR #276](https://github.com/kairos-io/AuroraBoot/pull/276)
- [efi-key-enroller repo](https://github.com/kairos-io/efi-key-enroller)