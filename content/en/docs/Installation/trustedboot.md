---
title: "Trusted Boot Installations"
linkTitle: "Trusted Boot"
description: Learn how to enable Trusted Boot with Secure Boot, full disk encryption, and measured boot to protect systems from tampering.
weight: 6
date: 2022-11-13
---

"Trusted Boot" is a combination of technologies that allows us to guarantee that a system was not tampered with, and the user-data is protected by cold attacks, it is composed by FDE, Secure Boot and Measured Boot.

If you want to learn more on what Trusted Boot is and how it works, see the [Trusted Boot Architecture]({{< relref "../architecture/trustedboot" >}}) page. This page describes how to enable Trusted Boot support in Kairos.

Kairos supports Trusted boot by generating specific installable medium. This feature is optional and works alongside how Kairos works.

## Requirements

The Hardware that will run Kairos needs to have the following requirements:

- Secure boot available in the system
- The Hardware should have a TPM chip or fTPM enabled
- Fast boot disabled at BIOS level ( See also https://github.com/kairos-io/kairos/issues/2579 )
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

## Key generation

Keys can be generated from scratch, or the Microsoft certificates can be used, alternatively, if you can export the keys from your BIOS/UEFI you can use the same PK keys.

By default keys are generated including the Microsoft ones, but you can skip them if you know what you are doing (see below).

To generate the Secure boot certificates and keys along with the Microsoft keys run the following commands:

```bash
MY_ORG="Acme Corp"
# Generate the keys
docker run -v $PWD/keys:/work/keys -ti --rm {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} genkey --expiration-in-days 365 -o /work/keys "$MY_ORG"
```
{{% alert title="Warning" color="warning" %}}
Substitute `$MY_ORG` for your own string, this can be anything but it help identifying the Keys. The keys duration can specified with `--expiration-in-days`. It is not possible to create keys that do not expire, but it is possible to specify an extremely large value (e.g. 200 years, etc.)
{{% /alert %}}

{{% alert title="Warning" color="warning" %}}
It is very important to preserve the keys generated in this process in a safe place. Loosing the keys will prevent you to generate new images that can be used for upgrades.
{{% /alert %}}

### Custom certificates by skipping Microsoft certificate keys

{{% alert title="Warning" color="warning" %}}
Some firmware is signed and verified with Microsoft's or other vendor keys when secure boot is enabled. Removing those keys could brick them. It is preferable to not use the Microsoft certificates for precaution and security reasons, however as this might be potentially a dangerous action, only do this if you know what you are doing. To check if your firmware is signed with Microsoft's keys, you can check https://github.com/Foxboron/sbctl/wiki/FAQ#option-rom. See also: https://wiki.archlinux.org/title/Unified_Extensible_Firmware_Interface/Secure_Boot#Enrolling_Option_ROM_digests.
{{% /alert %}}

If your hardware supports booting with custom Secure Boot keys, you can optionally create keys from scratch and skip the Microsoft certificate keys. To do so, run the following command:

```bash
MY_ORG="Acme Corp"
# Generate the keys
docker run -v $PWD/keys:/work/keys -ti --rm {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} genkey --skip-microsoft-certs-I-KNOW-WHAT-IM-DOING --expiration-in-days 365 -o /work/keys "$MY_ORG"
```

### Exporting keys from BIOS/UEFI and using them

This is useful if you want to handle mass-installations where you don't want to enroll the generated keys manually in your bios/uefi.

Some hardware might require additional vendor keys, that could be e.g. used to sign additional firmware. In order to re-use the same set of keys in the machine, you can export the keys from the BIOS/UEFI and use them to generate the UKI files.

Some BIOS/UEFI allows to export the keys to USB stick directly from the BIOS/UEFI setup menu (for example [HPE](https://techlibrary.hpe.com/docs/iss/proliant-gen10-uefi/GUID-26E9F167-8061-4D85-9A0A-B610D00DFA3B.html)). If you have the keys in a USB stick, you can copy in a directory and use them to generate the UKI files.

```bash
MY_ORG="Acme Corp"
MACHINE_CERTS="$PWD/path/to/machine-certs"
# ~$ tree $MACHINE_CERTS
# /path/to/machine-certs/
# ├── db
# ├── dbx
# ├── KEK
# └── PK

# Generate the keys
docker run -v $MACHINE_CERTS:/work/machine-keys -v $PWD/keys:/work/keys -ti --rm quay.io/kairos/auroraboot:{{< auroraBootVersion >}} genkey --custom-cert-dir /work/machine-keys --expiration-in-days 365 -o /work/keys "$MY_ORG"
```

{{% alert title="Warning" color="warning" %}}

This command can be combined with the `--skip-microsoft-certs-I-KNOW-WHAT-IM-DOING` flag to avoid auto-enrolling the Microsoft keys if not needed (or already present in the "custom certs")

{{% /alert %}}

## Using a hardware key for signing

You can use hardware keys which are compatible with the *PKCS #11* standard,  like for example a [nitrokey](https://www.nitrokey.com/) to sign the UKI files. In order to do so, you need to have the keys generated in the hardware key and then generate a certificate signed by the key like so:


Generate your key in the hardware key, for example with a nitrokey:

```bash
gpg --card-edit
# In the gpg console, run the following commands:
admin
generate
# Follow the instructions to generate the key, you can use the default values
# After the key is generated, you can run the following command to list the keys:
$ pkcs11-tool --module opensc-pkcs11.so -L                        
Available slots:
Slot 0 (0x0): Nitrokey Nitrokey Start (FSIJ-1.2.19-C5B562D9) 00 00
  token label        : OpenPGP card (User PIN)
  token manufacturer : OpenPGP project
  token model        : PKCS#15 emulated
  token flags        : login required, rng, token initialized, PIN initialized
  hardware version   : 2.0
  firmware version   : 2.0
  serial num         : fffec5b562d9
  pin min/max        : 6/127
  uri                : pkcs11:model=PKCS%2315%20emulated;manufacturer=OpenPGP%20project;serial=fffec5b562d9;token=OpenPGP%20card%20%28User%20PIN%29
Slot 1 (0x1): Nitrokey Nitrokey Start (FSIJ-1.2.19-C5B562D9) 00 00
  token label        : OpenPGP card (User PIN (sig))
  token manufacturer : OpenPGP project
  token model        : PKCS#15 emulated
  token flags        : login required, rng, token initialized, PIN initialized
  hardware version   : 2.0
  firmware version   : 2.0
  serial num         : fffec5b562d9
  pin min/max        : 6/127
  uri                : pkcs11:model=PKCS%2315%20emulated;manufacturer=OpenPGP%20project;serial=fffec5b562d9;token=OpenPGP%20card%20%28User%20PIN%20%28sig%29%29
# You can use the slot-id and id to refer to the key in the hardware key
# For example, to refer to the key in slot 1, you can use the following pkcs11 url:
# pkcs11:slot-id=1;id=%01
```


Now create your SSL config in order to use the hardware key to sign the certificate:
```bash
$ cat <<EOF > openssl-pkcs11.conf
openssl_conf = openssl_init

[openssl_init]
providers = provider_sect

[provider_sect]
default = default_sect
base = base_sect
pkcs11 = pkcs11_sect

[default_sect]
activate = 1

[base_sect]
activate = 1

[pkcs11_sect]
activate = 1
pkcs11-module-path = /usr/lib/pkcs11/opensc-pkcs11.so # Change to the path of yours, can differ by OS
EOF
```

Generate a certificate signing request (CSR) with the private key in the hardware key:
```bash
$ OPENSSL_CONF=openssl-pkcs11.conf openssl req -new  -key "pkcs11:slot-id=1;id=%01" \
    -sha256 -out nitrokey.csr.pem -subj "/CN=SecureBoot Key/"
```

> You can append ;pin-value=<YOUR USER PIN> to the pkcs11 url to not have to write it. If you don't add it, openssl will ask you for it

Sign the CSR with the private key in the hardware key:
```bash
$ OPENSSL_CONF=openssl-pkcs11.conf openssl x509 -req -days 3650 -in nitrokey.csr.pem \
    -signkey "pkcs11:slot-id=1;id=%01" -out nitrokey.crt.pem

Now you can use the hardware key and certificate to sign the UKI files.

## Building installable medium

To build the installable medium you need to run the following commands:

{{< tabpane text=true  >}}
{{% tab header="From a container image" %}}
```bash {class="only-flavors=Ubuntu+24.04,Fedora+40"}
CONTAINER_IMAGE={{<oci variant="core">}}-uki
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT $CONTAINER_IMAGE
# to build an EFI file only
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t uki -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT $CONTAINER_IMAGE
```
{{% /tab %}}
{{% tab header="From a directory" %}}
```bash
# Assuming you have a "rootfs" directory with the content of the OS
# If the image is in a directory ($PWD/rootfs) you can use the following command
docker run -ti --rm -v $PWD/build:/result -v $PWD/rootfs:/rootfs -v $PWD/keys/:/keys quay.io/kairos/auroraboot:{{< auroraBootVersion >}} build-uki -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT dir:/rootfs/
```
{{% /tab %}}
{{< /tabpane >}}


Let's explain some of the flags used here, especially the ones related to Trusted Boot keys:

- `-t iso` specifies that the output should be an installable medium (ISO file). You can use `-t uki` to generate an EFI file only. Or `-t container` to generate a container image with the UKI files on it, perfect to push to a remote registry for upgrades.\
- `-d /result/` specifies the output directory where the output type will be saved.
- `--tpm-pcr-private-key` specifies the path to the private key used to sign the PCR policies. This is required for the user-data encryption.
- `--sb-key` specifies the path to the Secure Boot key used to sign the UKI files.
- `--sb-cert` specifies the path to the Secure Boot certificate used to sign the UKI files.
- `--public-keys /keys` specifies the directory where the public keys are stored. These are the keys that are auto enrolled on first boot. They are 3 (DB,KEK, PK) and are in .auth format.


{{% alert title="Keys format" color="info" %}}
The .auth format in Secure Boot refers to EFI Signature Lists (ESLs) wrapped in an authentication structure, which allows UEFI firmware to verify and install Secure Boot keys securely. These files are used when manually enrolling Secure Boot keys into a UEFI system, typically through the firmware setup interface. `.auth` files are signed versions of `.esl` files. An `.esl` file is a binary format defined by the UEFI specification that wraps one or more EFI Signature Data entries (usually X.509 certs or SHA256 hashes).
{{% /alert %}}

For a more secure process you can use a hardware key to generate and sign the certificate and sign the EFI files, so you dont need to keep the private key in the filesystem.

To do so, `--sb-key` accepts a pkcs11 url, for example:

```bash
docker run -ti --rm -v /run/pcscd:/run/pcscd -v $PWD/build:/result -v $PWD/keys/:/keys quay.io/kairos/auroraboot:{{< auroraBootVersion >}} build-uki -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key "pkcs11:slot-id=1;id=%01" --sb-cert $PATH_TO_SB_CERT $CONTAINER_IMAGE
```

{{% alert title="Warning" color="warning" %}}
Notice that for this to work you need to have the `pcscd` service running in your system, and the hardware key must be connected to the system.
The command mounts the `/run/pcscd` directory to the container, so that the container can access the hardware key.
{{% /alert %}}

For more info about pkcs11 urls, see the [RFC 7512](https://www.rfc-editor.org/rfc/rfc7512.html) which describes the format of the pkcs11 urls.

## Bundling system extensions during the installable medium build

System extensions can be bundled in the installable medium. To bundle system extensions, you need to create a new image with the extensions you want to add. System extensions are bundled in the root on the media install. When building your Trusted Boot image, you can add the system extensions to the iso by using the `--overlay-iso` flag and pointing it to the directory containing the system extensions.

{{< tabpane text=true  >}}
{{% tab header="From a container image" %}}
```bash {class="only-flavors=Ubuntu+24.04,Fedora+40"}
# Assuming your system extensions are stored on $PWD/system-extensions
CONTAINER_IMAGE={{<oci variant="core">}}-uki
docker run -ti --rm -v $PWD/system-extensions:/system-extensions -v $PWD/build:/result -v $PWD/keys/:/keys {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT --overlay-iso /system-extensions $CONTAINER_IMAGE
# to build an EFI file only
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t uki -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT $CONTAINER_IMAGE
```
{{% /tab %}}
{{% tab header="From a directory" %}}
```bash
# Assuming you have a "rootfs" directory with the content of the OS
# If the image is in a directory ($PWD/rootfs) you can use the following command
# Assuming your system extensions are stored on $PWD/system-extensions
docker run -ti --rm -v $PWD/system-extensions:/system-extensions -v $PWD/build:/result -v $PWD/rootfs:/rootfs -v $PWD/keys/:/keys {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT --overlay-iso /system-extensions dir:/rootfs/
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

You can overwrite the default "Kairos" title if you pass the `--boot-branding` flag to auroraboot.


```bash {class="only-flavors=Ubuntu+24.04,Fedora+40"}
CONTAINER_IMAGE={{<oci variant="core">}}-uki
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT --boot-branding "My Awesome OS" $CONTAINER_IMAGE
```

Your config file should look now like this:


```
# cat /efi/loader/entries/active.conf
efi /EFI/kairos/active.efi
title My Awesome OS
```

You can use a custom boot splash screen by specifying the  `--splash` flag when calling auroraboot.

```bash {class="only-flavors=Ubuntu+24.04,Fedora+40"}
CONTAINER_IMAGE={{<oci variant="core">}}-uki
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys -v $PWD/splash/:/splash {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT --boot-branding "My Awesome OS" --splash /splash/my-awesome-splash.bmp $CONTAINER_IMAGE
```


{{% alert title="Info" color="success" %}}
Splash images must be provided in 32 bit BMP format, no other image formats besides BMP are supported.
{{% /alert %}}


{{% alert title="Warning" color="warning" %}}
Remember when you build upgrade mediums, to also add your branding, otherwise the new active image will be named differently than your fallback and recovery ones.
{{% /alert %}}

### Version and cmdline in the config files

In addition to having the "title" and "efi" attributes, you can include in the config files the OS "version" and "cmdline". To do so, pass `--include-version-in-config` or `--include-cmdline-in-config` flags to auroraboot.

{{% alert title="Info" color="success" %}}
The cmdline, will only show what is different between the default cmdline and the currently used cmdline. If you pass `--include-cmdline-in-config` to a default installation, the attribute cmdline will be empty.
{{% /alert %}}

```
cmdline awesome=true
title Awesome OS
efi /EFI/kairos/active.efi
version {{< kairosVersion>}}
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

1. Build the container image with the QEMU/Secure Boot dependencies (note to replace disk size/cpu/ram not needed):

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

```bash {class="only-flavors=Ubuntu+24.04,Fedora+40"}
# console only
docker run --privileged -v $PWD/tpmstate:/tmp -v $PWD:/work -v /dev/kvm:/dev/kvm --rm -ti fedora-qemu -nographic -cdrom kairos-@flavor-@flavorRelease-core-amd64-generic-{{< kairosVersion>}}.uki.iso
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

## Notes

### Install additional files from the Installer ISO to the encrypted portions

The ISO installer images can be used to install additional content in the encrypted portion of the disk.

The osbuilder image can overlay additional files into the iso. For example specify `--overlay-iso /additional/path` to have added the files in the folder inside the ISO. The content can be accessed during installation in `/run/initramfs/live`.
For example, to install content of the ISO inside the OEM partition, and to restore those after a reset we can use the following cloud config:

```yaml
#cloud-config

install:
  device: "/dev/vda"
  auto: true
  partitions:
    oem:
      size: 4000
      fs: ext4

users:
- name: "kairos"
  passwd: "kairos"

stages:
  after-install:
      - commands:
        - echo "Copying files to oem and persistent"
        - /usr/lib/systemd/systemd-cryptsetup attach persistent $(findfs PARTLABEL=persistent) - tpm2-device=auto
        - /usr/lib/systemd/systemd-cryptsetup attach oem $(findfs PARTLABEL=oem) - tpm2-device=auto
        - mount /dev/mapper/persistent /usr/local
        - mount /dev/mapper/oem /oem
        - mkdir -p /usr/local/.state/opt.bind
        - mkdir -p /oem/opt.bind
        - cp -rfv /run/initramfs/live/data/* /usr/local/.state/opt.bind
        - cp -rfv /run/initramfs/live/data/* /oem/opt.bind
        - umount /dev/mapper/persistent
        - umount /dev/mapper/oem
        - cryptsetup close /dev/mapper/persistent
        - cryptsetup close /dev/mapper/oem

  after-reset:
      - commands:
        - |
          /bin/bash <<'EOF'
          #!/bin/bash

          set -e
          echo "Copying files from oem to persistent"
          # /oem was mounted in my tests. Let's umount it to be sure.
          umount /oem || true
          # Close all encrypted partitions
          for p in $(ls /dev/mapper/vda*); do cryptsetup close $p; done
          /usr/lib/systemd/systemd-cryptsetup attach persistent $(findfs PARTLABEL=persistent) - tpm2-device=auto
          /usr/lib/systemd/systemd-cryptsetup attach oem $(findfs PARTLABEL=oem) - tpm2-device=auto
          mount /dev/mapper/persistent /usr/local
          mount /dev/mapper/oem /oem
          mkdir -p /usr/local/.state/opt.bind
          cp -rfv /oem/opt.bind/* /usr/local/.state/opt.bind
          umount /dev/mapper/persistent
          umount /dev/mapper/oem
          cryptsetup close /dev/mapper/persistent
          cryptsetup close /dev/mapper/oem

          EOF
```

### Mount partitions after install

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
/usr/lib/systemd/systemd-cryptsetup attach oem $(findfs PARTLABEL=oem) - tpm2-device=auto
mount /dev/mapper/oem /oem

# Mount persistent
/usr/lib/systemd/systemd-cryptsetup attach persistent $(findfs PARTLABEL=persistent) - tpm2-device=auto
mount /dev/mapper/persistent /usr/local
```

To mount `/oem` and `/usr/local` after install you can also manually call `kcrypt unlock-all`. However this isn't [supported yet](https://github.com/kairos-io/kairos/issues/2217).

### Force certificates auto-enrollments

{{% alert title="Warning" color="warning" %}}
Don't run auto-enrollments by default! this option is here after you are sure that the certificates generated are correct and after you have verified that manuall enrolling the certificates does not brick your device!

This is specific for large-scale deployments to generate auto-installing ISOs that are meant to be used on similar hardware multiple times (thus the process only needs to be manually verified once).
{{% /alert %}}

If you want to force the auto-enrollment of the certificates in the BIOS/UEFI, you can use the `--secure-boot-enroll` flag in the `build-uki` command.

```bash {class="only-flavors=Ubuntu+24.04,Fedora+40"}
CONTAINER_IMAGE={{<oci variant="core">}}-uki
docker run -ti --rm -v $PWD/build:/result -v $PWD/keys/:/keys {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki --secure-boot-enroll force -t iso -d /result/ --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT $CONTAINER_IMAGE
```

### Additional efi entries

When booting in UKI mode, the cmdline is part of the signed artifact. This means that in order to pass additional options through the cmdline,
this has to be done at build time. For that reason, `auroraboot build-uki` supports the following arguments:

- `--extend-cmdline`: Use this option to add cmdline parameters to the default entries (active/passive/recovery/auto-reset). This option will not generate additional entries in the systemd-boot menu.
- `--extra-cmdline`: Use this option to generate additional entries in the systemd-boot menu. For each one of the default entries, a new entry will be created with the specified cmdline (added to the default cmdline).
- `--single-efi-cmdline`: Use this option to generate entries that are not related to default ones. This option will generate a single entry with the provided cmdline (added to the default cmdline). This argument can be used multiple times.

Examples:

Building with a command like this:

```
auroraboot build-uki ...more options... --single-efi-cmdline "Lets debug: rd.debug rd.immucore.debug"
```

Will create a boot menu with the default entries, plus one more: "Lets debug" which will have the debug parameters set.
Notice how the title of the entry and the cmdline to be used are split by a colon.

Building with a command like this:

```
auroraboot build-uki ...more options... --extra-cmdline "rd.debug rd.immucore.debug"
```

Will create a boot menu with the default entries, plus one more for each of the active/passive/recovery entries. Each of these entries will have the debug parameters set.

Building with a command like this:

```
auroraboot build-uki ...more options... --extend-cmdline "rd.debug rd.immucore.debug"
```

Will create a boot menu with just the default entries but this time they will have the debug parameters set.

NOTE: `--boot-branding` is applied to `--single-efi-cmdline` too. For example, this command:

```
auroraboot build-uki ...more options... --boot-branding "My awesome OS" --single-efi-cmdline "Debug logs: rd.debug rd.immucore.debug"
```

will create this entry:

```
My awesome OS (Debug logs)
```

with the additional cmdline parameters.
