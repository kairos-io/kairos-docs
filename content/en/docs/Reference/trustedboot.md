---
title: "Trusted Boot Experience"
linkTitle: "Trusted Boot"
weight: 6
date: 2022-11-13
description: >
---

"Trusted Boot" is a combination of technologies that allows us to guarantee that a system was not tampered with, and the user-data is protected by cold attacks, it is composed by FDE, Secure Boot and Measured Boot.

*FDE* stands for Full Disk Encryption. It is a security measure that encrypts the entire contents of a disk drive, including the operating system, system files, and user data. The purpose of FDE is to protect data stored on the disk from unauthorized access in the event of theft or loss of the device.

*Secure Boot* is a security feature in modern computer systems that ensures only properly signed and authenticated OSes are allowed to run during the boot process. It helps prevent the loading of malicious or unauthorized code at the early stages of the system startup, thus helping in protecting the integrity of the boot process.

*Measured Boot*, on the other hand, is a security mechanism that goes beyond Secure Boot. It involves creating a record, or "measurements," of each step in the boot process and storing these measurements in a specific hardware dedicated to cryptographically secure operations ( trusted platform module, or TPM) or a similar secure storage. This allows the system to verify the integrity of each component of the boot process and detect any unauthorized changes. Measured Boot provides a more comprehensive and continuous security check throughout the boot sequence.

By combining Secure Boot, Measured Boot and FDE we can guarantee that a system was not tampered with, and the user-data is protected by cold attacks, we refer to this combination of technologies stacked together with “Trusted Boot” or “Trusted Boot Experience”. 

> You can read more about Trusted Boot in https://0pointer.de/blog/brave-new-trusted-boot-world.html and about SENA here: https://kairos.io/blog/2023/04/18/kairos-is-now-part-of-the-secure-edge-native-architecture-by-spectro-cloud-and-intel/

## Enable Trusted Boot in Kairos

Kairos supports Trusted boot by generating special installable medium, and we boot into what we call “UKI-mode”. [UKI](https://uapi-group.org/specifications/specs/unified_kernel_image/) is a specific file format tailored to achieve a tamper-proof system and encryption of user-data bound to the silicon by relying on HW capabilities. This feature is optional and works alongside how Kairos works.

> UKI stands for “Unified Kernel Images”. UKI files are a single, fat binary that encompasses the OS and the needed bits in order to boot the full system with a single, verified file. You can read technical details here: Brave New Trusted Boot World.

## Usage

In order to use UKI mode, you need to build a special ISO file with the UKI files. In order to build this medium you have to generate a couple of keypairs first: one for the Secure boot and one for the PCR policies required to encrypt the user-data.

The installation is then performed as usual, however the user-data will be encrypted, along with the OEM and the persistent partition by using the TPM chip and the Trusted Boot mechanism.

### Key generation

To generate the Secure boot certificates and keys run the following commands:

```bash
# Platform key
openssl req -new -x509 -subj "/CN=Kairos PK/" -days 3650 -nodes -newkey rsa:2048 -sha256 -keyout PK.key -out PK.crt

# DER keys are for FW install
openssl x509 -in PK.crt -out PK.der -outform DER

# Key exchange
openssl req -new -x509 -subj "/CN=Kairos KEK/" -days 3650 -nodes -newkey rsa:2048 -sha256 -keyout KEK.key -out KEK.crt

# DER keys are for FW install
openssl x509 -in KEK.crt -out KEK.der -outform DER

# Signature DB
openssl req -new -x509 -subj "/CN=Kairos DB/" -days 3650 -nodes -newkey rsa:2048 -sha256 -keyout DB.key -out DB.crt

# DER keys are for FW install
openssl x509 -in DB.crt -out DB.der -outform DER
```

To generate the TPM PCR key:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out tpm2-pcr-private.pem
openssl rsa -pubout -in tpm2-pcr-private.pem -out tpm2-pcr-public.pem
```

### Building installable medium

To build the installable medium you need to run the following command:

(TODO: waiting for osbuilder changes)
```bash
```

### Generating the upgrade image

To generate the upgrade image you need to create a naked container image containing containing the EFI files, for example:

(TODO: waiting for osbuilder changes)
```bash
## luet util pack ..
```



### Security considerations

TODO: Design choices (no pivot, no grub, etc)

### Data Encryption

#### Additional partitions