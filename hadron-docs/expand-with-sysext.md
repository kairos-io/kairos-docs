---
title: "Extending Hadron with system/config extensions"
sidebar_label: "Extending Hadron with system/config extensions"
sidebar_position: 3
---

:::info Signing keys for system extensions under Trusted Boot
Sysexts need to be signed with the same key/cert as the ones used to sign the EFI files. As those are part of the system and available in the EFI firmware, we can extract the public part and verify the sysexts locally. Any of the PK, KEK or DB keys can be used to sign sysexts. This only affects Trusted Boot.
:::

### Introduction

System extensions are a way to extend the system with additional files and directories that are mounted at boot time. System extension images may – dynamically at runtime — extend the /usr/ directory hierarchies with additional files. This is particularly useful on immutable system images where a /usr/ hierarchy residing on a read-only file system shall be extended temporarily at runtime without making any persistent modifications.
Or on a Trusted Boot system where the system is booted from a read-only EFI and cannot be extended easily without breaking the signature.

This feature works on both Trusted Boot and normal Kairos installations, the only difference is the signature verification of the system extension images. On Trusted Boot, the system extension images are verified against the public keys stored in the firmware. This is done to ensure that only trusted extensions are loaded into the system.

For more information on system extensions, please refer to the [System extensions documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html).

Confextensions are the a way to extend the system with additional configuration files that are mounted at boot time. They are similar to system extensions but they are used to extend the system with configuration files instead of files and directories, so they are mounted under `/etc` instead of `/usr`.



### System/Config extensions under Kairos

Due to the nature of Kairos and its focus on immutability, the out of the box config for the extensions dir overrides do not work very well.
Since it would override and make `/usr` fully RO, it would clash with our persistent partition management, preventing anything to write to persistent.

For this reason, we have specific directories under `/usr` that are used for the extensions instead of the full `/usr` hierarchy. These directories are:
- /usr/local/bin
- /usr/local/sbin
- /usr/local/include
- /usr/local/lib
- /usr/local/share
- /usr/local/src
- /usr/bin
- /usr/share
- /usr/lib
- /usr/include
- /usr/src
- /usr/sbin

This should cover all the use case for extensions, while preserving our ability to have persistent mounts.

In the case of config extensions, nothing is changed since they are mounted under `/etc` and do not interfere with our persistent partition management.

### Building system extensions from a docker image with auroraboot

You can also build a system extension from a docker image directly by using [auroraboot](https://github.com/kairos-io/AuroraBoot) and using a dockerfile to isolate the artifacts you want converted into a system extension.

Notice that when converting a docker image into a system extension, the last layer is the only one converted (The last command in a given Dockerfile) so have that in mind. This is useful for packages that ONLY install things in /usr or manual installation under /usr.

The `/usr/lib/extension-release.d/extension-release.NAME` file necessary for identifying the system extension is automatically created by the command so in this case you should not worry about that file.


For example for a given Dockerfiles as our [fwupd example](https://github.com/kairos-io/hadron/blob/main/examples/add-packages/Dockerfile.fwupd):

```bash
$ docker build -t quay.io/itxaka/test:fwupd -f Dockerfile.fwupd --target=default .
```

After building the chosen Dockerfile, we would just need to run osbuilder with the `sysext` command and the key and certificate, like we would do with `systemd-repart`. Notice that we are binding the local `keys/` dir into the container `/keys` dir for ease of access to the given keys and the current dir under `/build` on the container so we set the `--output=/build` flag when calling auroraboot:

```bash
$ docker run \
-v "$PWD"/keys:/keys \
-v "$PWD":/build/ \
-v /var/run/docker.sock:/var/run/docker.sock \
--rm \
{{< RegistryURL  >}}/auroraboot:{{< AuroraBootVersion  >}} sysext --private-key=/keys/PRIVATE_KEY --certificate=/keys/CERTIFICATE --output=/build fwupd quay.io/itxaka/test:fwupd
```


The explanation of the docker command flags is as follows:
- `-v "$PWD"/keys:/keys`: We mount the current dir + keys dir into the container `/keys` path. So auroraboot has access to the keys to sign the sysext.
- `-v "$PWD":/build/`: Mount the current dir into the container `/build` path. So the generated sysext is available after the container is gone.
- `-v /var/run/docker.sock:/var/run/docker.sock`: We pass the docker sock into the container so it can access our locally built container images. So we avoid pushing them and pulling them from a remote registry.
- `--rm`: Once the container exit, remove it so we dont leave stuff lying around.

The explanation of the auroraboot command flags is as follows:
- `sysext`: Subcommand to call, in this case we want to build a sysext
- `--private-key`: Private key to sign the system extension.
- `--certificate`: Certificate to sign the system extension.
- `--output`: Dir where we will output the system extension. Make sure that this matches the directory that passed to the docker command to be able to keep the generated system extension once the container exists and its removed.
- `fwupd`: Output and internal name of the sysext.
- `quay.io/itxaka/test:fwupd`: Image from which we will extract the last layer and covert it to a system extension.


Example of a successful run:
```bash
$ docker run -v /var/run/docker.sock:/var/run/docker.sock  -v $PWD/tests/assets/keys:/keys -v ${PWD}/build:/output auroraboot sysext --private-key=/keys/db.key --certificate=/keys/db.pem --output /output fwupd quay.io/itxaka/test:fwupd
2026-03-11T10:06:01Z INF [1] 🚀 Start sysext creation
2026-03-11T10:06:01Z INF [1] 💿 Getting image info
2026-03-11T10:06:01Z INF [1] 📤 Extracting archives from image layer
2026-03-11T10:06:01Z INF 📦 Packing sysext into raw image
2026-03-11T10:06:01Z INF 🎉 Done sysext creation output=/output/fwupd.sysext.raw
```

:::info Files and dirs for system extensions
Since the system extensions are mounted under `/usr`, only the files and directories under those specific directories will be included in the system extension.
So even if your image ships files under `/opt` or `/var`, those files will not be included in the system extension and will not be available at runtime. Make sure that all the files you want to include in the system extension are under the specific directories mentioned above.
:::

In this case, as the dockerfile for `fwupd` also ships important configurations files under `/etc` (certificatesx and remote repos) we would need to construct a config extension as well to be able to ship those files. The process is the same, but instead of using the `sysext` subcommand we would use the `confext` one:

```bash
$ docker run -v /var/run/docker.sock:/var/run/docker.sock  -v $PWD/tests/assets/keys:/keys -v ${PWD}/build:/output auroraboot confext --private-key=/keys/db.key --certificate=/keys/db.pem --output /output fwupd quay.io/itxaka/test:fwupd
2026-03-11T10:06:10Z INF [1] 🚀 Start confext creation
2026-03-11T10:06:10Z INF [1] 💿 Getting image info
2026-03-11T10:06:10Z INF [1] 📤 Extracting archives from image layer
2026-03-11T10:06:11Z INF 📦 Packing confext into raw image
2026-03-11T10:06:11Z INF 🎉 Done confext creation output=/output/fwupd.confext.raw
```

:::info Files and dirs for config extensions
Since the config extensions are mounted under `/etc`, only the files and directories under that specific directory will be included in the config extension. So even if your image ships files under `/opt` or `/var`, those files will not be included in the config extension and will not be available at runtime. Make sure that all the files you want to include in the config extension are under the `/etc` directory.
:::

### Verifying the system/config extensions

You can use `systemd-dissect` to verify the system extension, the ID, ARCHITECTURE and the partitions that are included in the system extension.

```bash
$ systemd-dissect fwupd.sysext.raw
 File Name: fwupd.sysext.raw
      Size: 35.4M
 Sec. Size: 512
     Arch.: x86-64
Image UUID: 60f29b0d-f685-4878-b529-4ef35c3f1196
Image Name: fwupd

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

RW DESIGNATOR      PARTITION UUID                       PARTITION LABEL        FSTYPE                ARCHITECTURE VER>
ro root            5faedf12-ae10-79f9-4cbc-664cc53d6ac7 root-x86-64            erofs                 x86-64       sig>
ro root-verity     a6d2ae30-72d6-6c4c-7512-d988954599b5 root-x86-64-verity     DM_verity_hash        x86-64       -  >
ro root-verity-sig ba282899-118d-4b1c-ba8c-5e1af8e37c81 root-x86-64-verity-sig verity_hash_signature x86-64       -  >
```

```bash
systemd-dissect fwupd.confext.raw
 File Name: fwupd.confext.raw
      Size: 1M
 Sec. Size: 512
     Arch.: x86-64
Image UUID: a67a9975-1de6-4af3-b833-cdffb2f18c54
Image Name: fwupd

confext R.: ID=_any
            ARCHITECTURE=x86-64

    Use As: ✗ bootable system for UEFI
            ✗ bootable system for container
            ✗ portable service
            ✗ initrd
            ✗ sysext for system
            ✗ sysext for portable service
            ✗ sysext for initrd
            ✓ confext for system
            ✓ confext for portable service
            ✗ confext for initrd

RW DESIGNATOR      PARTITION UUID                       PARTITION LABEL        FSTYPE                ARCHITECTURE VER>
ro root            ce62b11b-3085-cbca-8559-9b3814c16526 root-x86-64            erofs                 x86-64       sig>
ro root-verity     a29e0dc1-e5d2-b07b-79cd-ac2c09679119 root-x86-64-verity     DM_verity_hash        x86-64       -  >
ro root-verity-sig 6e2b0c53-f591-4024-99f1-8de9ca337cce root-x86-64-verity-sig verity_hash_signature x86-64       -  >
```

Now both your system and config extensions with `fwupd` are ready to be used securely on your Kairos system. Refer to the below section for more information on how to manage them with the CLI.


### CLI extension management

Refer to the Kairos CLI documentation for more information on how to manage system and config extensions with the CLI: [Kairos extensions documentation](https://kairos.io/docs/advanced/sys-extensions/#%EF%B8%8F-cli-usage).

