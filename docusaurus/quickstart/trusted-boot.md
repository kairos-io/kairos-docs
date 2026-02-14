---
title: "Trusted Boot"
description: Learn how to deploy Kairos Hadron with Trusted Boot on a VM.
sidebar_position: 4
---


:::tip Objective
Deploy Kairos Hadron with Trusted Boot enabled. You will learn how to generate Secure Boot keys, build a signed Unified Kernel Image (UKI) ISO, configure a virtual machine with Secure Boot and TPM support, and perform an interactive installation.
:::

## Prerequisites

:::tip Alternatives
This tutorial uses the recommended container and virtualization tools to keep the instructions simple. Other alternatives should work as well, but they’re not documented here. If you successfully follow the tutorial using different tools, please consider opening a PR so others can benefit from your steps.
:::

To run Hadron Trusted Boot, you’ll need both a container engine and virtualization software that can run or emulate the amd64 architecture. In this guide, we’ll be using:

- [Docker](https://docs.docker.com/engine/install/)
- [VirtualBox](https://www.virtualbox.org/)

## Prefer to watch a video?

<iframe width="100%" height="450" src="https://www.youtube.com/embed/2UY4J3VudnU" title="Hadron Quickstart" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen />

## Generate Your Keys

The whole concept of Trusted Boot relies on a set of keys. These keys are used to sign the images, and they need to be onboarded on the Secure Boot platform of the device that will run the system. In this step, we are going to generate a new set of keys.

:::warning SELinux Enabled
If you've got SELinux Enabled, you will get a "Permission denied" error. To avoid having the problem append a `:Z` to the volume argument i.e `-v $PWD/keys:/work/keys:Z`
:::

```bash
docker run -v $PWD/keys:/work/keys -ti --rm quay.io/kairos/auroraboot:v0.16.2 genkey --expiration-in-days 365 -o /work/keys "E-corp"
```

If everything went correctly you should see similar output to this:

```bash
2025-12-11T15:45:45Z INF [1] Generating PK
2025-12-11T15:45:45Z INF [1] PK generated at /work/keys/PK.key and /work/keys/PK.pem
2025-12-11T15:45:45Z INF [1] Converting PK.pem to DER
2025-12-11T15:45:45Z INF [1] PK generated at /work/keys/PK.der
2025-12-11T15:45:45Z INF [1] Generating KEK
2025-12-11T15:45:45Z INF [1] KEK generated at /work/keys/KEK.key and /work/keys/KEK.pem
2025-12-11T15:45:45Z INF [1] Converting KEK.pem to DER
2025-12-11T15:45:45Z INF [1] KEK generated at /work/keys/KEK.der
2025-12-11T15:45:45Z INF [1] Generating db
2025-12-11T15:45:45Z INF [1] db generated at /work/keys/db.key and /work/keys/db.pem
2025-12-11T15:45:45Z INF [1] Converting db.pem to DER
2025-12-11T15:45:45Z INF [1] db generated at /work/keys/db.der
2025-12-11T15:45:45Z INF [1] Generating policy encryption key
```

And if you check what's in the directory

```bash
ls keys/
```

You should see all these keys

:::warning Key management
Any person with these keys will be able to sign images on your behalf, so don't keep them within reach of just anyone. And if you lose them, you may brick your device, so make sure you have a backup!
:::

```bash
db.auth  db.esl  db.pem    KEK.der  KEK.key  PK.auth  PK.esl  PK.pem
db.der   db.key  KEK.auth  KEK.esl  KEK.pem  PK.der   PK.key  tpm2-pcr-private.pem
```

## Building a Trusted Boot Container Image

Now that you know [how to build an image](/quickstart/extending-the-system-dockerfile/), you will see that the process of building a Trusted Boot version is not any different, we only have to point to the correct container image for Hadron, and pass the `trusted-boot` flag when initializing (kairosifying) the image.

Start by creating a Dockefile with the following content:

```dockerfile
FROM quay.io/kairos/kairos-init:v0.6.8 AS kairos-init

FROM ghcr.io/kairos-io/hadron-trusted:v0.0.1-beta2 AS base
ARG VERSION

RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    eval /kairos-init -l debug -s install --trusted true --provider k3s --version \"${VERSION}\" && \
    eval /kairos-init -l debug -s init --trusted true --provider k3s --version \"${VERSION}\"
```

And build it:

```bash
docker build -t hadron-tb:0.1.0 --build-arg=VERSION=0.1.0 .
```

## Building a Bootable ISO

:::warning SELinux Enabled
If you've got SELinux Enabled, you will get a "Permission denied" error. To avoid having the problem append a `:Z` to the volume argument i.e `-v ${PWD}/build/:/output:Z` and `-v $PWD/keys:/work/keys:Z`
:::

```bash
docker run -v /var/run/docker.sock:/var/run/docker.sock \
 -v ${PWD}/build/:/output \
 -v ${PWD}/keys:/keys \
 quay.io/kairos/auroraboot:v0.16.2 \
 build-uki \
 --output-dir /output/ \
 --public-keys /keys \
 --tpm-pcr-private-key /keys/tpm2-pcr-private.pem \
 --sb-key /keys/db.key \
 --sb-cert /keys/db.pem \
 --output-type iso \
 hadron-tb:0.1.0
```

This will generate a Trusted Boot ISO image in the `build/` directory.

```
ls build/
kairos-hadron-0.0.1-core-amd64-generic-v3.6.1-beta1-uki.iso
```

## Prepare a VM

### VirtualBox

1. Click **New** to create a virtual machine.
2. Fill in the VM details:
   - **Name:** Hadron-TB
   - **ISO Image:** `/previously/generated/iso/kairos-hadron-0.0.1-core-amd64-generic-v3.6.1-beta1-uki.iso`
   - **OS:** Linux
   - **OS Distribution:** Other Linux
   - **OS Version:** Other Linux (64-bit)
3. Configure the VM resources:
   - **Base Memory:** 2048 MB (enough for this quickstart; for applications, consider 4 or 8 GB)
   - **Number of CPUs:** 1 (increase if your host has spare capacity)
   - **Disk Size:** 25 GB (there's currently a bug for trusted boot so we need a bit of extra space for this one here)
   - **Use EFI:** enabled
4. In the VM list, select the Hadron VM and click **Settings**.
5. Go to **Network** and configure:
   - **Attached to:** Bridged Adapter
6. Click **OK** to save your changes.
7. In a terminal, run the following command:
        ```
        VBoxManage modifyvm "Hadron-TB" --tpm-type 2.0 --tpm-location /tmp/tpmdata
        ```
8. With the Hadron VM selected, click **Start**.



### Generic Instructions

1. Create a new VM.
2. Assign the downloaded ISO to the CD-ROM and set it as the boot media.
3. Configure the VM hardware according to the requirements.
4. Add a TPM chip to the machine
5. Start the VM.
6. Reset the Secure Boot Keys
7. Reboot



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
4. Check on "Power off after installation"
5. If the installation went correctly, the machine will eventually poweroff
6. Open the VM settings again in the **Storage** section and remove the ISO image and press Ok.
7. **Start** the machine

## First Boot

The first thing you will see when booting is the systemd-boot menu. This time, the options include active, passive (fallback), or rescue mode.

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

## Conclusion

Congratulations :tada: You have successfully deployed Kairos Hadron in Trusted Boot mode :rocket:

## Frequently Asked Questions (FAQs)

**How do I configure the system?**

You can configure the system by editing the cloud-config file. The cloud-config file is located at `/oem/90_custom.yaml`. You can edit this file to add users, SSH keys, and other configurations. See the [Cloud Config documentation](/docs/reference/configuration/) for more information.

**What is Secure Boot?**

Secure Boot is a firmware-level security feature that ensures a device boots only trusted software. During startup, the system’s firmware (like UEFI) verifies the digital signatures of bootloaders and other critical components against trusted keys stored in the device. If anything has been tampered with or isn’t properly signed, the system blocks it from running. This prevents malware—such as rootkits—from loading before the operating system, protecting the integrity of the boot process.

**What is UKI?**

A Unified Kernel Image (UKI)—sometimes called a Unified System Image (USI)—is a single, signed EFI executable that bundles together all components needed to boot a Linux system: the kernel, initramfs, kernel command line, and optionally a stub loader and OS metadata. By packaging everything into one signed artifact, UKIs streamline and strengthen Secure Boot flows, eliminate the need to separately verify multiple boot files, and make atomic, reproducible, and verifiable boot environments easier to manage. This approach is increasingly used with systemd-based boot workflows to simplify secure, reliable deployments.

**What is Trusted Boot?**

Trusted Boot, in the context of Kairos, is an integrated security boot process that combines Secure Boot, Measured Boot, and Full Disk Encryption (FDE) to ensure that a system wasn’t tampered with before booting and that its data remains protected. Secure Boot verifies that only properly signed firmware and OS components load; Measured Boot records cryptographic measurements of each boot stage (often into a TPM) so integrity can be assessed; and FDE ensures that the disk’s contents are encrypted against unauthorized access. Together, this stack gives a strong guarantee of boot integrity and data protection — often implemented using a single signed Unified Kernel/System Image (UKI/USI) that the firmware can boot directly, ensuring the system state is trusted from power-on onward. 






## What's Next?

### Continue learning (recommended)

After setting up Trusted Boot, the next step is usually to understand the model and then apply day-2 operations and extensions.

<a class="btn btn-lg btn-primary me-3 mb-4" href="/docs/reference/configuration/">
    Cloud-config reference
</a>

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="/docs/architecture/trustedboot/">
    Trusted Boot architecture
</a>

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="/docs/advanced/sys-extensions/">
    Extend with systemd extensions
</a>

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="/quickstart/lifecycle-management/">
    Upgrade & rollback (atomic upgrades)
</a>
