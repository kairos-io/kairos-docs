---
title: "Hadron Quickstart"
description: Deploy an immutable Kubernetes cluster with Hadron by Kairos, faster than a coffee break.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


:::tip Objective
This guide shows how easy it is to deploy a Kubernetes cluster using Hadron by Kairos. To keep things quick and effective, we'll pre-select a few choices for you. You'll perform a traditional, interactive installation of a single-node cluster on a virtual machine. At the end, you'll find links to explore many other setup options.
:::

Ready to launch your Kubernetes cluster with ease? Hadron by Kairos makes it simple: download the ISO, start a virtual machine (VM), and follow a few guided steps. Whether you use Linux, Windows, or macOS, you'll have a cluster running in no time.

## Prerequisites

:::tip Alternatives
This tutorial uses the recommended virtualization tools to keep the instructions simple. Other alternatives should work as well, but they're not documented here. If you successfully follow the tutorial using different tools, please consider opening a PR so others can benefit from your steps.
:::

In this guide, we'll be using [kairos-lab](https://github.com/kairos-io/kairos-lab), a simple tool to create and manage Kairos virtual machines.

:::warning Windows
kairos-lab does not run on Windows. If you're on Windows, use VirtualBox or another virtualization software instead.
:::

### Installing kairos-lab

<Tabs>
<TabItem value="macos" label="macOS" default>

```bash
brew tap kairos-io/kairos
brew install kairos-lab
```

</TabItem>
<TabItem value="linux" label="Linux">

Download the binary from the [releases page](https://github.com/kairos-io/kairos-lab/releases) and place it in your PATH.

</TabItem>
</Tabs>

Once installed, run the setup command to install any required dependencies (like QEMU):

```bash
kairos-lab setup
```

## Prefer to watch a video?

<YouTube id="HDArpKdUl58" title="Hadron Quickstart" />

## Download an ISO

:::info Kairos Flavor
Kairos offers multiple flavors — different Linux distributions that power the immutable OS. Hadron is the default, engineered for image-based workflows, but you can also use Alpine, Debian, Fedora, Rocky, Ubuntu, and many more. In this quickstart, we'll be using Hadron.
:::

Download the latest Kairos ISO using kairos-lab:

```bash
kairos-lab download
```

If you prefer to download an artifact manually, visit the [latest releases page](https://github.com/kairos-io/kairos/releases/latest).

## Create a Virtual Machine (VM)

:::warning KVM
Make sure you have KVM enabled in your virtualization software; this will improve the performance of your VM significantly.
:::

:::info Requirements
Hadron Single-Node Demo Requirements (with k3s)

| Profile | Disk | RAM | Description |
|--------|------|-----|-------------|
| Bare-minimum | 8 GB | 2 GB | Boots Hadron with k3s and allows very small demo workloads. Intended only for constrained environments and smoke tests. |
| Practical minimum | 16 GB | 4 GB | Recommended starting point for demos, labs, and PoCs. Enough capacity to run several demo applications without constant cleanup. |
| Recommended playground | 32 GB | 8 GB | Best for richer demos including small databases, dashboards, and multiple apps. Still non-production, but feels like a real mini-cluster. |

:::

<Tabs>
<TabItem value="kairos-lab" label="kairos-lab" default>

Start a new VM with kairos-lab:

```bash
kairos-lab start
```

You will be prompted to provide a name for your VM (or press Enter to use the default). You can then configure the VM resources as you prefer, or accept the defaults.

**Important:** Keep the bridged network option enabled, as this is required for the VM to obtain an IP address accessible from your browser. Before the VM can start, `kairos-lab` will need to create a bridged network, which requires sudo privileges.

</TabItem>
<TabItem value="virtualbox" label="VirtualBox / Generic Instructions">

1. Click **New** to create a virtual machine.
2. Fill in the VM details:
   - **Name:** Hadron  
   - **ISO Image:** `/path/to/kairos.iso`
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

</TabItem>
</Tabs>


## Installing the OS

1. After the machine boots, give it a bit until you see the designated machine IP and head to your browser and type http://IP:8080
2. Add the following configuration to the web installer

    ```yaml
    #cloud-config
    users:
    - name: kairos
      passwd: kairos
      groups: [admin]
    k3s:
      enabled: true
    ```
3. In the device field, type "auto"
4. Check on "Restart after installation"
5. If the installation went correctly, the machine will eventually restart

:::warning Eject the CD!
Some virtualization software automatically removes the CD after installation. To avoid any confusion, make sure you have the right boot order as mentioned in the previous section. Otherwise, make sure to eject the CD before rebooting.
:::

## First Boot

After the reboot you will again see the GRUB boot menu. This time the options don't include any installation; instead, you can start the system in either active, passive (fallback), or rescue mode.

We will learn more about these options in the next steps. For now, just select the first option that only says `Kairos` and press Enter. If you don't touch anything, the system will boot automatically after a few seconds.

After the system finishes booting, you will see a login prompt. Log in with the user `kairos` and the password you set during the installation.

## SSH into the system

:::warning VM network
Accessing your VM via SSH will depend on your virtualization software network configuration. If you followed the configuration above, with a bridged card, your machine should get an IP within your network, allowing you to SSH in.
:::

We can use the same IP we used to install the system to ssh in:

```bash
ssh kairos@IP
```

Now enter the password you set during the installation.

## Check Your Running Cluster

After logging in, you can check the status of the cluster with the `kubectl` tool. First switch to the `root` user with the following command:

```bash
sudo su -
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

## What's Next?

### Continue the quickstart (recommended)

If you're new to Kairos, follow these in order to learn the full workflow: extend the image, upgrade atomically, then harden the system.

<a class="btn btn-lg btn-primary me-3 mb-4" href="/quickstart/extending-the-system-dockerfile/">
    Extend Hadron using a Dockerfile
</a>

<a class="btn btn-lg btn-primary me-3 mb-4" href="/quickstart/lifecycle-management/">
    Upgrade & rollback (atomic upgrades)
</a>

<a class="btn btn-lg btn-primary me-3 mb-4" href="/quickstart/trusted-boot/">
    Trusted Boot (Secure Boot + Meassured Boot) quickstart
</a>

### Deep dive docs

If you're already comfortable with Kairos and want details, jump straight to the reference docs.

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="/docs/reference/configuration/">
    Cloud-config reference
</a>

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="/docs/reference/byoi/">
    BYOI and custom pipelines
</a>

## Frequently Asked Questions (FAQs)

**How do I configure the system?**

You can configure the system by editing the cloud-config file. The cloud-config file is located at `/oem/90_custom.yaml`. You can edit this file to add users, SSH keys, and other configurations. See the [Cloud Config documentation](/docs/reference/configuration/) for more information.

**What is a Kairos flavor?**

A Kairos flavor is a specific version of Kairos that is built on top of a specific Linux distribution. For example, the Alpine Kairos flavor is built on top of Alpine Linux. You can choose the flavor that best suits your needs. Once Hadron is stable, it will become the default flavor, but all the other flavors continue to be supported.

**Can I use Kairos without Kubernetes?**

Yes, absolutely! You can use Kairos as a standalone Linux distribution without Kubernetes. Just download the Kairos Core artifacts if you don't want to use Kubernetes, or configure the Standard artifacts with the `k3s` option disabled.

**Can I use a different Kubernetes distribution with Kairos?**

Yes, you can download the standard image with k0s. Both k3s and k0s are equally supported by the Kairos team.

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Install Kairos Hadron on a VM (single-node Kubernetes with k3s)',
      description:
        'Download the Hadron ISO, create a VM, install via the web installer, then SSH in and verify your k3s cluster is running.',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Download a Hadron ISO',
          text: 'Download the Hadron ISO using kairos-lab download or from the releases page.',
        },
        {
          '@type': 'HowToStep',
          name: 'Create a virtual machine',
          text: 'Create a VM using kairos-lab start or manually (for example in VirtualBox), attach the ISO, configure CPU/RAM/disk, and boot the VM.',
        },
        {
          '@type': 'HowToStep',
          name: 'Install the OS via the web installer',
          text: 'Open http://IP:8080, paste the provided cloud-config, set the device to auto, and run the installation.',
        },
        {
          '@type': 'HowToStep',
          name: 'First boot',
          text: 'After installation, boot the system from disk and log in with the configured credentials.',
        },
        {
          '@type': 'HowToStep',
          name: 'SSH into the system',
          text: 'SSH to the VM using the same IP address used during installation.',
        },
        {
          '@type': 'HowToStep',
          name: 'Verify the running cluster',
          text: 'Switch to root and run kubectl get nodes and kubectl get pods -n kube-system to confirm the cluster is healthy.',
        },
      ],
    }),
  }}
/>

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I configure the system?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can configure the system by editing the cloud-config file. The cloud-config file is located at /oem/90_custom.yaml. You can edit this file to add users, SSH keys, and other configurations. See the Cloud Config documentation for more information.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is a Kairos flavor?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A Kairos flavor is a specific version of Kairos that is built on top of a specific Linux distribution. For example, the Alpine Kairos flavor is built on top of Alpine Linux. You can choose the flavor that best suits your needs.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I use Kairos without Kubernetes?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Yes, absolutely! You can use Kairos as a standalone Linux distribution without Kubernetes. Just download the Kairos Core artifacts if you don't want to use Kubernetes, or configure the Standard artifacts with the `k3s` option disabled.",
          },
        },
        {
          '@type': 'Question',
          name: 'Can I use a different Kubernetes distribution with Kairos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, you can download the standard image with k0s. Both k3s and k0s are equally supported by the Kairos team.',
          },
        },
      ],
    }),
  }}
/>
