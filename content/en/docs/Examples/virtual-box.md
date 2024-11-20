---
title: "Kairos Trusted Boot in Virtual Box"
linkTitle: "Kairos Trusted Boot in Virtual Box"
weight: 1
description: This section describes how to use Virtual Box to boot Kairos in "Trusted boot" mode
---

To install Kairos in ["Trusted Boot Mode"]({{< relref "../architecture/trustedboot" >}}) the machine needs to meet the following requirements:

- Must have a tpm v2.0 chip
- Must be able to boot in EFI mode (not "legacy BIOS")
- Must have 1Gb of RAM or more
- Must have 40Gb of disk or more

The following steps describe how to create a virtual machine suitable for Kairos
trusted boot setup, using [VirtualBox](https://www.virtualbox.org/).
As an example workload, [LocalAI](https://localai.io/) will be used.

## Create an ISO

If you don't already have an ISO to boot, you can create one using the following script:

```bash
#!/bin/bash

set -e

IMAGE="${IMAGE:-{{< registryURL >}}/ubuntu:24.04-core-amd64-generic-{{< kairosVersion >}}-uki}"
AURORABOOT_IMAGE="{{< registryURL >}}/auroraboot:latest"
OUTDIR=$PWD/build

cleanup() {
  # Run with docker to avoid sudo
  docker run --rm --entrypoint /bin/bash -v $PWD/build:/result $AURORABOOT_IMAGE -c 'rm -rf /result/*'
  rm -rf $OUTDIR
}

generateEfiKeys() {
  mkdir -p $OUTDIR/keys
  docker run --rm -v $OUTDIR/keys:/result $AURORABOOT_IMAGE genkey -e 7 --output /result KairosKeys
}

generateConfig() {
  mkdir -p $OUTDIR/config
  cat << EOF > "$OUTDIR/config/config.yaml"
#cloud-config

users:
  - name: kairos
    passwd: kairos
    groups:
      - admin

install:
  auto: true
  reboot: true

stages:
  initramfs:
    - files:
        - path: /etc/systemd/system/localai.service
          permissions: 0644
          content: |
            [Unit]
            Description=Local AI server
            After=network-online.target
            Wants=network-online.target

            [Service]
            Type=simple
            ExecStart=/usr/bin/localai --models-path="/usr/local/models"
            Restart=on-failure
            RestartSec=10

            [Install]
            WantedBy=multi-user.target
  boot:
    - name: "Starting localai"
      commands:
        - |
          systemctl enable localai.service
          systemctl start localai.service
EOF

}

buildBaseImage() {
  docker build -t kairos-localai - <<EOF
  FROM $IMAGE
  RUN curl -L -o localai https://github.com/mudler/LocalAI/releases/download/v2.22.1/local-ai-Linux-x86_64
  RUN chmod +x localai
  RUN mv localai /usr/bin/localai
EOF
}

buildISO() {
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v $OUTDIR:/result \
    -v $OUTDIR/keys/:/keys  \
    -v $OUTDIR/config/:/config \
    $AURORABOOT_IMAGE build-uki \
    --output-dir /result \
    --keys /keys \
    --output-type iso \
    --boot-branding "KairosAI" \
    --overlay-iso /config \
    --extend-cmdline "rd.immucore.debug rd.debug rd.shell" \
    oci://kairos-localai
}

fixPermissions() {
  docker run --privileged -e USERID=$(id -u) -e GROUPID=$(id -g) --entrypoint /usr/bin/sh -v $OUTDIR:/workdir --rm $AURORABOOT_IMAGE -c 'chown -R $USERID:$GROUPID /workdir'
}

moveISOFile() {
  mv build/kairos*.iso ./kairos.iso
}

echo "Cleaning up old artifacts" && cleanup
echo "Generating Config" && generateConfig
echo "Generating UEFI keys" && generateEfiKeys
echo "Building base image" && buildBaseImage
echo "Building ISO" && buildISO
echo "Fixing permissions" && fixPermissions
echo "Moving iso to current dir" && moveISOFile
```

If the script succeeds, you will find a `.iso` file inside `$PWD/build` and a
keys directory with the UEFI keys used to sign the image.

## Create a VM

{{< alert color="warning" title="Warning" >}}
On macOS you need to make sure you install the VirtualBox Extension Pack to enable USB 2.0 and USB 3.0 support.

https://www.virtualbox.org/wiki/Downloads
{{< /alert >}}

```bash
#!/bin/bash

set -e

VM_NAME="KairosAI"
ISO_PATH=$PWD/kairos.iso
DISK_PATH=$PWD/Kairos.vdi

cleanup() {
    if VBoxManage list vms | grep -q "\"$VM_NAME\""; then
        echo "VM '$VM_NAME' found. Proceeding with cleanup."

        # Check if the VM is running
        if VBoxManage list runningvms | grep -q "\"$VM_NAME\""; then
            echo "VM '$VM_NAME' is running. Powering off..."
            VBoxManage controlvm "$VM_NAME" poweroff
            sleep 2  # Wait for a moment to ensure the VM powers off
        fi

        # Unregister and delete the VM and all associated files
        echo "Unregistering and deleting VM '$VM_NAME'..."
        VBoxManage unregistervm "$VM_NAME" --delete

        echo "Cleanup complete. VM '$VM_NAME' and associated files have been deleted."
    else
        echo "No VM named '$VM_NAME' found. No action needed."
    fi
}

createVM() {
    if [[ $(uname -m) == "x86_64" ]]; then
        ostype="Linux_64"
    else
        ostype="Linux_arm64"
    fi
    VBoxManage createvm --name "$VM_NAME" --ostype "$ostype" --register
    VBoxManage modifyvm "$VM_NAME" \
        --memory 10000 \
        --cpus 2 \
        --chipset piix3 \
        --firmware efi64 \
        --nictype1 82540EM \
        --nic1 nat \
        --natpf1 "guestssh,tcp,,2222,,22" \
        --natpf1 "localai,tcp,,8080,,8080" \
        --tpm-type "2.0" \
        --graphicscontroller vmsvga
        # These don't work of efi
        # https://www.virtualbox.org/ticket/19364
        #--boot1 disk \
        #--boot2 dvd

    VBoxManage createmedium disk --filename "$DISK_PATH" --size 40960
    VBoxManage storagectl "$VM_NAME" --name "SATA Controller" --add sata --controller IntelAhci
    VBoxManage storageattach "$VM_NAME" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium "$DISK_PATH"

    # Add an IDE controller for CD-ROM and attach the ISO
    VBoxManage storagectl "$VM_NAME" --name "IDE Controller" --add ide
    VBoxManage storageattach "$VM_NAME" --storagectl "IDE Controller" --port 0 --device 0 --type dvddrive --medium "$ISO_PATH"

    # Hack to allow enrolling the PK key
    # Not sure why, but only this works. We allow it to boot once,
    # probably some default UEFI vars are written on the first boot which then
    # allow us to just enroll our PK key.
    # Also, it only works after adding disks and all (that's why it's here at the end).
    # Probably because it needs the cdrom to enroll some of the keys except the PK (?)
    VBoxManage startvm "$VM_NAME" --type=headless && sleep 3
    VBoxManage controlvm "$VM_NAME" poweroff && sleep 3
    VBoxManage modifynvram $VM_NAME enrollpk ‑‑platform‑key=$PWD/build/keys/PK.der ‑‑owner‑uuid=KairosKeys
}

usage() {
    echo "Usage: $0 {create|start|stop|cleanup}"
}

run() {
    # Check if a command was provided
    if [ -z "$1" ]; then
        usage
        exit 1
    fi

    # Determine which command to run based on the first argument
    case "$1" in
        create)
            createVM
            ;;
        start)
            VBoxManage startvm "$VM_NAME"
            ;;
        stop)
            VBoxManage controlvm "$VM_NAME" poweroff
            ;;
        cleanup)
            cleanup
            ;;
        *)
            echo "Invalid command: $1"
            usage
            exit 1
            ;;
    esac
}

run $@
```

## Change boot order

Unfortunately, Virtual box doesn't support changing boot order in efi mode (https://www.virtualbox.org/ticket/19364).
This means, after installation, the order needs to change manually, in order to boot from the disk instead of the cdrom (iso).

## Use localai web UI

Visit http://127.0.0.1:8080 from your browser to use LocalAI web UI
