---
title: "Trusted Boot Architecture"
linkTitle: "Trusted Boot"
weight: 6
date: 2022-11-13
---

{{% alert title="Warning" %}}
This section is still a work in progress and only available in Kairos v3.x releases and alphas.
{{% /alert %}}

Trusted boot is a combination of technologies that allows us to enhance the security posture of a running system. It is composed by FDE, Secure Boot and Measured Boot.
Trusted boot is an architectural requirement of [SENA (Secure Edge Native Architecture)](https://www.spectrocloud.com/product/sena) and is a key component of Kairos.

> You can read more about Trusted Boot in https://0pointer.de/blog/brave-new-trusted-boot-world.html and about SENA here: https://kairos.io/blog/2023/04/18/kairos-is-now-part-of-the-secure-edge-native-architecture-by-spectro-cloud-and-intel/

By combining Secure Boot, Measured Boot and FDE we can guarantee that a system was not tampered with, and the user-data is protected by cold attacks, we refer to this combination of technologies stacked together with “Trusted Boot” or “Trusted Boot Experience”. 

*FDE* stands for Full Disk Encryption. It is a security measure that encrypts the entire contents of a disk drive, including the operating system, system files, and user data. The purpose of FDE is to protect data stored on the disk from unauthorized access in the event of theft or loss of the device.

*Secure Boot* is a security feature in modern computer systems that ensures only properly signed and authenticated OSes are allowed to run during the boot process. It helps prevent the loading of malicious or unauthorized code at the early stages of the system startup, thus helping in protecting the integrity of the boot process.

*Measured Boot*, on the other hand, is a security mechanism that goes beyond Secure Boot. It involves creating a record, or "measurements," of each step in the boot process and storing these measurements in a specific hardware dedicated to cryptographically secure operations ( trusted platform module, or TPM) or a similar secure storage. This allows the system to verify the integrity of each component of the boot process and detect any unauthorized changes. Measured Boot provides a more comprehensive and continuous security check throughout the boot sequence.


### UKI and USI

[UKI](https://uapi-group.org/specifications/specs/unified_kernel_image/) is a specific file format tailored to achieve a tamper-proof system and encryption of user-data bound to the silicon by relying on HW capabilities. 

> UKI stands for “Unified Kernel Images”. UKI files are a single, fat binary that encompasses the OS and the needed bits in order to boot the full system with a single, verified file. You can read technical details here: [Brave New Trusted Boot World](https://0pointer.de/blog/brave-new-trusted-boot-world.html).

Trusted Boot in Kairos works by generating UKI images from container images. The UKI file is a single, fat binary that encompasses the OS and the needed bits in order to boot the full system with a single, verified file. This file can be used for upgrades and used as usual in the lifecycle of the Kairos node.

The UKI file is signed with the Secure Boot keys, and the user-data is encrypted with the PCR policies. The UKI file is then loaded by the firmware and booted directly, without any second stage or system pivoting. This is why the UKI file can grow large, and why it requires a specific firmware that supports booting large EFI files. 

Due to the design choice to not boot into a second stage, this is being refered nowadays as **USI** (Unified System Image) instead of UKI, or more simply "Bootstrap Image". The benefits of using Unified system images in opposite of UKIs are that the system can be upgraded without the need of a second stage, and that the entire system is verified and signed.

### Building process

For Trusted boot it is required to build a specific installable ISO file medium that contains the UKI files and a container image used for upgrades. Every time to upgrade a system it is required to re-generate the assets with the same keys and use the generated container image for the upgrades.

The UKI files are generated from container images as usual.

![Trusted boot](https://github.com/kairos-io/kairos-docs/assets/2420543/2f49d592-9ae3-43ee-b22b-0313be455bf7)

The process to generate the installable medium is described in the [Trustedboot installation documentation]({{%relref "/docs/installation/trustedboot" %}}). Internally we rely on the *osbuilder* tool to generate all the installation artifacts from a single container image.

### Booting process

![boot_1](https://github.com/kairos-io/kairos-docs/assets/2420543/9c406796-b622-4571-abd5-b8d8fed44591)

The booting process of an installed system with Trusted Boot is different from a standard Kairos installation, and can be split down in 4 steps:

1. The Firmware loads the `systemd-boot` bootloader from the EFI partition
2. `systemd-boot` loads the UKI file from the EFI partition (that can be either the Active system, the passive or recovery system)
3. The EFI system starts. The kernel and the initrd are loaded from the UKI file, and the kernel is booted with the command line specified in the UKI file. 
4. The initrd will decrypt the user-data and mount the portions of it in the root filesystem. This includes for instance any changes to `/etc` (like adding new users and passwords), `/usr/local`, and all the mount bindpoints specified in the configuration file (see [Bind mount d ocumentation]({{%relref "/docs/advanced/customizing#bind-mounts" %}}) ). There is no second stage loaded and no system pivoting, the system is booted directly from the UKI file.

### Booting system

![Trusted boot](https://github.com/kairos-io/kairos-docs/assets/2420543/757870d3-3b40-46ea-9c86-13c4a545f167)

There is no difference with a layout of a standard Kairos system (as explained in the [Immutable OS]({{%relref "/docs/architecture/immutable" %}}) page), however in this setup now the partitions containing data are always encrypted:

- [List of persistent data path overlayed and encrypted](https://github.com/kairos-io/packages/blob/528682cddf7191fb52580e7c41a33e73c1ee0001/packages/static/kairos-overlay-files/files/system/oem/00_rootfs_uki.yaml#L18) (see also [the bind mount documentation]({{%relref "/docs/advanced/customizing#bind-mounts" %}}) to customize it with your own paths).
- `/oem` encrypted
- `/usr/local` encrypted
- `/etc` ephemeral
- `/usr` read only
- `/` immutable

### User data encryption and key generation 

It is required in order to generate USI images to have a set of keys and certificates. In order to understand why those keys are required, we need to understand how the user-data is encrypted and how the system is booted.

![bootingkeys](https://github.com/kairos-io/kairos-docs/assets/2420543/725745a0-0ea6-4330-bea3-e6483f53cc3f)


The keys are used to sign the UKI file, and to generate a PCR policy keypair required later on by the system in order to decrypt the encrypted partitions. The keys and certificates are generated with the `enki` tool, that is available in the `enki` container image.

### Considerations

#### Booting command lines

UKI file's signatures are including also the kernel command line, so any change to the kernel command line will require a new UKI file to be generated and the installer image to be rebuilt. This implies that you cannot change the booting options once the system is installed (and the system won't be able to access the encrypted data)

### References

- [UEFI](https://documentation.suse.com/sled/15-SP5/html/SLED-all/cha-uefi.html)
- https://cdrdv2-public.intel.com/671120/a-tour-beyond-bios-implementing-uefi-authenticated-variables-in-smm-with-edkii.pdf
- [](https://www.vut.cz/www_base/zav_prace_soubor_verejne.php?file_id=132208)
- [Secure Boot](https://wiki.archlinux.org/title/Unified_Extensible_Firmware_Interface/Secure_Boot)