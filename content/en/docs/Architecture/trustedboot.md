---
title: "Trusted Boot Architecture"
linkTitle: "Trusted Boot"
weight: 6
date: 2022-11-13
description: >
---


*FDE* stands for Full Disk Encryption. It is a security measure that encrypts the entire contents of a disk drive, including the operating system, system files, and user data. The purpose of FDE is to protect data stored on the disk from unauthorized access in the event of theft or loss of the device.

*Secure Boot* is a security feature in modern computer systems that ensures only properly signed and authenticated OSes are allowed to run during the boot process. It helps prevent the loading of malicious or unauthorized code at the early stages of the system startup, thus helping in protecting the integrity of the boot process.

*Measured Boot*, on the other hand, is a security mechanism that goes beyond Secure Boot. It involves creating a record, or "measurements," of each step in the boot process and storing these measurements in a specific hardware dedicated to cryptographically secure operations ( trusted platform module, or TPM) or a similar secure storage. This allows the system to verify the integrity of each component of the boot process and detect any unauthorized changes. Measured Boot provides a more comprehensive and continuous security check throughout the boot sequence.

By combining Secure Boot, Measured Boot and FDE we can guarantee that a system was not tampered with, and the user-data is protected by cold attacks, we refer to this combination of technologies stacked together with “Trusted Boot” or “Trusted Boot Experience”. 

> You can read more about Trusted Boot in https://0pointer.de/blog/brave-new-trusted-boot-world.html and about SENA here: https://kairos.io/blog/2023/04/18/kairos-is-now-part-of-the-secure-edge-native-architecture-by-spectro-cloud-and-intel/



### Considerations


### Security considerations

TODO: Design choices (no pivot, no grub, etc)


#### Booting command lines

UKI file's signatures are including also the kernel command line, so any change to the kernel command line will require a new UKI file to be generated and the installer image to be rebuilt. This implies that you cannot change the booting options once the system is installed (and the system won't be able to access the encrypted data)