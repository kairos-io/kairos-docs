---
title: "Trusted Boot"
linkTitle: "Trusted Boot"
versionBanner: "false"
weight: 3
description: |
---

{{% alert title="Objective" color="success" %}}
{{% /alert %}}

## Prerequisites

For this quickstart you will need a container engine and virtualization software.

- For container engine, we'll use [Docker](https://docs.docker.com/engine/install/)
- For virtualization software we’ll use [VirtualBox](https://www.virtualbox.org/)

## Prefer to watch a video?

{{< youtube id="wEjN42hFpOo" title="Hadron Trusted Boot" >}}

## Generate Your Keys

The whole concept of Trusted Boot stands on a set of keys. These keys are used to sign the images, and they need to be onboarded on the Secure Boot platform of the device that will run the system. In this step we are going to generate a new set of keys.

{{% alert title="SELinux Enabled" color="warning" %}}
If you've got SELinux Enabled, you will get a "Permission denied" error. To avoid having the problem append a `:Z` to the volume argument i.e `-v $PWD/keys:/work/keys:Z`
{{% /alert %}}

```bash
docker run -v $PWD/keys:/work/keys -ti --rm quay.io/kairos/auroraboot:v0.16.1 genkey --expiration-in-days 365 -o /work/keys "E-corp"
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

{{% alert title="Key management" color="warning" %}}
Any person with these keys, will be able to sign images on your behalf, so don't keep them at the reach of just anyone. And if you loose them, you may brick your device, so make sure you have a backup!
{{% /alert %}}

```bash
db.auth  db.esl  db.pem    KEK.der  KEK.key  PK.auth  PK.esl  PK.pem
db.der   db.key  KEK.auth  KEK.esl  KEK.pem  PK.der   PK.key  tpm2-pcr-private.pem
```

## Building a bootable ISO

Now that we have our keys to sing the image, we can generate a bootable ISO. For the underlying image we are going to use hadron built for trusted boot, which has the suffix `-uki` in comparison to the BIOS images e.g. `quay.io/kairos/hadron:v0.0.1-beta1-core-amd64-generic-v3.6.1-beta1-uki`.

{{% alert title="SELinux Enabled" color="warning" %}}
If you've got SELinux Enabled, you will get a "Permission denied" error. To avoid having the problem append a `:Z` to the volume argument i.e `-v ${PWD}/build/:/output:Z` and `-v $PWD/keys:/work/keys:Z`
{{% /alert %}}

```bash
docker run -v /var/run/docker.sock:/var/run/docker.sock \
 -v ${PWD}/build/:/output \
 -v ${PWD}/keys:/keys \
 quay.io/kairos/auroraboot:v0.16.1 \
 build-uki \
 --output-dir /output/ \
 --public-keys /keys \
 --tpm-pcr-private-key /keys/tpm2-pcr-private.pem \
 --sb-key /keys/db.key \
 --sb-cert /keys/db.pem \
 --output-type iso \
 quay.io/kairos/hadron:v0.0.1-beta1-core-amd64-generic-v3.6.1-beta1-uki
```

This will generate a Trusted Boot ISO image in the `build/` directory.

```
ls build/
kairos-hadron-0.0.1-core-amd64-generic-v3.6.1-beta1-uki.iso
```

## Prepare a VM

{{< tabpane text=true right=true >}}
{{% tab header="VirtualBox" %}}

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
   - **Disk Size:** 8 GB (sufficient for this quickstart; increase if you plan to deploy more workloads)
   - **Use EFI:** enabled
4. In the VM list, select the Hadron VM and click **Settings**.
5. Go to **System** and enable **Secure Boot**.
6. Go to **Network** and configure:
   - **Attached to:** Bridged Adapter
7. Click **OK** to save your changes.
8. In a terminal, run the following command:
        ```
        VBoxManage modifyvm "Hadron-TB" --tpm-type 2.0 --tpm-location /tmp/tpmdata
        ```
9. With the Hadron VM selected, click **Start**.
10. A dialog will open with an error finding the DVD, hit **Cancel**
11. Press any key to enter the Boot Manager Menu
12. Select **Device Manager**
13. Select **Secure Boot Configuration**
14. Select **Reset Secure Boot Keys**
15. When the dialog opens, select **Yes**
16. Press **Esc** until you are back in the top menu
17. Select **Reset**

{{% /tab %}}
{{% tab header="Generic Instructions" %}}

1. Create a new VM.
2. Assign the downloaded ISO to the CD-ROM and set it as the boot media.
3. Configure the VM hardware according to the requirements.
4. Add a TPM chip to the machine
5. Start the VM.
6. Reset the Secure Boot Keys
7. Reboot

{{% /tab %}}
{{< /tabpane >}}

## Perform an Interactive Installation

1. Once the machine boots initialize the interactive installer
    ```
    kairos-agent interactive-install
    ```
1. The first time you boot the VM, you will see a GRUB boot menu with multiple options. Select the option that says `Interactive Install` and press Enter.
2. Wait for the system to boot up. You will be greeted with the interactive installation manager. The drive where the installation is going to proceed, for example `/dev/sda`, should already be selected, denoted by the `>` character on the left.
3. Press Enter to select that drive.
4. On the next page you will see a message that says: `Start Install and on Finish do [nothing, reboot, poweroff]`.
5. With the arrows, select `poweroff`.
6. Move down to `Customize further` and press Enter.
7. Select `User & Password` and press Enter.
8. For the user, enter `kairos`, then press Tab. For the password, also enter `kairos`.
9. Press Enter to save the changes and return to the previous menu.
10. Select `Finish Customization and start Installation` and press Enter.
11. The Installation Summary should look like this:

    ```
    Selected Disk: /dev/sda

    Action to take when Installation is complete: poweroff

    Configuration Summary:
      - Username: kairos
      - SSH Keys: not set
      - Extra Options: not set
    ```

12. If everything is correct, press Enter to install. You should see a progress bar and the VM will power off automatically.
13. Open the VM settings again in the **Storage** section and remove the ISO image and press Ok.
14. **Start** the machine

## First Boot

The first you will see when booting is the systemd-boot menu. This time the options include active, passive (fallback), or rescue mode.

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

## Conclusion

Congratulations :tada: You have successfully deployed Kairos Hadron in Trusted Boot mode :rocket:

## Frequently Asked Questions (FAQs)

**How do I configure the system?**

You can configure the system by editing the cloud-config file. The cloud-config file is located at `/oem/90_custom.yaml`. You can edit this file to add users, SSH keys, and other configurations. See the [Cloud Config documentation]({{< relref "../docs/reference/configuration" >}}) for more information.

**What is Secure Boot?**

Secure Boot is a firmware-level security feature that ensures a device boots only trusted software. During startup, the system’s firmware (like UEFI) verifies the digital signatures of bootloaders and other critical components against trusted keys stored in the device. If anything has been tampered with or isn’t properly signed, the system blocks it from running. This prevents malware—such as rootkits—from loading before the operating system, protecting the integrity of the boot process.

**What is UKI?**

A Unified Kernel Image (UKI)—sometimes called a Unified System Image (USI)—is a single, signed EFI executable that bundles together all components needed to boot a Linux system: the kernel, initramfs, kernel command line, and optionally a stub loader and OS metadata. By packaging everything into one signed artifact, UKIs streamline and strengthen Secure Boot flows, eliminate the need to separately verify multiple boot files, and make atomic, reproducible, and verifiable boot environments easier to manage. This approach is increasingly used with systemd-based boot workflows to simplify secure, reliable deployments.

**What is Trusted Boot?**

Trusted Boot, in the context of Kairos, is an integrated security boot process that combines Secure Boot, Measured Boot, and Full Disk Encryption (FDE) to ensure that a system wasn’t tampered with before booting and that its data remains protected. Secure Boot verifies that only properly signed firmware and OS components load; Measured Boot records cryptographic measurements of each boot stage (often into a TPM) so integrity can be assessed; and FDE ensures that the disk’s contents are encrypted against unauthorized access. Together, this stack gives a strong guarantee of boot integrity and data protection — often implemented using a single signed Unified Kernel/System Image (UKI/USI) that the firmware can boot directly, ensuring the system state is trusted from power-on onward. 


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

Learn about Trusted Boot

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="{{< relref "../docs/architecture/trustedboot" >}}">
    Trusted Boot Architecture
</a>

Need something that's not included in the base Kairos image? You can extend it cleanly with systemd extensions.

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="{{< ref "sys-extensions.md" >}}">
    Extending the system with systemd extensions
</a>

