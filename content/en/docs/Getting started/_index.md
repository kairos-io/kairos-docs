---
title: "Getting Started with Kairos: Deploy Immutable Linux for Edge Kubernetes"
linkTitle: "Getting Started"
weight: 1
icon: fa-regular fa-flag-checkered
no_list: true
description: |
    Step-by-step guide to deploying Kairos, the best immutable Linux distribution for edge Kubernetes clusters.
---

{{% alert title="Objective" %}}
This guide will teach you how easy it is to deploy a Kubernetes cluster using Kairos. To make this guide quick and effective we will make some decisions for you. We will do a traditional, interactive installation, of a single node cluster on a virtual machine (VM) on x86_64 architecture. At the end of the guide we will provide you with links to do many other different setups.
{{% /alert %}}

Ready to launch your Kubernetes cluster with ease? With Kairos, deployment is a breeze! Simply download an ISO, boot up on a VM, and let Kairos handle the rest. Whether on Linux, Windows or macOS, this guide will have you up and running in no time. Kairos can build a Kubernetes cluster for you with just a few simple steps!

## Prerequisites

- A Virtual Machine Manager (VMM) like VirtualBox, KVM, or VMware.
- At least 35+ Gb of available disk space.

## Do you prefer to watch a video?

{{< youtube id="XAIsitP5OII" title="Getting Started with Kairos" >}}

## Download an ISO

{{% alert title="Kairos Flavor" color="info" %}}
Kairos comes in many flavors. These are the underlying Linux distributions on which we build our final OS. Some examples are Alpine Kairos, openSUSE Kairos and Ubuntu Kairos.
{{% /alert %}}

1. Select your Kairos Flavor from the nav bar
2. Click the following link to download an iso: {{<imageLink variant="standard" suffix=".iso">}}  

## Create a Virtual Machine (VM)

{{% alert title="Warning" color="warning" %}}
Make sure you have KVM enabled in your VMM, this will improve the performance of your VM significantly!
{{% /alert %}}

This step will vary depending on the Virtual Machine Manager that you are using. Here are some general steps to get you started:

1. Open your VMM.
2. Create a new VM.
3. Select the downloaded ISO as the boot media.
4. Configure the VM hardware
    1. We recommend at least 2 CPUs and 4GB of RAM for the best experience but Kairos can run on less.
    2. Allocate at least 35GB of disk space.
    3. Add a TPM device
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

You can configure the system by editing the cloud-config file. The cloud-config file is located at `/oem/90_custom.yaml`. You can edit this file to add users, SSH keys, and other configurations. See the [Cloud Config documentation]({{< relref "../reference/configuration" >}}) for more information.

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

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "./configuration" >}}">
    Quick configuration guide
</a>

Find out about the features in Kairos, the goals that drive our project and how to join our community.

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "./what-is-kairos" >}}">
    What is Kairos?
</a>

Want to install on bare-metal? A Raspberry Pi? A cloud provider? Check out our other installation guides.

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "../installation" >}}">
    Other ways to install Kairos
</a>
