---
title: "Kairos Trusted Boot in Virtual Box"
linkTitle: "Kairos Trusted Boot in Virtual Box"
weight: 1
description: This section describes how to use Virtual Box to boot Kairos in "Trusted boot" mode
---

To install Kairos in [trusted boot mode]() ... TODO

## Enroll the PK key

This is a manual process.

TODO: screenshots, process etc


## Create a VM

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
    VBoxManage createvm --name "$VM_NAME" --ostype "Linux_64" --register
    VBoxManage modifyvm "$VM_NAME" \
        --memory 10000 \
        --cpus 3 \
        --chipset piix3 \
        --firmware efi \
        --nictype1 82540EM \
        --nic1 nat \
        --bridgeadapter1 en0 \
        --tpm-type "2.0" \
        --boot1 disk \
        --boot2 dvd

    VBoxManage createmedium disk --filename "$DISK_PATH" --size 40960
    VBoxManage storagectl "$VM_NAME" --name "SATA Controller" --add sata --controller IntelAhci
    VBoxManage storageattach "$VM_NAME" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium "$DISK_PATH"

    # Add an IDE controller for CD-ROM and attach the ISO
    VBoxManage storagectl "$VM_NAME" --name "IDE Controller" --add ide
    VBoxManage storageattach "$VM_NAME" --storagectl "IDE Controller" --port 0 --device 0 --type dvddrive --medium "$ISO_PATH"
}

cleanup
createVM
VBoxManage startvm "$VM_NAME"
```
