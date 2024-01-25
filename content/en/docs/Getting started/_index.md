---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
icon: fa-regular fa-flag-checkered
description: >
  Getting started with Kairos
---

{{% alert title="Note" %}}
- If you prefer video format, you can also watch our [Introduction to Kairos video]({{< relref "Media#introduction-to-kairos" >}} "Media") on the [Media Section]({{< relref "Media" >}} "Media")
- If you are looking into installing Kairos with Full disk encryption, see [here]({{< relref "../installation/trustedboot" >}})
{{% /alert %}}

Ready to launch your Kubernetes cluster with ease? With Kairos, deployment is a breeze! Simply download the pre-packaged artifacts, boot up on a VM or bare metal, and let Kairos handle the rest. Whether you're a Linux or Windows user, our quickstart guide will have you up and running in no time. Kairos can build a Kubernetes cluster for you with just a few simple steps!

The goal of this quickstart is to help you quickly and easily deploy a Kubernetes cluster using Kairos releases. With Kairos, you can easily build a k3s cluster in a VM, or a baremetal using our pre-packaged artifacts, even if you don't already have a cluster. This process can also be used on bare metal hosts with some configuration adjustments. Check out our documentation further for more detailed instructions and [examples]({{< relref "../examples" >}}).

To create a Kubernetes cluster with Kairos, the only thing needed is one or more machines that will become the Kubernetes nodes. No previously existing clusters is needed.

Once the installation is complete, you can begin using your Kubernetes cluster.

## Prerequisites

- A VM (hypervisor) or a physical server (bare-metal) that boots ISOs
- A Linux or a Windows machine where to run the Kairos CLI (optional, we will see)
- A `cloud-init` configuration file (example below)
- At least 30+ Gb of available disk space.

## Download

1. Visit the Kairos [release page on GitHub](https://github.com/kairos-io/kairos/releases)
1. Select the latest release and download the assets of your flavor. For example,
   pick the [{{<image variant="standard">}}.iso](https://github.com/kairos-io/kairos/releases/download/{{<kairosVersion>}}/{{<image variant="standard">}}.iso)
   ISO file for the openSUSE based version, where `{{< k3sVersion >}}` in the name is the `k3s` version and `{{< kairosVersion >}}` is the Kairos one to deploy on a VM.
1. You can also use [netboot]({{< relref "../installation/netboot" >}}) to boot Kairos over the network

{{% alert title="Note" %}}
Core images in the ship **without** K3s and P2P full-mesh functionalities; they can be used as a
generic installer to [deploy container images]({{< relref "../examples/core" >}}).

Standard images ship **with** k3s and P2P full-mesh instead. But beware that these options need to be explicitly enabled.
In follow-up releases, _k3s-only_ artifacts will also be available.

See [Image Matrix Support]({{< relref "../reference/image_matrix" >}}) for additional supported images and kernels.

{{% /alert %}}


## Checking artifacts signatures

{{% alert title="Note" color="warning" %}}

This feature will be available in Kairos version `1.5.0` and in all future releases.

{{% /alert %}}

Our ISO releases have sha256 files to checksum the validity of the artifacts. At the same time, our sha256 files are signed automatically in the CI during the 
release workflow to verify that they haven't been tampered with, adding an extra step to the supply chain. 

It is recommended that before starting any installation the whole security chain is validated by verifying our sha256 signature and validating that the checksum matches with the download artifacts.


To validate the whole chain you would need:

1. `sha256sum` which is usually installed by default on most linux distributions.
2. `cosign` to verify the signatures of the sha256 file. You can install cosign via their [installation docs](https://docs.sigstore.dev/cosign/installation/)
3. ISO, sha256, certificate and signature files for the release/flavor that you want to verify. All the artifacts are available on the [kairos release page](https://github.com/kairos-io/kairos/releases)


In this example we will use the `{{< kairosVersion >}}` version and `{{< defaultFlavor >}}` flavor and `{{< defaultFlavorRelease >}}` flavor release.

First we check that we have all needed files:

```bash
$ ls      
{{<image variant="core">}}.iso         {{<image variant="core">}}.iso.sha256.pem
{{<image variant="core">}}.iso.sha256  {{<image variant="core">}}.iso.sha256.sig
```

We first verify that the sha256 checksums haven't been tampered with:

```bash
$ COSIGN_EXPERIMENTAL=1 cosign verify-blob --cert {{<image variant="core">}}.iso.sha256.pem --signature {{<image variant="core">}}.iso.sha256.sig {{<image variant="core">}}.iso.sha256 
tlog entry verified with uuid: 51ef927a43557386ad7912802607aa421566772524319703a99f8331f0bb778f index: 11977200
Verified OK
```

Once we see that `Verified OK` we can be sure that the file hasn't been tampered with, and we can continue verifying the iso checksum.

For an example of a failure validation see below:

```bash
$ COSIGN_EXPERIMENTAL=1 cosign verify-blob --enforce-sct --cert {{<image variant="core">}}.iso.sha256.pem --signature {{<image variant="core">}}.iso.sha256.sig {{<image variant="core">}}.iso.sha256.modified
Error: verifying blob [{{<image variant="core">}}.iso.sha256.modified]: invalid signature when validating ASN.1 encoded signature
main.go:62: error during command execution: verifying blob [{{<image variant="core">}}.iso.sha256.modified]: invalid signature when validating ASN.1 encoded signature
```
{{% alert title="Info" %}}
We use `COSIGN_EXPERIMENTAL=1` to verify the blob using the keyless method. That means that only ephemeral keys are created to sign, and it relays on using
OIDC Identity Tokens to authenticate so not even Kairos developers have access to the private keys and can modify an existing signature. All signatures are done
via the CI with no external access to the signing process. For more information about keyless signing please check the [cosign docs](https://github.com/sigstore/cosign/blob/main/KEYLESS.md)
{{% /alert %}}


Now we can verify that the integrity of the ISO hasnt been compromise:

```bash
$ sha256sum -c {{< image variant="core">}}.iso.sha256 
{{< image variant="core">}}.iso: OK
```

Once we reached this point, we can be sure that from the ISO hasn't been tampered with since it was created by our release workflow.

## Booting

Now that you have the ISO at hand, it's time to boot!

Here are some additional helpful tips depending on the physical/virtual machine you're using.

{{< tabpane text=true right=true >}}
  {{% tab header="**Machine**:" disabled=true /%}}
  {{% tab header="Bare-Metal" %}}

  When deploying on a bare metal server, directly flash the image into a USB stick. There are multiple ways to do this:

  **From the command line using the `dd` command**

  ```bash
  dd if=/path/to/iso of=/path/to/dev bs=4MB
  ```

  <br/>

  **From the GUI**

  For example using an application like [balenaEtcher](https://www.balena.io/etcher/) but can be any other application which allows you to write bootable USBs.
  {{% /tab %}}
  {{< tab header="QEMU" >}}
    {{% alert title="Warning" %}}
    Make sure you have KVM enabled, this will improve the performance of your VM significantly!
    {{% /alert %}}

    This would be the way to start it via the command line, but you can also use the GUI

    {{< highlight bash >}}
      virt-install --name my-first-kairos-vm \
                  --vcpus 1 \
                  --memory 1024 \
                  --cdrom /path/to/{{< image variant="standard" >}}.iso \
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

After booting you'll be greeted with a GRUB boot menu with multiple options.
The option you choose will depend on how you plan to install Kairos:

- The first entry will boot into installation with a QR code or [WebUI]({{< relref "../installation/webui" >}}),
  which we'll cover in the next step.
- The second entry will boot into [Manual installation mode]({{< relref "../installation/manual" >}}),
  where you can install Kairos manually using the console.
- The third boot option boots into [Interactive installation mode]({{< relref "../installation/interactive" >}}),
  where you can use the terminal host to drive the installation and skip the Configuration and Provisioning step.

To begin the installation process, select the first entry and let the machine boot. Eventually, a QR code will be printed on the screen. Follow the next step in the documentation to complete the installation.

![livecd](https://user-images.githubusercontent.com/2420543/189219806-29b4deed-b4a1-4704-b558-7a60ae31caf2.gif)

## Configuration

After booting up the ISO, the machine will wait for you to provide configuration details before continuing with the installation process. There are different ways to provide these details:

- Use the [WebUI]({{< relref "../installation/webui" >}}) to continue the installation.
- Serve the configuration via QR code.
- Connect to the machine via [SSH]({{< relref "../installation/manual" >}}) and start the installation process with a configuration file ( with `kairos-agent manual-install <config>`).
- [Use a datasource iso, or a generating a custom one]({{< relref "../installation/automated" >}})

The configuration file is a YAML file with `cloud-init` syntax and additional Kairos configuration details. In this example, we'll configure the node as a single-node Kubernetes cluster using K3s. We'll also set a default password for the Kairos user and define SSH keys.

Here's an example configuration file that you can use as a starting point:

{{% alert title="Warning" %}}
The `#cloud-config` at the top is not a comment. Make sure to start your configuration file with it.
{{% /alert %}}

```yaml
#cloud-config

# Define the user accounts on the node.
users:
- name: "kairos"                       # The username for the user.
  passwd: "kairos"                      # The password for the user.
  ssh_authorized_keys:                  # A list of SSH keys to add to the user's authorized keys.
  - github:mudler                       # A key from the user's GitHub account.
  - "ssh-rsa AAA..."                    # A raw SSH key.

# Enable K3s on the node.
k3s:
  enabled: true                         # Set to true to enable K3s.
```

Save this file as config.yaml and use it to start the installation process with kairos-agent manual-install config.yaml. This will configure the node as a single-node Kubernetes cluster and set the default password and SSH keys as specified in the configuration file.

[Check out the full configuration reference]({{< relref "../reference/configuration" >}}).

**Note**:

- `users`: This block defines the user accounts on the node. In this example, it creates a user named `kairos` with the password `kairos` and adds two SSH keys to the user's authorized keys.
- `k3s`: This block enables K3s on the node.
- If you want to enable experimental P2P support, check out [P2P installation]({{< relref "../installation/p2p" >}})

{{% alert title="Note" %}}

Several configurations can be added at this stage. [See the configuration reference]({{< relref "../reference/configuration" >}}) for further reading.

{{% /alert %}}

## Provisioning

{{% alert title="Note" %}}

You can find instructions showing how to use the Kairos CLI below. In case you prefer to install via SSH and log in to the box, see the [Manual installation]({{< relref "../installation/manual" >}}) section or the [Interactive installation]({{< relref "../installation/interactive" >}}) section to perform the installation manually from the console.

{{% /alert %}}

To trigger the installation process via QR code, you need to use the Kairos CLI. The CLI is currently available only for Linux and Windows. It can be downloaded from the release artifact:

```bash
curl -L https://github.com/kairos-io/provider-kairos/releases/download/{{<providerVersion>}}/kairosctl-.{{<providerVersion>}}-.linux-.amd64.tar.gz -o - | tar -xvzf - -C .
```

```bash
# optionally, install the CLI locally
mv kairosctl /usr/local/bin/kairosctl
chmod +x /usr/local/bin/kairosctl
```

The CLI allows to register a node with a QR Code screenshot, an QR Code image, or an EdgeVPN token. During pairing, the configuration is sent over, and the node will continue the installation process.

In a terminal window from your desktop/workstation, run:

```
kairosctl register --reboot --device /dev/sda --config config.yaml
```

**Note**:

- By default, the CLI will automatically take a screenshot to get the QR code. Make sure it fits into the screen. Alternatively, an image path or an EdgeVPN token can be supplied via arguments (e.g. `kairosctl register /img/path` or `kairosctl register <EdgeVPN token>`).
- The `--reboot` flag will make the node reboot automatically after the installation is completed.
- The `--device` flag determines the specific drive where Kairos will be installed. Replace `/dev/sda` with your drive. Any existing data will be overwritten, so please be cautious.
- The `--config` flag is used to specify the config file used by the installation process.

After a few minutes, the configuration is distributed to the node and the installation starts. At the end of the installation, the system is automatically rebooted.

## Accessing the Node

After the boot process, the node starts and is loaded into the system. You should already have SSH connectivity when the console is available.

To access to the host, log in as `kairos`:

```bash
ssh kairos@IP
```

**Note**:

- `sudo` permissions are configured for the Kairos user.

You will be greeted with a welcome message:

```
Welcome to Kairos!

Refer to https://kairos.io for documentation.
kairos@kairos:~>
```

It can take a few moments to get the K3s server running. However, you should be able to inspect the service and see K3s running. For example, with systemd-based flavors:

```
$ sudo systemctl status k3s
● k3s.service - Lightweight Kubernetes
     Loaded: loaded (/etc/systemd/system/k3s.service; enabled; vendor preset: disabled)
    Drop-In: /etc/systemd/system/k3s.service.d
             └─override.conf
     Active: active (running) since Thu 2022-09-01 12:02:39 CEST; 4 days ago
       Docs: https://k3s.io
   Main PID: 1834 (k3s-server)
      Tasks: 220
```

The K3s `kubeconfig` file is available at `/etc/rancher/k3s/k3s.yaml`. Please refer to the [K3s](https://rancher.com/docs/k3s/latest/en/) documentation.

## See Also

There are other ways to install Kairos:

- [Automated installation]({{< relref "../installation/automated" >}})
- [Manual login and installation]({{< relref "../installation/manual" >}})
- [Create decentralized clusters]({{< relref "../installation/p2p" >}})
- [Take over installation]({{< relref "../installation/takeover" >}})
- [Installation via network]({{< relref "../installation/netboot" >}})
- [Raspberry Pi]({{< relref "../installation/raspberry" >}})
- [CAPI Lifecycle Management (TODO)]()

## What's Next?

- [Upgrade nodes with Kubernetes]({{< relref "../upgrade/kubernetes" >}})
- [Upgrade nodes manually]({{< relref "../upgrade/manual" >}})
- [Encrypt partitions]({{< relref "../advanced/partition_encryption" >}})
- [Immutable architecture]({{< relref "../architecture/immutable" >}})
