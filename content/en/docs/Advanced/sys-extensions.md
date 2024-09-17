---
title: "Extending the system with systemd extensions"
linkTitle: "Extending the system with systemd extensions"
weight: 3
---


{{% alert title="Warning" color="warning" %}}
This feature is in preview state and only available in Kairos v3.1.x releases and alphas.
Please check the section "Known issues" at the bottom for more information.
{{% /alert %}}


{{% alert title="Warning" color="warning" %}}
This feature is only available for Trusted Boot images. See the [Trusted Boot documentation]({{%relref "/docs/Architecture/trustedboot" %}}) for more information.
{{% /alert %}}

{{% alert title="Signing keys for system extensions" color="info" %}}
Sysexts need to be signed with the same key/cert as the ones used to sign the EFI files. As those are part of the system and available in the EFI firmware, we can extract the public part and verify the sysexts locally. Any of the PK, KEK or DB keys can be used to sign sysexts.
{{% /alert %}}

### Introduction

System extensions are a way to extend the system with additional files and directories that are mounted at boot time. System extension images may – dynamically at runtime — extend the /usr/ directory hierarchies with additional files. This is particularly useful on immutable system images where a /usr/ hierarchy residing on a read-only file system shall be extended temporarily at runtime without making any persistent modifications.
Or on a Trusted Boot system where the system is booted from a read-only EFI and cannot be exteded easily without breaking the signature.

For more information on system extensions, please refer to the [System extensions documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html).


### Building system extensions manually

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


### Building system extensions from a docker image with enki

{{% alert title="Warning" color="warning" %}}
This feature is in preview state and only available in Enki from version 0.1.4
{{% /alert %}}


You can also build a system extension from a docker image directly by using [enki](https://github.com/kairos-io/enki) and using a dockerfile to isolate the artifacts you want converted into a system extension.

Notice that when converting a docker image into a system extension, the last layer is the only one converted (The last command in a given Dockerfile) so have that in mind. This is useful for packages that ONLY install things in /usr or manual installation under /usr.

The `/usr/lib/extension-release.d/extension-release.NAME` file necessary for identifying the system extension is automatically created by the command so in this case you should not worry about that file.


For example for a given Dockerfiles as such:

```dockerfile
FROM anchore/grype:latest AS grype


FROM scratch
COPY --from=grype /grype /usr/local/bin/grype
```

Only the files added in the last step will be converted to a sysext, so the contents of the sysext would be the `/usr/local/bin/grype` binary only.

Or for a even more manual one:
```dockerfile
FROM alpine:3.19
RUN apk add curl
RUN curl -L https://github.com/Foxboron/sbctl/releases/download/0.15.4/sbctl-0.15.4-linux-amd64.tar.gz | tar xvzf - --strip-components=1 -C /usr/local/bin/
```

Again, only the files in the last step would be converted into a system extension, so we would get the contents of the extracted tar archive at the `/usr/local/bin/` path.


After building the chosen Dockerfile, we would just need to run osbuilder with the `sysext` command and the key and certificate, like we would do with `systemd-repart`. Notice that we are binding the local `keys/` dir into the container `/keys` dir for ease of access to the given keys and the current dir under `/build` on the container so we set the `--output=/build` flag when calling Enki:

```bash
$ docker run \
-v "$PWD"/keys:/keys \
-v "$PWD":/build/ \
-v /var/run/docker.sock:/var/run/docker.sock \
--rm \
{{< registryURL >}}/enki:{{< enkiVersion >}} sysext NAME CONTAINER_IMAGE --private-key=/keys/PRIVATE_KEY --certificate=/keys/CERTIFICATE --output=/build
```

The explanation of the docker command flags is as follows:
 - `-v "$PWD"/keys:/keys`: We mount the current dir + keys dir into the container `/keys` path. So Enki has access to the keys to sign the sysext.
 - `-v "$PWD":/build/`: Mount the current dir into the container `/build` path. So the generated sysext is available after the container is gone. 
 - `-v /var/run/docker.sock:/var/run/docker.sock`: We pass the docker sock into the container so it can access our locally built container images. So we avoid pushing them and pulling them from a remote registry.
 - `--rm`: Once the container exit, remove it so we dont leave stuff lying around.

The explanation of the Enki command flags is as follows:
 - `sysext`: Subcommand to call, in this case we want to build a sysext
 - `NAME`: Output and internal name of the sysext.
 - `CONTAINER_IMAGE`: Image from which we will extract the last layer and covert it to a system extension.
 - `--private-key`: Private key to sign the system extension.
 - `--certificate`: Certificate to sign the system extension.
 - `--output`: Dir where we will output the system extension. Make sure that this matches the directory that passed to the docker command to be able to keep the generated system extension once the container exists and its removed.

Example of a successful run:
```bash
$ docker run -v "$PWD":/build/ -v /tmp/keys/:/keys -v /var/run/docker.sock:/var/run/docker.sock --rm -ti enki sysext grype sysext --private-key=/keys/db.key --certificate=/keys/db.pem --output /build
2024-09-16T14:59:36Z INF Starting enki version 
2024-09-16T14:59:36Z INF 🚀 Start sysext creation
2024-09-16T14:59:36Z INF 💿 Getting image info
2024-09-16T14:59:36Z INF 📤 Extracting archives from image layer
2024-09-16T14:59:37Z INF 📦 Packing sysext into raw image
2024-09-16T14:59:37Z INF 🎉 Done sysext creation output=/build/grype.sysext.raw
$ ls -ltra *.raw
-rw-r--r-- 1 root root 64729088 sep 16 17:24 grype.sysext.raw
```


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

Check the _Bundling system extensions during the installable medium build_ section in the [Trusted Boot Installations]({{%relref "/docs/Installation/trustedboot#bundling-system-extensions-during-the-installable-medium-build" %}}) for more information on how to add system extensions to the build medium.


### Adding system extensions to the installed system

It's possible to add system extensions once the system is installed or as part of the installation process without having to bundle them directly on the install media. This is done by copying the sysexts directly into the EFI partition in the proper place.

Sysextensions are applied per EFI file. So if you have multiple EFI files in the EFI partition, you can have different sysexts for each one.
You would need to copy each extensions that you want applied to the system to the proper directory in the EFI partition.

The paths to copy the sysexts are:
- `EFI/kairos/active.efi.extra.d/` for the sysexts that will be loaded when choosing the active boot entry.
- `EFI/kairos/passive.efi.extra.d/` for the sysexts that will be loaded when choosing the passive boot entry.

For any other entries, the sysexts can be added to the `EFI/kairos/$EFI_ENTRY_NAME.extra.d/` directory directly. So if we had a custom entry in which the EFI file is called `customentry.efi` the path to add the sysexts would be `EFI/kairos/customentry.efi.extra.d/`.

This can be done either manually once installation is finished, by mounting the EFI partition, creating the dirs and copying the sysexts, or by adding a step to the install configuration that will do this automatically (`after-install` stage).

We recommend bundling the sysexts during the build process, but this is an alternative for those cases where the sysexts are not known at build time or need to be added later to an existing system.

This is also a good choice for testing sysexts before bundling them into the install media as they can be added to just one entry in the system and tested without affecting other entries.


### Boot workflow

During boot, systemd-stub will copy and measure the system extensions from the proper directory according to the loaded EFI file (`/EFI/kairos/$EFI_FILE.efi.extra.d/`) and copy them into the initrd `/.extra/sysext` directory.
[Immucore](https://github.com/kairos-io/immucore/) then will extract the public keys from the firmware and save them under `/run/verity.d` so the systemd extensions can be veried against those.
Immucore will then verify those sysexts to see if they are signed and verity protected. If they are, they will be copied under `/run/extensions` and during the `initramfs` yip stage the `systemd-sysext` service will be run and they will be mounted in their proper directories.

The enablement of the system extensions service is done at the last step in the `initramfs` stage to not collide with anything in those stages writing to the directories under `/usr/local` (mounted from persistent partition), as some dirs get mounted as read only, they could collide with the stages writing to those dirs.

So, if using binaries from the system extensions is needed during boot, make sure they are done after the `initramfs` stage. Otherwise, they wont be available in earlier stages.


### Known issues

- Sysext images need to be named with the extension `.sysext.raw` to be identified correctly. This is a design choice to avoid conflicts with other files that could be present in the EFI partition and we don't expect this to change in the future.
- Any folder that is mounted as a system extension will be mounted as read-only. So if your sysext is mounting `/usr/local/bin` to add binaries, it will be mounted as read-only. Other sysexts can be added and they will be merged correctly, but the final dir will be read-only. This is a limitation of the current systemd version (lower than 256) and will be addressed in future releases.
- Only `/usr` can be extended. This is a design choice and might change in the future to allow other directories to be extended.
- System extensions provided binaries are only available after the `initramfs` stage.
- Any extensions bundled on the install media will be available in the `active` and `passive` boot entries. Any other custom entries will need to have the sysexts copied manually to the proper directory in the EFI partition.
- `recovery` and `autoreset` boot entries have no extensions nor are planned to have. This is a Kairos design choice to keep the recovery environment as minimal as possible without anything that could break it.
- Currently only signed+verity sysexts are supported.
- Sysexts need to be signed with the same key/cert as the ones used to sign the EFI files. As those are part of the system and available in the EFI firmware, we can extract the public part and verify the sysexts locally. Any of the PK, KEK or DB keys can be used to sign sysexts. This is planned to be expanded in the future to allow signing them with a different key/cert and provide the public keys as part of the install configuration so they can be verified.
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