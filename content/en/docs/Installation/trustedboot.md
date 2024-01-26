---
title: "Trusted Boot Installations"
linkTitle: "Trusted Boot"
weight: 6
date: 2022-11-13
description: >
---


{{% alert title="Warning" %}}
This section is still a work in progress and only available in Kairos v3.x releases and alphas.
{{% /alert %}}

"Trusted Boot" is a combination of technologies that allows us to guarantee that a system was not tampered with, and the user-data is protected by cold attacks, it is composed by FDE, Secure Boot and Measured Boot.

If you want to learn more on what Trusted Boot is and how it works, see the [Trusted Boot Architecture]({{< relref "../architecture/trustedboot" >}}) page. This page describes how to enable Trusted Boot support in Kairos.

## Enable Trusted Boot in Kairos

Kairos supports Trusted boot by generating specific installable medium. This feature is optional and works alongside how Kairos works.

## Requirements

- Secure boot available in the system
- The Hardware should have a TPM chip or fTPM enabled
- The Hardware should be capable of booting large EFI files (>32MB)
- Base image of the OS needs to have at least systemd 252 or newer ( for example ubuntu >=23.04 or fedora >=38 )

## Usage

In order to boot into UKI mode, you need to build a special ISO file with the UKI files. To build this medium you have to generate a set of keypairs first: one for the Secure boot and one for the PCR policies required to encrypt the user-data.

Any change, or upgrade of the node to a new version of the OS requires those assets to be regenerated with these keypairs, including the installer ISO, and the EFI files used for upgrading. The keys are used to *sign* and *verify* the EFI files, and the PCR policies are used to *encrypt* and *decrypt* the user-data, and thus are required to be the same for the whole lifecycle of the node.

The steps below will guide you into generating the installable assets, and how to re-generate the assets to upgrade the node to a new version of the OS.

### Requirements

- Docker
- Git
- A Linux machine with KVM (for testing the images locally)

### Build the container image used to generate keys and installable medium

```bash
# Build the container image that will be used to generate the keys and installable medium
git clone https://github.com/kairos-io/enki.git
cd enki
docker build -t enki --target tools-image .
```

### Key generation

To generate the Secure boot certificates and keys run the following commands:

```bash
# Generate the keys
docker run -v $PWD/keys:/work/keys -ti --rm enki genkey "$MY_ORG" -o /work/keys
```

{{% alert title="Warning" %}}
It is very important to preserve the keys generated in this process in a safe place. Loosing the keys will prevent you to generate new images that can be used for upgrades.
{{% /alert %}}

### Enroll the keys in Secure Boot

If your machine is in UEFI setup mode Secure Boot keys will be automatically enrolled. 

If UEFI setup mode is not available, you need to enroll the keys manually in the BIOS/UEFI.

This process can vary depending on the vendor, but in general you need to enter the BIOS/UEFI setup during early boot and import the keys, for an example outline you can check the steps for [HPE Hardware](https://techlibrary.hpe.com/docs/iss/proliant-gen10-uefi/GUID-E4427875-D123-4BBF-9056-342168478A02.html).

A video of the process in QEMU is available [here](https://github.com/kairos-io/kairos/assets/2420543/e45f6a08-ec74-4cfd-bdf0-aeb7b23ac9bc).

### Building installable medium

To build the installable medium you need to run the following command:

{{% alert title="Warning" %}}

This method is still a work in progress.
For now build the testing Kairos iso with:

```bash
# clone the repo
git clone https://github.com/kairos-io/kairos

# cd into the repo
cd kairos

IMAGE=quay.io/kairos/fedora:38-core-amd64-generic-v3.0.0-alpha1

# build the iso with Earthly
earthly +uki-iso --BASE_IMAGE=$IMAGE

# resulting ISO is in: build/kairos-fedora-38-core-amd64-generic-v3.0.0-alpha1.uki.iso

# Multiple boot options
earthly +uki-iso --BASE_IMAGE=$IMAGE --ENKI_FLAGS="--cmdline rd.blacklist=i915"
```

{{% /alert %}}

```bash
CONTAINER_IMAGE=quay.io/kairos/fedora:38-core-amd64-generic-v3.0.0-alpha1
docker run --rm -v $PWD/build:/result -v $PWD/keys/:/keys enki build-uki $CONTAINER_IMAGE -o /result/trustedboot.iso -k /keys
```

### Installation

The installation process is performed as usual and the [Installation instructions]({{< relref "../installation" >}}) can be followed, however the difference is that user-data will be automatically encrypted (both the OEM and the persistent partition) by using the TPM chip and the Trusted Boot mechanism.

### Upgrades

In order to upgrade a node to a new version of the OS, you need to generate again the installable medium with the same keys used in the steps before. The process will generate an EFI file which we will pack into a container image that will be used to upgrade the node.

To generate the upgrade image you need to create a naked container image containing containing the EFI files, for example:

{{% alert title="Warning" %}}
Flow not entirely tested/validated yet
{{% /alert %}}

```bash
VERSION=v3.0.0-alpha2
UKI=kairos-fedora-38-core-amd64-generic-v${VERSION}.efi
UPGRADE_IMAGE=ttl.sh/kairos-uki-tests/upgrade-image
EFI_FILE=/path/to/efi/file

mkdir upgrade-image
mkdir -p upgrade-image/loader/entries
mkdir -p upgrade-image/EFI/kairos/

mv $EFI_FILE upgrade-image/EFI/kairos/${UKI}

# default @saved
cat <<EOF > upgrade-image/loader/loader.conf
default kairos-$VERSION.conf
timeout 5
console-mode max
editor no
EOF

cat <<EOF > upgrade-image/loader/entries/kairos-$VERSION.conf
title Kairos $VERSION
efi /EFI/kairos/$UKI.efi
version $VERSION
EOF

cd upgrade-image
docker build -t $UPGRADE_IMAGE -<<DOCKER
FROM scratch
COPY . /
DOCKER
```

### Testing the images locally

To test the ISO file locally QEMU can be used. In order to test Secure Boot components you need an ed2k firmware with secureboot in QEMU. If you don't have QEMU locally and/or you don't have the correct dependencies you can follow the steps below that build a container image with QEMU and the needed dependencies and uses it to run the ISO file.

1. Build the container image with the dependencies (note to replace disk, VM size and ISO file name):

```bash
docker build -t fedora-qemu -<<DOCKER
FROM fedora
RUN dnf install -y dnf-plugins-core
RUN dnf config-manager --add-repo http://www.kraxel.org/repos/firmware.repo
RUN dnf install -y edk2.git-ovmf-x64 qemu
RUN dnf install -y swtpm wget
WORKDIR /
RUN wget https://github.com/kairos-io/kairos/raw/master/tests/assets/efivars.fd
WORKDIR /work

RUN <<EOF
echo "#!/bin/bash -ex" >> /entrypoint.sh
echo 'nohup swtpm socket --tpmstate dir=/tmp/ --ctrl type=unixio,path=/tmp/swtpm-sock --log level=20 --tpm2 &>/dev/null & ' >> /entrypoint.sh
echo '[ ! -e /work/disk.img ] && qemu-img create -f qcow2 "/work/disk.img" 8G' >> /entrypoint.sh
echo '/usr/bin/qemu-system-x86_64 -drive if=pflash,format=raw,unit=0,file="/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd",readonly=on -drive if=pflash,unit=1,format=raw,file="/efivars.fd" -accel kvm -cpu host -m 8096 -drive file=/work/disk.img,if=none,index=0,media=disk,format=qcow2,id=disk1 -device virtio-blk-pci,drive=disk1,bootindex=0 -boot order=dc -vga virtio -cpu host -smp cores=4,threads=1 -machine q35,smm=on -chardev socket,id=chrtpm,path=/tmp/swtpm-sock -tpmdev emulator,id=tpm0,chardev=chrtpm -device tpm-tis,tpmdev=tpm0 \$@' >> /entrypoint.sh
EOF
RUN chmod +x /entrypoint.sh
ENTRYPOINT [ "/entrypoint.sh" ]
DOCKER
```

2. Run the container image with the ISO file:

```bash
# console only
docker run --privileged -v $PWD:/work -v /dev/kvm:/dev/kvm --rm -ti fedora-qemu -cdrom /work/kairos-fedora-38-core-amd64-generic-v3.0.0-alpha1.uki.iso -nographic

# GTK (insecure)
# xhost si:localuser:root # give access to root account to connect to the X server socket
# docker run -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix --privileged -v $PWD:/work -v /dev/kvm:/dev/kvm --rm -ti fedora-qemu -cdrom /work/kairos-fedora-38-core-amd64-generic-v3.0.0-alpha1.uki.iso
```

Note: To stop the QEMU container you can use `Ctrl-a x` or `Ctrl-a c` to enter the QEMU console and then `quit` to exit.

### Data Encryption

The user-data will be automatically encrypted during installation, along with the OEM and the persistent partition by using the TPM chip and the Trusted Boot mechanism.

#### Additional partitions

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
