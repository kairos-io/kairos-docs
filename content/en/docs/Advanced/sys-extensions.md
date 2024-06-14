---
title: "Extending the system with systemd extensions"
linkTitle: "Extending the system with systemd extensions"
weight: 3
---


{{% alert title="Warning" %}}
This feature is in preview state and only available in Kairos v3.1.x releases and alphas.
Please check the section "Known issues" at the bottom for more information.
{{% /alert %}}


{{% alert title="Warning" %}}
This feature is only available for Trusted Boot images. See the [Trusted Boot documentation]({{%relref "/docs/Architecture/trustedboot" %}}) for more information.
{{% /alert %}}

### Introduction

System extensions are a way to extend the system with additional files and directories that are mounted at boot time. System extension images may – dynamically at runtime — extend the /usr/ directory hierarchies with additional files. This is particularly useful on immutable system images where a /usr/ hierarchy residing on a read-only file system shall be extended temporarily at runtime without making any persistent modifications.
Or on a Trusted Boot system where the system is booted from a read-only EFI and cannot be exteded easily without breaking the signature.

For more information on system extensions, please refer to the [System extensions documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html).


### Building system extensions

To build a system extension, you need to create a directory with the files you want to add to the system. Then you can use the `systemd-repart` tool to create a system extension image which is signed and verity protected.

The directory with the sources needs to be structured in a way that the files are placed in the same path as they would be in the final system. For example, this is the dir tree for k3s:
```text
.
└── v1.29.2+k3s1
    └── usr
        ├── lib
        │   └── extension-release.d
        │       └── extension-release.k3s-v1.29.2+k3s1
        └── local
            ├── bin
            │   ├── crictl -> ./k3s
            │   ├── ctr -> ./k3s
            │   ├── k3s
            │   └── kubectl -> ./k3s
            └── lib
                └── systemd
                    └── system
                        ├── k3s-agent.service
                        └── k3s.service
```

Then you can use the `systemd-repart` tool to create the sysext image:
```bash
$ systemd-repart -S -s SOURCE_DIR NAME.sysext.raw --private-key=PRIVATE_KEY --certificate=CERTIFICATE       
```

{{% alert title="Warning" %}}
Note that the extensions MUST have a `/usr/lib/extension-release.d/extension-release.NAME` file in which the NAME needs to match the sysext NAME (extension is ignored). This is an enforcement by systemd to ensure the sysext is correctly identified and some sanity checks are done with the info in that file.
{{% /alert %}}

This will generate a signed+verity sysextension that can then be used by sysext to extend the system.

Some extension examples are available under https://github.com/Itxaka/sysext-examples for k3s and sbctl.


### Verifying the system extensions


You can use `systemd-dissect` to verify the system extension, the ID, ARCHITECTURE and the partitions that are included in the system extension.

```bash
$ sudo systemd-dissect sbctl-0.14.sysext.raw
      Name: sbctl-0.14.sysext.raw
      Size: 21.0M
 Sec. Size: 512
     Arch.: x86-64

Image UUID: 351f0e17-35e5-42ff-bf09-8db65c756f7b
 sysext R.: ID=_any
            ARCHITECTURE=x86-64

    Use As: ✗ bootable system for UEFI
            ✗ bootable system for container
            ✗ portable service
            ✗ initrd
            ✓ sysext for system
            ✓ sysext for portable service
            ✗ sysext for initrd
            ✗ confext for system
            ✗ confext for portable service
            ✗ confext for initrd

RW DESIGNATOR      PARTITION UUID                       PARTITION LABEL        FSTYPE                AR>
ro root            4afae1e5-c73c-2f5a-acdc-3655ed91d4e0 root-x86-64            erofs                 x8>
ro root-verity     abea5f2f-214d-4d9f-83f8-ee69ca7614ba root-x86-64-verity     DM_verity_hash        x8>
ro root-verity-sig bdb3ee65-ed86-480c-a750-93015254f1a7 root-x86-64-verity-sig verity_hash_signature x8>
```


### Adding system extensions to build medium

Check the `Bundling system extensions during the installable medium build` section in the [Trusted Boot Installations]({{%relref "/docs/Installation/trustedboot#bundling-system-extensions-during-the-installable-medium-build" %}}) for more information on how to add system extensions to the build medium.


### Adding system extensions to the installed system

Its possible to add system extensions once the system is installed or as part of the installation process without having to bundle them directly on the install media. This is done by copying the sysexts directly into the EFI partition in the proper place.

The paths to copy the sysexts are:
- `EFI/kairos/active.efi.extra.d/` for the sysexts that will be loaded when choosing the active boot entry.
- `EFI/kairos/passive.efi.extra.d/` for the sysexts that will be loaded when choosing the passive boot entry.

For any other entries, the sysexts can be added to the `EFI/kairos/$EFI_ENTRY_NAME.extra.d/` directory directly. So if we had a custom entry in which the EFI file is called `customentry.efi` the path to add the sysexts would be `EFI/kairos/customentry.efi.extra.d/`.

This can be done either manually once installation is finished, by mounting the EFI partition, creating the dirs and copying the sysexts, or by adding a step to the install configuration that will do this automatically (`after-install` stage).

We recommend bundling the sysexts during the build process, but this is an alternative for those cases where the sysexts are not known at build time or need to be added later to an existing system.

This is also a good choice for testing sysexts before bundling them into the install media as they can be added to just one entry in the system and tested without affecting other entries.


### Boot workflow

During boot, systemd-stub will copy and measure the system extensions from the proper directory according to the loaded EFI file (`/EFI/kairos/$EFI_FILE.efi.extra.d/`) and copy them into the initrd `/.extra/sysext` directory.
Immucore then will extract the public keys from the firmware and save them under `/run/verity.d` so the systemd extensions can be veried against those.
Immucore will then verify those sysexts to see if they are signed and verity protected. If they are, they will be copied under `/run/extensions` and during the `initramfs` yip stage the `systemd-sysext` service will be run and they will be mounted in their proper directories.

The enablement of the system extensions service is done at the last step in the `initramfs` stage to not collide with anything in those stage writing to the directories under `/usr/local` (mounted from persistent partition), as some dirs get mounted as read only, they could collide with the stages writing to those dirs.

So if using binaries from the system extensions is needed during boot, make sure they are done after the `initramfs` stage. Otherwise they wont be available in earlier stages.


### Known issues

- Sysext images need to be named with the extension `.sysext.raw` to be identified correctly. This is a design choice to avoid conflicts with other files that could be present in the EFI partition and we dont expect this to change int he future.
- Any folder that is mounted as a system extension will be mounted as read-only. So if your sysext is mounting `/usr/local/bin` to add binaries, it will be mounted as read-only. Other sysexts can eb added and they will be merged correctly, but the final dir will be read-only. This is a limitation of the current systemd version (lower than 256) and will be addressed in future releases.
- Only `/usr` can be extended. This is a design choice and might change in the future to allow other directories to be extended.
- System extensions provided binaries are only available after the `initramfs` stage.
- Any extensions bundled on the install media will be available in the `active` and `passive` boot entries. Any other custom entries will need to have the sysexts copied manually to the proper directory in the EFI partition.
- `recovery` and `autoreset` boot entries have no extensions nor are planned to have. This is a design choice to keep the recovery environment as minimal as possible without anything that could break it.
- Currently only signed+verity sysexts are supported.
- Sysexts need to be signed with the same key/cert as the ones used to sign the EFI files. As those are part of the system and available in the EFI firmware, we can extract the public part and verify the sysexts locally. Any of the PK, KEK or DB keys can be used to sign sysexts. This is planned to be expanded in the future to allow signing them with a different key/cert and provide the public keys as part of the install configuration sot heyc an be verified.
- Sysexts are mounted by the name order by trying to parse the name as a version and comparing it to others. This is done directly by systemd so be aware of the naming of your extensions and try to keep them in a versioned format. And example from systemd source code is provided as a guide:
```text
*  (older) 122.1
         *     ^    123~rc1-1
         *     |    123
         *     |    123-a
         *     |    123-a.1
         *     |    123-1
         *     |    123-1.1
         *     |    123^post1
         *     |    123.a-1
         *     |    123.1-1
         *     v    123a-1
         *  (newer) 124-1
```