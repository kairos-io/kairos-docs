---
title: "Extending Hadron with extensions"
sidebar_label: "Extending Hadron with extensions"
sidebar_position: 2
---

:::info Full sysext/confext info
This page provides a strighforward example of using sysext/confext for Hadron.
For more information on system and config extensions, how they work, how to build them and how to manage them with the CLI, refer to the official documentation: [Kairos extensions documentation](/docs/advanced/sys-extensions/).
:::

### Building fwupd as a system+config extension with auroraboot

We will be building our sysext+confext from a docker image directly by using [auroraboot](https://github.com/kairos-io/AuroraBoot) and using a dockerfile to isolate the artifacts you want converted into a system extension.

Notice that when converting a docker image into a system extension, the last layer is the only one converted (The last command in a given Dockerfile) so have that in mind. This is useful for packages that ONLY install things in /usr or manual installation under /usr.

Using the existing example for [fwupd](https://github.com/kairos-io/hadron/blob/main/examples/add-packages/Dockerfile.fwupd):

```bash
$ docker build -t quay.io/itxaka/test:fwupd -f Dockerfile.fwupd --target=default .
```

After building the chosen Dockerfile, we would just need to run Auroraboot with the `sysext|confext` command and the key and certificate, like we would do with `systemd-repart`. Notice that we are binding the local `keys/` dir into the container `/keys` dir for ease of access to the given keys and the current dir under `/build` on the container so we set the `--output=/build` flag when calling auroraboot:

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
- `sysext|confext`: Subcommand to call, in this case we want to build a sysext but we could be using confext as well if we wanted to build a config extension.
- `--private-key`: Private key to sign the system extension.
- `--certificate`: Certificate to sign the system extension.
- `--output`: Dir where we will output the system extension. Make sure that this matches the directory that passed to the docker command to be able to keep the generated system extension once the container exists and its removed.
- `fwupd`: Output and internal name of the sysext/confext.
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

In this case, as the dockerfile for `fwupd` also ships important configurations files under `/etc` (certificates and remote repos) we would need to construct a config extension as well to be able to ship those files. The process is the same, but instead of using the `sysext` subcommand we would use the `confext` one:

```bash
$ docker run -v /var/run/docker.sock:/var/run/docker.sock  -v $PWD/tests/assets/keys:/keys -v ${PWD}/build:/output auroraboot confext --private-key=/keys/db.key --certificate=/keys/db.pem --output /output fwupd quay.io/itxaka/test:fwupd
2026-03-11T10:06:10Z INF [1] 🚀 Start confext creation
2026-03-11T10:06:10Z INF [1] 💿 Getting image info
2026-03-11T10:06:10Z INF [1] 📤 Extracting archives from image layer
2026-03-11T10:06:11Z INF 📦 Packing confext into raw image
2026-03-11T10:06:11Z INF 🎉 Done confext creation output=/output/fwupd.confext.raw
```

:::warning Files and dirs for system/config extensions
Since the system extensions are mounted under `/usr`, only the files and directories under those specific directories will be included in the system extension.

Since the config extensions are mounted under `/etc`, only the files and directories under that specific directory will be included in the config extension.

If your image ships files in other paths, they will be fully ignored and not included in the final system/config extension. So make sure to place the files you want to include in the correct paths as explained in the section "System/Config extensions under Kairos" above.
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

