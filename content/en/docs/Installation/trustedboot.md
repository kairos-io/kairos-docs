---
title: "Trusted Boot Installations"
linkTitle: "Trusted Boot"
weight: 6
date: 2022-11-13
---

{{% alert title="Warning" %}}
This section is still a work in progress and only available in Kairos v3.x releases and alphas.
{{% /alert %}}

"Trusted Boot" is a combination of technologies that allows us to guarantee that a system was not tampered with, and the user-data is protected by cold attacks, it is composed by FDE, Secure Boot and Measured Boot.

If you want to learn more on what Trusted Boot is and how it works, see the [Trusted Boot Architecture]({{< relref "../architecture/trustedboot" >}}) page. This page describes how to enable Trusted Boot support in Kairos.

Kairos supports Trusted boot by generating specific installable medium. This feature is optional and works alongside how Kairos works.

## Requirements

The Hardware that will run Kairos needs to have the following requirements:

- Secure boot available in the system
- The Hardware should have a TPM chip or fTPM enabled
- The Hardware should be capable of booting large EFI files (>32MB)
- Base image of the OS needs to have at least systemd 252 or newer ( for example ubuntu >=23.10 or fedora >=38 )

To build the installable medium you need the following installed in the system you use to build the installable medium:

- Docker
- Git
- A Linux machine with KVM (for testing the images locally)

## Usage

In order to boot into UKI mode, you need to build a special ISO file with the UKI files. To build this medium you have to generate a set of keypairs first: one for the Secure boot and one for the PCR policies required to encrypt the user-data.

Any change, or upgrade of the node to a new version of the OS requires those assets to be regenerated with these keypairs, including the installer ISO, and the EFI files used for upgrading. The keys are used to *sign* and *verify* the EFI files, and the PCR policies are used to *encrypt* and *decrypt* the user-data, and thus are required to be the same for the whole lifecycle of the node.

The steps below will guide you into generating the installable assets, and how to re-generate the assets to upgrade the node to a new version of the OS.

## Build the container image used to generate keys and installable medium

```bash
# Build the container image that will be used to generate the keys and installable medium
git clone https://github.com/kairos-io/enki.git
cd enki
docker build -t enki --target tools-image .
```

## Key generation

To generate the Secure boot certificates and keys run the following commands:

```bash
MY_ORG="Acme Corp"
# Generate the keys
docker run -v $PWD/keys:/work/keys -ti --rm enki genkey "$MY_ORG" --expiration-in-days 365 -o /work/keys
```
{{% alert title="Warning" %}}
Substitute `$MY_ORG` for your own string, this can be anything but it help identifying the Keys. The keys duration can specified with `--expiration-in-days`. It is not possible to create keys that do not expire, but it is possible to specify an extremely large value (e.g. 200 years, etc.)
{{% /alert %}}

{{% alert title="Warning" %}}
It is very important to preserve the keys generated in this process in a safe place. Loosing the keys will prevent you to generate new images that can be used for upgrades.
{{% /alert %}}

## Building installable medium

To build the installable medium you need to run the following commands:

{{< tabpane text=true  >}}
{{% tab header="From a container image" %}}
```bash
CONTAINER_IMAGE=quay.io/kairos/fedora:38-core-amd64-generic-v3.0.0-alpha1
# ubuntu:
# CONTAINER_IMAGE=quay.io/kairos/ubuntu:23.10-core-amd64-generic-v3.0.0-alpha1
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys enki build-uki $CONTAINER_IMAGE -t iso -d /result/ -k /keys
```
{{% /tab %}}
{{% tab header="From a directory" %}}
```bash
# Assuming you have a "rootfs" directory with the content of the OS
# If the image is in a directory ($PWD/rootfs) you can use the following command
docker run -ti --rm -v $PWD/build:/result -v $PWD/rootfs:/rootfs -v $PWD/keys/:/keys enki build-uki dir:/rootfs/ -t iso -d /result/ -k /keys
```
{{% /tab %}}
{{< /tabpane >}}

### Config files

Included in the artifact will be a configuration file. On the installation/upgrade media, it is called `norole.conf` but once it has been installed it will be named `active.conf`, `passive.conf` or `recovery.conf` which represents the configuration for the "cos", "fallback" and "recovery" images respectively.

This configuration file includes the "title" of the artifact in the boot menu and the location of the "efi" file to boot. Here's an example:

```
# cat /efi/loader/entries/active.conf
efi /EFI/kairos/active.efi
title Kairos
```

### Branding

You can overwrite the default "Kairos" title if you pass the `--boot-branding` flag to enki.


```bash
CONTAINER_IMAGE={{<oci flavor="ubuntu" flavorRelease="23.10" variant="core">}}-uki
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys enki build-uki $CONTAINER_IMAGE -t iso -d /result/ -k /keys --boot-branding "My Awesome OS"
```

Your config file should look now like this:


```
# cat /efi/loader/entries/active.conf
efi /EFI/kairos/active.efi
title My Awesome OS
```

{{% alert title="Warning" %}}
Remember when you build upgrade mediums, to also add your branding, otherwise the new active image will be named differently than your fallback and recovery ones.
{{% /alert %}}

### Version and cmdline in the config files

In addition to having the "title" and "efi" attributes, you can include in the config files the OS "version" and "cmdline". To do so, pass `--include-version-in-config` or `--include-cmdline-in-config` flags to enki.

{{% alert title="Info" %}}
The cmdline, will only show what is different between the default cmdline and the currently used cmdline. If you pass `--include-cmdline-in-config` to a default installation, the attribute cmdline will be empty.
{{% /alert %}}

```
cmdline awesome=true
title Awesome OS
efi /EFI/kairos/active.efi
version v3.0.0
```

## Installation

The installation process is performed as usual and the [Installation instructions]({{< relref "../installation" >}}) can be followed, however the difference is that user-data will be automatically encrypted (both the OEM and the persistent partition) by using the TPM chip and the Trusted Boot mechanism.

### Enroll the keys in Secure Boot

If your machine is in UEFI setup mode Secure Boot keys will be automatically enrolled. To enter UEFI Setup mode you need to clear the Secure Boot keys (PKs) from the BIOS/UEFI. 

If UEFI setup mode is not available, you need to enroll the keys manually in the BIOS/UEFI. 

This process can vary depending on the vendor, but in general you need to enter the BIOS/UEFI setup during early boot and import the keys, for an example outline you can check the steps for [HPE Hardware](https://techlibrary.hpe.com/docs/iss/proliant-gen10-uefi/GUID-E4427875-D123-4BBF-9056-342168478A02.html).

A video of the process of importing keys in QEMU is available [here](https://github.com/kairos-io/kairos/assets/2420543/e45f6a08-ec74-4cfd-bdf0-aeb7b23ac9bc).

## Upgrades

See the [Trusted Boot Upgrade]({{< relref "../upgrade/trustedboot" >}}) page.

## Testing the images locally

To test the ISO file locally QEMU can be used. In order to test Secure Boot components you need an ed2k firmware with secureboot in QEMU. If you don't have QEMU locally and/or you don't have the correct dependencies you can follow the steps below that build a container image with QEMU and the needed dependencies and use that container to run the ISO file in a VM with Docker.

1. Build the container image with the QEMU/Secure Boot dependencies (note to replace disk, VM size and ISO file name):

```bash
docker build -t fedora-qemu -<<DOCKER
FROM fedora
RUN dnf install -y dnf-plugins-core
RUN dnf config-manager --add-repo http://www.kraxel.org/repos/firmware.repo
RUN dnf install -y edk2.git-ovmf-x64 qemu
RUN dnf install -y swtpm wget
WORKDIR /
RUN wget -q https://github.com/mudler/cos-demo-labs/raw/tests/efivars.fd -O /efivars.fd
WORKDIR /work

RUN <<EOF
echo "#!/bin/bash -ex" >> /entrypoint.sh
echo '[ ! -e /work/disk.img ] && qemu-img create -f qcow2 "/work/disk.img" 35G' >> /entrypoint.sh
echo '/usr/bin/qemu-system-x86_64 -drive if=pflash,format=raw,unit=0,file="/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd",readonly=on -drive if=pflash,unit=1,format=raw,file="/efivars.fd" -accel kvm -cpu host -m 8096 -drive file=/work/disk.img,if=none,index=0,media=disk,format=qcow2,id=disk1 -device virtio-blk-pci,drive=disk1,bootindex=0 -boot order=dc -vga virtio -cpu host -smp cores=4,threads=1 -machine q35,smm=on -chardev socket,id=chrtpm,path=/tmp/swtpm-sock -tpmdev emulator,id=tpm0,chardev=chrtpm -device tpm-tis,tpmdev=tpm0 \$@' >> /entrypoint.sh
EOF
RUN chmod +x /entrypoint.sh
ENTRYPOINT [ "/entrypoint.sh" ]
DOCKER
```

2. Start a TPM socket:

```bash
docker run --privileged --entrypoint swtpm -v $PWD/tpmstate:/tmp --rm -ti fedora-qemu socket --tpmstate dir=/tmp/ --ctrl type=unixio,path=/tmp/swtpm-sock --log level=20 --tpm2
```

Note: you need to keep the TPM container up and running for the VM to boot. Run the commands below in another terminal window.

3. Run the container image with the ISO file (replace the iso file name with yours):

```bash
# console only
docker run --privileged -v $PWD/tpmstate:/tmp -v $PWD:/work -v /dev/kvm:/dev/kvm --rm -ti fedora-qemu -cdrom /work/kairos-fedora-38-core-amd64-generic-v3.0.0-alpha1.uki.iso -nographic
```

Note: To stop the QEMU container you can use `Ctrl-a x` or `Ctrl-a c` to enter the QEMU console and then `quit` to exit.

4. After installation, you can run the container image by booting only with the disk

```bash
# console only
docker run --privileged -v $PWD/tpmstate:/tmp -v $PWD:/work -v /dev/kvm:/dev/kvm --rm -ti fedora-qemu -nographic
```

Note: you need to keep the TPM container up and running for the VM to boot.

## Data Encryption

The user-data will be automatically encrypted during installation, along with the OEM and the persistent partition by using the TPM chip and the Trusted Boot mechanism.

### Additional partitions

Additional partitions can be encrypted and specified as part of the cloud-config used during the installation process, for example:

```yaml
install:
  extra-partitions:
    - name: second_partition
      size: 100
      fs: ext2
      label: PARTITION_TWO
  encrypted_partitions:
  - PARTITION_TWO
```

A full example can be:
```yaml
install:
  device: "auto" # Install to the biggest drive
  auto: true    # Enables auto installation
  partitions:
    persistent:
      size: 500 # Set persistent partition to 500MB (otherwise takes the whole disk)
  extra-partitions:
    - name: second_partition
      size: 100
      fs: ext2
      label: PARTITION_TWO
  encrypted_partitions:
  - PARTITION_TWO
```

### Notes

#### Mount partitions after install

`/oem` and `/usr/local` can be mounted after installation to prepare content before first-boot.

```bash
# Note: replace /dev/vda2 with the oem partition location (see with `blkid`)
# [root@ ~]# blkid 
# /dev/sr0: BLOCK_SIZE="2048" UUID="2024-02-05-17-00-05-00" LABEL="UKI_ISO_INSTALL" TYPE="iso9660"
# /dev/vda2: UUID="8bfa06f9-ca4f-56dc-90c9-49cf20f4f45e" TYPE="crypto_LUKS" PARTLABEL="oem" PARTUUID="63deb673-ec99-46f6-9cb6-8399315e4f19"
# /dev/vda3: UUID="85c39d0f-4867-5227-8334-f5eec606d9eb" TYPE="crypto_LUKS" PARTLABEL="persistent" PARTUUID="d01d9b51-d61a-4b7e-bb1a-8af5c212a213"
# /dev/vda1: LABEL_FATBOOT="COS_GRUB" LABEL="COS_GRUB" UUID="1C4C-97AA" BLOCK_SIZE="512" TYPE="vfat" PARTLABEL="efi" PARTUUID="6e42d80e-d67a-462b-b99c-2c1b5dda91cf"
# /dev/mapper/oem: LABEL="COS_OEM" UUID="d10fc63d-9387-442c-9db8-a00e081858ec" BLOCK_SIZE="1024" TYPE="ext4"

# Mount OEM
/usr/lib/systemd/systemd-cryptsetup attach oem /dev/vda2 - tpm2-device=auto
mount /dev/mapper/oem /oem

# Mount persistent
/usr/lib/systemd/systemd-cryptsetup attach persistent /dev/vda3 - tpm2-device=auto
mount /dev/mapper/persistent /usr/local
```

To mount `/oem` and `/usr/local` after install you can also manually call `kcrypt unlock-all`. However this isn't [supported yet](https://github.com/kairos-io/kairos/issues/2217).
