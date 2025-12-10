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
This guide will show you how easy it is to deploy a Kubernetes cluster using Hadron by Kairos. To keep things quick and effective, we’ll pre-select a few choices for you. You’ll perform a traditional, interactive installation of a single-node cluster on an x86_64 virtual machine. At the end, you’ll find links to explore many other setup options.
{{% /alert %}}

Ready to launch your Kubernetes cluster with ease? Hadron by Kairos makes it simple: download the ISO, start a VM, and follow a few guided steps. Whether you use Linux, Windows, or macOS, you’ll have a cluster running in no time.

## Prerequisites

To run Hadron, you only need virtualization software. For this quickstart, we’ll use [VirtualBox](https://www.virtualbox.org/) since it works on all major platforms.

Here are some alternatives:

- Windows: VMware Workstation Player
- macOS: VMware Fusion, UTM
- Linux: KVM (via virt-manager or virsh)

## Do you prefer to watch a video?

TODO: record new video

{{< youtube id="XAIsitP5OII" title="Getting Started with Kairos" >}}

## Download an ISO

{{% alert title="arm64" color="warning" %}}
Hadron is still in beta, and for now only amd64 images are available. If your host system is arm64, you can still run amd64 virtual machines, but expect a performance hit. Keep this in mind for the demo.

For production setups, you can either use one of the other Kairos flavors or wait for the [upcoming arm64 release](https://github.com/kairos-io/kairos/issues/2133).
{{% /alert %}}

{{% alert title="Kairos Flavor" color="info" %}}
Kairos offers multiple flavors — different Linux distributions that power the immutable OS. Hadron is the default, engineered for image-based workflows, but you can also use Alpine, Debian, Fedora, Rocky, Ubuntu, and many more. In this quickstart, we’ll be using Hadron.
{{% /alert %}}

Click the following link to download: [kairos-hadron-0.1.0-beta-standard-amd64-generic-v3.6.0-k3sv1.33.5+k3s1.iso
](https://drive.google.com/file/d/1M4H5_pEkCNwTcd5X1obDfANr2rrjMPAi/view?usp=sharing)

## Create a Virtual Machine (VM)

{{% alert title="KVM" color="warning" %}}
Make sure you have KVM enabled in your VMM, this will improve the performance of your VM significantly.
{{% /alert %}}

{{% alert title="Requirements" color="info" %}}
Hadron Single-Node Demo Requirements (with k3s)

| Profile | Disk | RAM | Description |
|--------|------|-----|-------------|
| Bare-minimum | 8 GB | 2 GB | Boots Hadron with k3s and allows very small demo workloads. Intended only for constrained environments and smoke tests. |
| Practical minimum | 16 GB | 4 GB | Recommended starting point for demos, labs, and PoCs. Enough capacity to run several demo applications without constant cleanup. |
| Recommended playground | 32 GB | 8 GB | Best for richer demos including small databases, dashboards, and multiple apps. Still non-production, but feels like a real mini-cluster. |


{{% /alert %}}

This step will vary depending on the Virtualization Software you are using. Here are some general steps to get you started:

1. Create a new VM.
2. Assign the downloaded ISO to the CDROM and set it as the boot media.
3. Configure the VM hardware according to the requirements
5. Start the VM.

## Perform an Interactive Installation

The first time you boot the VM, you will be greeted with a GRUB boot menu with multiple options. Select the option that says "Interactive Install" and press Enter.

Wait for the system to boot up. You will be greeted with a Kairos logo and the interactive installation manager will ask you the following questions:

- **What's the target install device** (e.g. /dev/vda). Kairos will detect the biggest disk available and suggest it. If you are happy with the suggestion, press Enter. Otherwise erase the suggestion and type the device you want to use, or the question mark. The question mark will show you a list of available devices.
- **User to setup** (e.g. Kairos). The default user is Kairos but it is also a required user so for now just press Enter and later on we will teach you how to add more users.
- **Password** this one doesn't have a default, so type a password and press Enter.
- **SSH access** (e.g. github:mauromorales). This is optional but very useful. Kairos will go and fetch your public key from GitHub or GitLab and add it to the user's authorized keys. If you don't have a key on GitHub or GitLab, you can paste your public key here. If you don't want to add a key, just press Enter.
- **Do you want to setup a full mesh-support?** (y/n). This step enables P2P support. For now we will not enable it, so just press Enter.
- **Do you want to enable k3s?** (y/n). This step enables the installation of K3s. Write "y" and press Enter.
* **Are your settings ok?** (y/n). If you are happy with the settings, write "y" and press Enter. Otherwise write "n" and press Enter to start again.

The installation will start and you will see the Kairos' agent different steps.

{{% alert title="Remember to eject the CD!" color="warning" %}}
Some VMMs will not eject the CD automatically. Make sure to eject the CD before rebooting.
{{% /alert %}}

When the installation is complete you will need to reboot the system. You can do this with the following command:

```bash
reboot
```

## First Boot

After the reboot you will again see the GRUB boot menu. This time the options don't include any installation, instead you can start the system in either active, passive (fallback) or rescue mode. We will learn more about that in the next steps. For now, just select the first option that only says "Kairos" and press Enter. If you don't touch anything, the system will boot automatically after a few seconds.

After the system finishes booting, you will see a login prompt. Go ahead and login with the user `kairos` and the password you set during the installation.

## SSH into the system


{{% alert title="Check your VMM Networking configuration" color="warning" %}}
Accessing your VM via SSH will depend on your VMM networking configuration. Make sure you have the correct network settings to access the VM.
{{% /alert %}}


On the VM info you can find the IP associated to it, use it to SSH into the system:

```bash
ssh kairos@IP
```

{{% alert title="Authorized Keys" color="info" %}}
If you configured the SSH key during the installation, you will be able to login without a password.
{{% /alert %}}

Now enter the password you set during the installation.

## Check Your Running Cluster

{{% alert title="Batteries included" color="info" %}}
Along with k3s, the standard images come with kubectl and k9s pre-installed. Kubectl is the Kubernetes command-line tool, and k9s is a terminal-based UI to interact with your Kubernetes clusters.
{{% /alert %}}

After logging in, you can check the status of the cluster with the `kubectl` tool. First switch to the `root` user with the following command:

```bash
sudo -i
```

If you display the pods within the `kube-system` namespace, you should see the `coredns` and `local-path-provisioner` pods running. E.g.:

```
root@localhost:~# kubectl get pods -n kube-system
NAME                                      READY   STATUS      RESTARTS   AGE
coredns-576bfc4dc7-nc982                  1/1     Running     0          5h9m
helm-install-traefik-crd-28sfl            0/1     Completed   0          5h9m
helm-install-traefik-kdxmj                0/1     Completed   1          5h9m
local-path-provisioner-86f46b7bf7-5fs46   1/1     Running     0          5h9m
metrics-server-557ff575fb-zmdlf           1/1     Running     0          5h9m
svclb-traefik-00b7a912-xh4zd              2/2     Running     0          5h8m
traefik-5fb479b77-mfq7h                   1/1     Running     0          5h8m
```

## Conclusion

Congratulations :tada: You have successfully deployed a Kubernetes cluster using Kairos :rocket: You can now start deploying your applications and services on your new cluster

**Please refer to the [K3s](https://rancher.com/docs/k3s/latest/en/) documentation, to learn more about the Kubernetes distribution that Kairos uses in the standard images.**

## Frequently Asked Questions (FAQs)

**How do I configure the system?**

You can configure the system by editing the cloud-config file. The cloud-config file is located at `/oem/90_custom.yaml`. You can edit this file to add users, SSH keys, and other configurations. See the [Cloud Config documentation]({{< relref "../docs/reference/configuration" >}}) for more information.

**What is a Kairos flavor?**

A Kairos flavor is a specific version of Kairos that is built on top of a specific Linux distribution. For example, the Alpine Kairos flavor is built on top of Alpine Linux. You can choose the flavor that best suits your needs.

**Can I use Kairos without Kubernetes?**

Yes, absolutely! You can use Kairos as a standalone Linux distribution without Kubernetes. Just download the Kairos Core artifacts if you don't want to use Kubernetes, or configure the Standard artifacts with the `k3s` option disabled.

**Can I use a different Kubernetes distribution with Kairos?**

Kairos uses providers to install Kubernetes distributions. The Kairos provider is the only one that is built and tested by the Kairos team, but there are other providers by the community and you can build your own!

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
    },
  ]
}
</script>

## What's Next?

Ready to configure your newly deployed Kairos node?

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< ref "initial-configuration.md" >}}">
    Quick configuration guide
</a>

Find out about the features in Kairos, the goals that drive our project and how to join our community.

Want to install on bare-metal? A Raspberry Pi? A cloud provider? Check out our other installation guides.

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "../docs/installation" >}}">
    Other ways to install Kairos
</a>
