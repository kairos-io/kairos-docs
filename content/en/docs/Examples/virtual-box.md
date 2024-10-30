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

## Create a VM

```bash
#!/bin/bash

set -e

VM_NAME="KairosAI"
ISO_PATH=$PWD/kairos.iso
DISK_PATH=$PWD/Kairos.vdi

findOrCreateBridge() {
    # Check for an existing interface that starts with "vboxnet"
    existing_iface=$(ip link show | grep -o 'vboxnet[0-9]\+')

    if [[ -n "$existing_iface" ]]; then
        # If an interface was found, return its name
        echo "$existing_iface"
    else
        # If no such interface exists, create a new one
        VBoxManage hostonlyif create > /dev/null 2>&1

        # Capture the name of the newly created interface
        new_iface=$(ip link show | grep -o 'vboxnet[0-9]\+' | tail -n 1)

        # Return the name of the new interface
        echo "$new_iface"
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
    VBoxManage createvm --name "$VM_NAME" --ostype "Linux_64" --register
    VBoxManage modifyvm "$VM_NAME" \
        --memory 10000 \
        --cpus 3 \
        --chipset piix3 \
        --firmware efi \
        --nictype1 82540EM \
        --nic1 bridged \
        --tpm-type "2.0" \
        --boot1 disk \
        --boot2 dvd # doesn't work

    # Create a bridged network adapter
    bridgeInterface=$(findOrCreateBridge)
    VBoxManage hostonlyif ipconfig "$bridgeInterface" --ip 192.168.56.1
    VBoxManage modifyvm "$VM_NAME" --nic1 bridged --bridgeadapter1 "$bridgeInterface"

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

## Enroll the PK key

This is a manual process.

TODO: screenshots, process etc


