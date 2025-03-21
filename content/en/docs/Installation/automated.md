---
title: "Automated"
linkTitle: "Automated"
weight: 3
date: 2022-11-13
description: Install Kairos automatically, with zero touch provisioning
---

To automate Kairos installation, you can configure a specific portion of the installation configuration file. The configuration file can then be supplied in a few different ways, such as creating an additional ISO to mount, specifying a URL, or even creating an ISO from a container image with an embedded configuration file.

Here's an example of how you might customize the install block:

```yaml
install:
  # Device for automated installs
  device: "/dev/sda"
  # Reboot after installation
  reboot: true
  # Power off after installation
  poweroff: true
  # Set to true to enable automated installations
  auto: true
  # A list of bundles
  bundles:
    -  quay.io/kairos/packages:k9s-utils-0.26.7
```

This block allows you to specify the device on which to install Kairos, whether to reboot or power off after installation, and which bundles to include.

## Data source

To supply your Kairos configuration file, you can create an ISO that contains both a user-data file (which contains your configuration) and a meta-data file.

Here's an example `user-data` configuration that is set up to automatically install Kairos onto /dev/sda and reboot after installation:

```yaml
#cloud-config

install:
  device: "/dev/sda"
  reboot: true
  poweroff: false
  auto: true # Required, for automated installations

kairos:
  network_token: ....
# extra configuration
```

The token `p2p.network_token` is a base64 encoded string which
contains an [`edgevpn` token](https://github.com/mudler/edgevpn/blob/master/docs/content/en/docs/Concepts/Token/_index.md). For more information, [check out the architecture section]({{< relref "../architecture/network" >}}).

Save this file as `cloud_init.yaml`, then create an ISO with the following steps:

1. Create a new directory and navigate to it:
```bash
$ mkdir -p build
$ cd build
```
1. Create empty `meta-data` and copy your config as `user-data`:
```bash
$ touch meta-data
$ cp -rfv cloud_init.yaml user-data
```
1. Use `mkisofs` to create the ISO file:
```bash
$ mkisofs -output ci.iso -volid cidata -joliet -rock user-data meta-data
```

Once the ISO is created, you can attach it to your machine and boot up as usual, along with the Kairos ISO.

{{% alert title="Warning" color="warning" %}}
For security reasons, when Kairos is installed in [trusted boot mode]({{< relref "../Installation/trustedboot.md" >}}), datasources are not parsed after installation. This prevents someone from plugging a usb stick on an edge device, applying arbitrary configuration to the system post-installation. To force parsing of the datasources after installation, you can set add the `kairos.pull_datasources` option to the cmdline. This requires extending the cmdline when building the installation medium with AuroraBoot ([read more]({{< relref "../Installation/trustedboot.md#additional-efi-entries" >}})).

This security feature is only enabled when the system boots in trusted boot mode and only after installation (they are parsed in "live" mode). On "plain" boot mode, datasources are always parsed.
{{% /alert %}}

## Via config URL

Another way to supply your Kairos configuration file is to specify a URL as a boot argument during startup. To do this, add `config_url=<URL>` as a boot argument. This will allow the machine to download your configuration from the specified URL and perform the installation using the provided settings.

After installation, the configuration will be available on the system at `/oem/90_custom.yaml`.

If you're not sure where to host your configuration file, a common option is to upload it as a GitHub gist.

## ISO remastering

It is possible to create custom ISOs with an embedded cloud configuration. This allows the machine to automatically boot with a pre-specified configuration file, which will be installed on the system after provisioning is complete. See also [AuroraBoot]({{< relref "../reference/auroraboot" >}}) for documentation.

### Locally

To create a custom ISO, you will need Docker installed on your machine. 

Here's an example of how you might do this:

{{% alert title="Warning" color="warning" %}}
The image passed to the auroraboot image, needs to have one of the accepted schemes: `docker`, `oci`, `file`, `dir` or `channel`.

If you don't pass one, we will make an attempt to read it as a web URL but depending on your URL this might throw an error.
{{% /alert %}}

{{< tabpane text=true  >}}
{{% tab header="AuroraBoot" %}}

We can use [AuroraBoot]({{< relref "../reference/auroraboot" >}}) to handle the the ISO build process, for example:

```bash
$ IMAGE=<scheme://host[:port]/path[:tag]>
$ docker pull $IMAGE
# Build the ISO
$ docker run -v $PWD/cloud_init.yaml:/cloud_init.yaml \
                    -v $PWD/build:/tmp/auroraboot \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    --rm -ti quay.io/kairos/auroraboot \
                    --set container_image=docker://$IMAGE \
                    --set "disable_http_server=true" \
                    --set "disable_netboot=true" \
                    --cloud-config /cloud_init.yaml \
                    --set "state_dir=/tmp/auroraboot"
# Artifacts are under build/
$ sudo ls -liah build/iso
total 778M
34648528 drwx------ 2 root root 4.0K Feb  8 16:39 .
34648526 drwxr-xr-x 5 root root 4.0K Feb  8 16:38 ..
34648529 -rw-r--r-- 1 root root  253 Feb  8 16:38 config.yaml
34649370 -rw-r--r-- 1 root root 389M Feb  8 16:38 kairos.iso
34649371 -rw-r--r-- 1 root root   76 Feb  8 16:39 kairos.iso.sha256
```
{{% /tab %}}
{{% tab header="Manually" %}}

```bash
$ IMAGE=<scheme://host[:port]/path[:tag]>
$ mkdir -p files-iso/boot/grub2
# You can replace this step with your own grub config. This GRUB configuration is the boot menu of the ISO
$ wget https://raw.githubusercontent.com/kairos-io/packages/main/packages/livecd/grub2/config/grub_live_bios.cfg -O files-iso/boot/grub2/grub.cfg

# Copy the config file
$ cp -rfv cloud_init.yaml files-iso/cloud_config.yaml
# Pull the image locally
$ docker pull $IMAGE
# Optionally, modify the image here!
# docker run --entrypoint /bin/bash --name changes -ti $IMAGE
# docker commit changes $IMAGE
# Build an ISO with $IMAGE
$ docker run -v $PWD:/cOS -v /var/run/docker.sock:/var/run/docker.sock -i --rm quay.io/kairos/auroraboot:{{< auroraBootVersion >}} --debug build-iso --name "custom-iso" --date=false --overlay-iso /cOS/files-iso --output /cOS/ $IMAGE
```
{{% /tab %}}
{{< /tabpane >}}

{{% alert title="Cloud config" color="success" %}}
In the case of Auroraboot, make sure that the cloud config that you are mounting in the container (`-v $PWD/cloud_init.yaml:/cloud_init.yaml`) exists. Otherwise docker will create an empty directory to mount it on the container without any warnings and you will end up with an empty cloud config.
{{% /alert %}}


This will create a new ISO with your specified cloud configuration embedded in it. You can then use this ISO to boot your machine and automatically install Kairos with your desired settings.

You can as well modify the image in this step and add additional packages before deployment. See [customizing the system image]({{< relref "../advanced/customizing" >}}).

Check out the [AuroraBoot documentation]({{< relref "../reference/auroraboot" >}}) and the [examples]({{< relref "../examples" >}}) for learn more on how to generate customized images for installation.

### Kubernetes

It is possible to create custom ISOs and derivatives using extended Kubernetes API resources with an embedded configuration file. This allows you to drive automated installations and customize the container image without breaking the concept of immutability.

You can read more about it [here]({{< relref "../Advanced/build.md#build-an-iso" >}}).
