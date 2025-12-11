---
title: "Hadron Quickstart"
linkTitle: "Hadron"
versionBanner: "false"
icon: fa-regular fa-flag-checkered
weight: 1
no_list: true
menu:
  main:
    weight: 10
description: |
    Deploy an immutable Kubernetes cluster with Hadron by Kairos, faster than a coffee break. 
---

{{% alert title="Objective" color="success" %}}
This guide shows how easy it is to deploy a Kubernetes cluster using Hadron by Kairos. To keep things quick and effective, we’ll pre-select a few choices for you. You’ll perform a traditional, interactive installation of a single-node cluster on an x86_64 virtual machine. At the end, you’ll find links to explore many other setup options.
{{% /alert %}}

Ready to launch your Kubernetes cluster with ease? Hadron by Kairos makes it simple: download the ISO, start a virtual machine (VM), and follow a few guided steps. Whether you use Linux, Windows, or macOS, you’ll have a cluster running in no time.

## Prerequisites

To run Hadron, you only need virtualization software. For this quickstart, we’ll use [VirtualBox](https://www.virtualbox.org/), which works on all major platforms.

Here are some alternatives:

- Windows: VMware Workstation Player
- macOS: VMware Fusion, UTM
- Linux: KVM (via [Virt Manager](https://virt-manager.org/) or virsh), Proxmox

## Prefer to watch a video?

{{< youtube id="wEjN42hFpOo" title="Hadron Quickstart" >}}

## Download an ISO

{{% alert title="arm64" color="warning" %}}
Hadron is still in beta, and for now only `amd64` images are available. If your host system is `arm64`, you can still run `amd64` virtual machines, but expect a performance hit. Keep this in mind for the demo.

For production setups, you can either use one of the other Kairos flavors or wait for the [upcoming arm64 release](https://github.com/kairos-io/kairos/issues/2133).
{{% /alert %}}

{{% alert title="Kairos Flavor" color="info" %}}
Kairos offers multiple flavors — different Linux distributions that power the immutable OS. Hadron is the default, engineered for image-based workflows, but you can also use Alpine, Debian, Fedora, Rocky, Ubuntu, and many more. In this quickstart, we’ll be using Hadron.
{{% /alert %}}

Click the following link to download: [kairos-hadron-0.1.0-beta-standard-amd64-generic-v3.6.0-k3sv1.33.5+k3s1.iso](https://github.com/kairos-io/kairos/releases/download/v3.6.1-beta1/kairos-hadron-0.0.1-standard-amd64-generic-v3.6.1-beta1-k3sv1.34.2+k3s1.iso)

## Create a Virtual Machine (VM)

{{% alert title="KVM" color="warning" %}}
Make sure you have KVM enabled in your virtualization software; this will improve the performance of your VM significantly.
{{% /alert %}}

{{% alert title="Requirements" color="info" %}}
Hadron Single-Node Demo Requirements (with k3s)

| Profile | Disk | RAM | Description |
|--------|------|-----|-------------|
| Bare-minimum | 8 GB | 2 GB | Boots Hadron with k3s and allows very small demo workloads. Intended only for constrained environments and smoke tests. |
| Practical minimum | 16 GB | 4 GB | Recommended starting point for demos, labs, and PoCs. Enough capacity to run several demo applications without constant cleanup. |
| Recommended playground | 32 GB | 8 GB | Best for richer demos including small databases, dashboards, and multiple apps. Still non-production, but feels like a real mini-cluster. |

{{% /alert %}}

{{< tabpane text=true right=true >}}
{{% tab header="VirtualBox" %}}

1. Click **New** to create a virtual machine.
2. Fill in the VM details:
   - **Name:** Hadron  
   - **ISO Image:** `/path/to/previously/downloaded/iso/kairos-hadron-0.0.1-standard-amd64-generic-v3.6.1-beta1-k3sv1.34.2+k3s1.iso`
   - **OS:** Linux
   - **OS Distribution:** Other Linux
   - **OS Version:** Other Linux (64-bit)
3. Configure the VM resources:
   - **Base Memory:** 2048 MB (enough for this quickstart; for applications, consider 4 or 8 GB)
   - **Number of CPUs:** 1 (increase if your host has spare capacity)
   - **Disk Size:** 8 GB (sufficient for this quickstart; increase if you plan to deploy more workloads)
   - **Use EFI:** disabled
4. In the VM list, select the Hadron VM and click **Settings**.
5. Go to **System** and adjust the **Boot Order** (BIOS only) so **Hard Disk** is first and **Optical** comes after.
6. Go to **Network** and configure:
   - **Attached to:** Bridged Adapter
7. Click **OK** to save your changes.
8. With the Hadron VM selected, click **Start**.

{{% /tab %}}
{{% tab header="Generic Instructions" %}}

1. Create a new VM.
2. Assign the downloaded ISO to the CD-ROM and set it as the boot media.
3. Configure the VM hardware according to the requirements.
4. Start the VM.

{{% /tab %}}
{{< /tabpane >}}

## Perform an Interactive Installation

1. The first time you boot the VM, you will see a GRUB boot menu with multiple options. Select the option that says `Interactive Install` and press Enter.
2. Wait for the system to boot up. You will be greeted with the interactive installation manager. The drive where the installation is going to proceed, for example `/dev/sda`, should already be selected, denoted by the `>` character on the left.
3. Press Enter to select that drive.
4. On the next page you will see a message that says: `Start Install and on Finish do [nothing, reboot, poweroff]`.
5. With the arrows, select `reboot`.
6. Move down to `Customize further` and press Enter.
7. Select `User & Password` and press Enter.
8. For the user, enter `kairos`, then press Tab. For the password, also enter `kairos`.
9. Press Enter to save the changes and return to the previous menu.
10. Select `Configure k3s.enabled` and press Enter.
11. With the arrows, select `Yes` to enable k3s and press Enter. You should be taken back to the previous menu.
12. Select `Finish Customization and start Installation` and press Enter.
13. The Installation Summary should look like this:

    ```
    Selected Disk: /dev/sda

    Action to take when Installation is complete: reboot

    Configuration Summary:
      - Username: kairos
      - SSH Keys: not set

    Extra options:

    k3s:
      enabled: true
    ```

14. If everything is correct, press Enter to install. You should see a progress bar and the VM will reboot automatically.

{{% alert title="Eject the CD!" color="warning" %}}
Some virtualization software automatically removes the CD after installation. To avoid any confusion, make sure you have the right boot order as mentioned in the previous section. Otherwise, make sure to eject the CD before rebooting.
{{% /alert %}}

## First Boot

After the reboot you will again see the GRUB boot menu. This time the options don't include any installation; instead, you can start the system in either active, passive (fallback), or rescue mode.

We will learn more about these options in the next steps. For now, just select the first option that only says `Kairos` and press Enter. If you don't touch anything, the system will boot automatically after a few seconds.

After the system finishes booting, you will see a login prompt. Log in with the user `kairos` and the password you set during the installation.

## SSH into the system

{{% alert title="VM network" color="warning" %}}
Accessing your VM via SSH will depend on your virtualization software network configuration. If you followed the configuration above, with a bridged card, your machine should get an IP within your network, allowing you to SSH in.
{{% /alert %}}

First you need to get the IP address. Since there are no VirtualBox guest packages for Hadron, you need to do this from the VirtualBox console. Run:

```bash
ip a | grep 192
```

Now use the resulting IP address to access the system from your preferred terminal application:

```bash
ssh kairos@IP
```

Now enter the password you set during the installation.

## Check Your Running Cluster

After logging in, you can check the status of the cluster with the `kubectl` tool. First switch to the `root` user with the following command:

```bash
sudo -i
```

Start by displaying the nodes in the system:

```bash
kubectl get nodes
```

You should see the k3s control-plane node listed, which is the machine you just provisioned.

```
NAME     STATUS   ROLES           AGE    VERSION
kairos   Ready    control-plane   164m   v1.34.2+k3s1
```

If you display the pods within the `kube-system` namespace:

```bash
kubectl get pods -n kube-system
```

You should see the `coredns` and `local-path-provisioner` pods running. For example:

```
NAME                                      READY   STATUS      RESTARTS   AGE
coredns-7f496c8d7d-mjmkp                  1/1     Running     0          170m
helm-install-traefik-crd-mqdfk            0/1     Completed   0          170m
helm-install-traefik-sr9b5                0/1     Completed   2          170m
local-path-provisioner-578895bd58-k667m   1/1     Running     0          170m
metrics-server-7b9c9c4b9c-kjdfn           1/1     Running     0          170m
svclb-traefik-fbdc293e-scdm4              2/2     Running     0          170m
traefik-6f5f87584-kjcdr                   1/1     Running     0          170m
```

## Conclusion

Congratulations :tada: You have successfully deployed a Kubernetes cluster using Kairos Hadron :rocket: You can now start deploying your applications and services on your new cluster.

**Please refer to the [K3s](https://rancher.com/docs/k3s/latest/en/) documentation to learn more about the Kubernetes distribution that Kairos uses in the standard images.**

## Frequently Asked Questions (FAQs)

**How do I configure the system?**

You can configure the system by editing the cloud-config file. The cloud-config file is located at `/oem/90_custom.yaml`. You can edit this file to add users, SSH keys, and other configurations. See the [Cloud Config documentation]({{< relref "../docs/reference/configuration" >}}) for more information.

**What is a Kairos flavor?**

A Kairos flavor is a specific version of Kairos that is built on top of a specific Linux distribution. For example, the Alpine Kairos flavor is built on top of Alpine Linux. You can choose the flavor that best suits your needs. Once Hadron is stable, it will become the default flavor, but all the other flavors continue to be supported.

**Can I use Kairos without Kubernetes?**

Yes, absolutely! You can use Kairos as a standalone Linux distribution without Kubernetes. Just download the Kairos Core artifacts if you don't want to use Kubernetes, or configure the Standard artifacts with the `k3s` option disabled.

**Can I use a different Kubernetes distribution with Kairos?**

Yes, you can download the standard image with k0s. Both k3s and k0s are equally supported by the Kairos team.

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

Need a highly secure system with TPM-backed attestation and trusted boot?

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="{{< relref "./trusted-boot" >}}">
    Trusted Boot Quickstart
</a>

Need something that's not included in the base Kairos image? You can extend it cleanly with systemd extensions.

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="{{< ref "sys-extensions.md" >}}">
    Extending the system with systemd extensions
</a>

