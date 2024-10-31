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

## Create an ISO

If you don't already have an ISO to boot, you can create one using the following script:

TODO:

- Templetize the version of the image below

```bash
#!/bin/bash

set -e

IMAGE="${IMAGE:-quay.io/kairos/ubuntu:24.04-core-amd64-generic-v3.2.1-uki}"
OSBUILDER_IMAGE="quay.io/kairos/osbuilder-tools:latest"
OUTDIR=$PWD/build
mkdir -p $OUTDIR/keys

cleanup() {
  # Run with docker to avoid sudo
 docker run --rm --entrypoint /bin/bash -v $PWD/build:/result $OSBUILDER_IMAGE -c 'rm -rf /result/*'
  rm -rf $OUTDIR
}

generateEfiKeys() {
  docker run --rm -v $OUTDIR/keys:/result $OSBUILDER_IMAGE genkey -e 7 --output /result KairosKeys
}

buildISO() {
  docker run --rm -v $OUTDIR:/result -v $OUTDIR/keys/:/keys  $OSBUILDER_IMAGE build-uki oci:$IMAGE --output-dir /result --keys /keys --output-type iso --boot-branding "KairosAI"
}

fixPermissions() {
   docker run --privileged -e USERID=$(id -u) -e GROUPID=$(id -g) --entrypoint /usr/bin/sh -v $OUTDIR:/workdir --rm $OSBUILDER_IMAGE -c 'chown -R $USERID:$GROUPID /workdir'
}

echo "Cleaning up old artifacts" && cleanup
echo "Generating UEFI keys" && generateEfiKeys
echo "Building ISO" && buildISO
echo "Fixing permissions" && fixPermissions
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

findInterface() {
    if [[ -n "$IFACE_NAME" ]]; then
        echo $IFACE_NAME
    elif command -v ip > /dev/null 2>&1; then
        echo $(ip link show | grep -o 'vboxnet[0-9]\+' | tail -n 1)
    elif command -v ifconfig > /dev/null 2>&1; then
        echo $(ifconfig -a | grep -o 'vboxnet[0-9]\+' | tail -n 1)
    else
        echo ""
    fi
}

findOrCreateBridge() {
    IFACE_NAME=$(findInterface)

    if [[ -z "$IFACE_NAME" ]]; then
        # If no such interface exists, create a new one
        if VBoxManage hostonlyif create > /dev/null 2>&1; then
           IFACE_NAME=$(findInterface)
        fi
    fi
}

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
    VBoxManage createvm --name "$VM_NAME" --ostype "Ubuntu24_LTS_arm64" --register
    VBoxManage modifyvm "$VM_NAME" \
        --memory 2000 \
        --cpus 1 \
        --chipset piix3 \
        --firmware efi \
        --nictype1 82540EM \
        --nic1 bridged \
        --tpm-type "2.0" \
        --graphicscontroller vmsvga \
        --boot1 disk \
        --boot2 dvd # doesn't work

    # Create a bridged network adapter
    # VBoxManage hostonlyif ipconfig "$IFACE_NAME" --ip 192.168.56.1
    VBoxManage modifyvm "$VM_NAME" --nic1 bridged --bridgeadapter1 "$IFACE_NAME" 

    VBoxManage createmedium disk --filename "$DISK_PATH" --size 40960
    VBoxManage storagectl "$VM_NAME" --name "SATA Controller" --add sata --controller IntelAhci
    VBoxManage storageattach "$VM_NAME" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium "$DISK_PATH"

    # Add an IDE controller for CD-ROM and attach the ISO
    VBoxManage storagectl "$VM_NAME" --name "IDE Controller" --add ide
    VBoxManage storageattach "$VM_NAME" --storagectl "IDE Controller" --port 0 --device 0 --type dvddrive --medium "$ISO_PATH"
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
            findOrCreateBridge
	    if [[ -z "$IFACE_NAME" ]]; then
              echo "Failed to find or create host-only network interface."
              echo "You need to pass an interface manually via the environment variable: IFACE_NAME"
              exit 1
            fi
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

echo $(run $@)
```

## Enroll the PK key

This is a manual process.

TODO: screenshots, process etc


