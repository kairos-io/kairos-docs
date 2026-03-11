---
title: "Extending the system with systemd extensions"
sidebar_label: "Extending the system with systemd extensions"
sidebar_position: 3
---

:::warning Warning
This feature is in preview state and only available in Kairos v3.4.x releases and alphas.
Please check the section "Known issues" at the bottom for more information.
:::
:::info Signing keys for system extensions under Trusted Boot
Sysexts need to be signed with the same key/cert as the ones used to sign the EFI files. As those are part of the system and available in the EFI firmware, we can extract the public part and verify the sysexts locally. Any of the PK, KEK or DB keys can be used to sign sysexts. This only affects Trusted Boot.
:::
### Introduction

System extensions are a way to extend the system with additional files and directories that are mounted at boot time. System extension images may – dynamically at runtime — extend the /usr/ directory hierarchies with additional files. This is particularly useful on immutable system images where a /usr/ hierarchy residing on a read-only file system shall be extended temporarily at runtime without making any persistent modifications.
Or on a Trusted Boot system where the system is booted from a read-only EFI and cannot be extended easily without breaking the signature.

This feature works on both Trusted Boot and normal Kairos installations, the only difference is the signature verification of the system extension images. On Trusted Boot, the system extension images are verified against the public keys stored in the firmware. This is done to ensure that only trusted extensions are loaded into the system.

For more information on system extensions, please refer to the [System extensions documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html).

Confextensions are the a way to extend the system with additional configuration files that are mounted at boot time. They are similar to system extensions but they are used to extend the system with configuration files instead of files and directories, so they are mounted under `/etc` instead of `/usr`.


**Requirement**: Base image of the OS needs to have at least systemd 252 or newer ( for example ubuntu >=23.10 or fedora >=38 )


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


### Building system extensions

<Tabs>
<TabItem value="auroraboot" label="With Auroraboot">

You can also build a system/config extension from a docker image directly by using [auroraboot](https://github.com/kairos-io/AuroraBoot) and using a dockerfile to isolate the artifacts you want converted into a system extension.

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


After building the chosen Dockerfile, we would just need to run osbuilder with the `sysext` command and the key and certificate, like we would do with `systemd-repart`. Notice that we are binding the local `keys/` dir into the container `/keys` dir for ease of access to the given keys and the current dir under `/build` on the container so we set the `--output=/build` flag when calling auroraboot:

```bash
$ docker run \
-v "$PWD"/keys:/keys \
-v "$PWD":/build/ \
-v /var/run/docker.sock:/var/run/docker.sock \
--rm \
{{< RegistryURL  >}}/auroraboot:{{< AuroraBootVersion  >}} sysext --private-key=/keys/PRIVATE_KEY --certificate=/keys/CERTIFICATE --output=/build NAME CONTAINER_IMAGE
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
 - `NAME`: Output and internal name of the sysext.
 - `CONTAINER_IMAGE`: Image from which we will extract the last layer and covert it to a system extension.

Example of a successful run for a system and a config extension:
```bash
$ docker run -v "$PWD":/build/ -v /tmp/keys/:/keys -v /var/run/docker.sock:/var/run/docker.sock --rm -ti {{< RegistryURL  >}}/auroraboot:{{< AuroraBootVersion  >}} sysext --private-key=/keys/db.key --certificate=/keys/db.pem --output /build grype sysext
2024-09-16T14:59:36Z INF Starting auroraboot version
2024-09-16T14:59:36Z INF 🚀 Start sysext creation
2024-09-16T14:59:36Z INF 💿 Getting image info
2024-09-16T14:59:36Z INF 📤 Extracting archives from image layer
2024-09-16T14:59:37Z INF 📦 Packing sysext into raw image
2024-09-16T14:59:37Z INF 🎉 Done sysext creation output=/build/grype.sysext.raw
$ docker run -v "$PWD":/build/ -v /tmp/keys/:/keys -v /var/run/docker.sock:/var/run/docker.sock --rm -ti {{< RegistryURL  >}}/auroraboot:{{< AuroraBootVersion  >}} confext --private-key=/keys/db.key --certificate=/keys/db.pem --output /build grype sysext
2024-09-16T14:59:36Z INF Starting auroraboot version
2024-09-16T14:59:36Z INF 🚀 Start confext creation
2024-09-16T14:59:36Z INF 💿 Getting image info
2024-09-16T14:59:36Z INF 📤 Extracting archives from image layer
2024-09-16T14:59:37Z INF 📦 Packing confext into raw image
2024-09-16T14:59:37Z INF 🎉 Done confext creation output=/build/grype.confext.raw
```

:::info Files and dirs for system/config extensions
Since the system extensions are mounted under `/usr`, only the files and directories under those specific directories will be included in the system extension.

Since the config extensions are mounted under `/etc`, only the files and directories under that specific directory will be included in the config extension.

If your image ships files in other paths, they will be fully ignored and not included in the final system/config extension. So make sure to place the files you want to include in the correct paths as explained in the section "System/Config extensions under Kairos" above.
:::

</TabItem>
<TabItem value="manually" label="Manually">

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

:::warning Warning
Note that the extensions MUST have a `/usr/lib/extension-release.d/extension-release.NAME` file in which the NAME needs to match the sysext NAME (extension is ignored). This is an enforcement by systemd to ensure the sysext is correctly identified and some sanity checks are done with the info in that file.
:::
This will generate a signed+verity sysextension that can then be used by sysext to extend the system.

Some extension examples are available under https://github.com/Itxaka/sysext-examples for k3s and sbctl.

</TabItem>
</Tabs>

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


# Managing System/Config Extensions in Kairos


## 📂 Where Extensions Live

All system extensions are stored in:

```
/var/lib/kairos/extensions/
```

All config extensions are stored in:

```
/var/lib/kairos/confexts/
```

From there, they’re symlinked into directories based on the system’s boot profile:

| Directory   | Behavior                                      |
|-------------|-----------------------------------------------|
| `active/`   | Loaded when booting into the *active* profile |
| `passive/`  | Loaded during *passive* boot                  |
| `recovery/` | Loaded in *recovery mode*                     |
| `common/`   | **Always loaded**, regardless of boot mode    |

> 💡 These directories contain only **symlinks**—the actual disk image is stored once. This ensures there’s no duplication or leftover state between boots.

---

## 🛠️ CLI Usage

Manage extensions using `kairos-agent sysext|confext` commands.

Use `sysext` for system extensions and `confext` for config extensions. The commands are the same for both, just replace `sysext` with `confext` in the examples below.


> 📝 **Tip:** For enable, disable and remove commands, the extension name supports **regex matching**. You don’t need to type the full filename.
> For example, to match `k3sv1.32.1.k3s0.sysext.raw`, you can simply use `k3s`.


## Subcommands

---

### 📥 `install`

Downloads/gets a system extension and stores it on the node.

```bash
kairos-agent sysext install <URI>
```

**Supported URI formats:**

- `https:` – Download a raw disk image from a remote server
- `http:` – Same as above, unencrypted
- `file:` – Load a local disk image file
- `oci:` – Download from an OCI-compatible container registry

> ⚠️ **Important Notes:**
> - `http(s)` and `file:` URIs must point directly to a raw disk image file.
> - `oci:` support is **alpha-stage** and may change.
> - When using `oci:`, the disk image must be **embedded inside the OCI image layer**.

---

### ✅ `enable`

Enable an extension for a specific boot profile:

```bash
kairos-agent sysext enable --active my-extension
```

**Supported profile flags:**
- `--active`
- `--passive`
- `--recovery`
- `--common`

#### 🔄 Use `--now` for Immediate Activation

```bash
kairos-agent sysext enable --active --now my-extension
```

If the current boot mode matches, this also:
- Creates a link in `/run/extensions/`
- Reloads `systemd-sysext` so the extension is active *immediately*

---

### 🚫 `disable`

Remove the symlink from the specified profile:

```bash
kairos-agent sysext disable --common my-extension
```

Add `--now` to also unload the extension if it's currently live:

```bash
kairos-agent sysext disable --common --now my-extension
```

---

### 🧹 `remove`

Deletes the extension completely—including **all symlinks** from any profile.

```bash
kairos-agent sysext remove my-extension
```

Use `--now` to deactivate it immediately as well:

```bash
kairos-agent sysext remove --now my-extension
```

> ⚠️ This is a **permanent wipe**. The extension will no longer be available for any boot profile.

---

### 📋 `list`

- Without flags: lists all installed extensions
- With a profile flag: lists extensions enabled for that boot profile

```bash
kairos-agent sysext list
kairos-agent sysext list --recovery
```

---

## 🧪 Example Workflow

```bash
# Download a disk image over HTTPS
kairos-agent sysext install https://example.org/extensions/k3sv1.32.1.raw

# Enable for the active profile and activate it live
kairos-agent sysext enable --active --now k3s

# See what’s currently enabled for active
kairos-agent sysext list --active

# Fully remove it and clean up live state
kairos-agent sysext remove --now k3s
```

---

## 🧼 Designed for Clean State Management

- No duplication: all symlinks point to a single image
- Reversible: simply unlink or remove to disable
- `--now` lets you test and roll out changes live
- All state reset at boot via ephemeral `/run/extensions`


### Boot workflow

During boot, Immucore will identify under which boot state is running (active, passive, recovery) and will link the found extensions to the /run/extensions dir during initramfs. Then it will enable the systemd-sysext service so they are loaded correctly. Similar it will link the config extensions to /run/confexts and they will be loaded by systemd-confext as well.

Under Trusted Boot, the extensions signature will be verified and if they dont match they will be ignored and a warning emitted under the logs at /run/immucore/.


### Known issues

- Sysext images need to be named with the extension `.sysext.raw` to be identified correctly. This is a design choice to avoid conflicts with other files that could be present in the EFI partition and we don't expect this to change in the future. Auroraboot generates the extensions automatically with the correct name, but if you are building them manually with `systemd-repart` make sure to name them correctly.
- Config extensions need to be named with the extension `.confext.raw` to be identified correctly. This is a design choice to avoid conflicts with other files that could be present in the EFI partition and we don't expect this to change in the future. Auroraboot generates the extensions automatically with the correct name, but if you are building them manually with `systemd-repart` make sure to name them correctly.
- Any folder that is mounted as a system extension will be mounted as read-only. So if your sysext is mounting `/usr/local/bin` to add binaries, it will be mounted as read-only. Other sysexts can be added and they will be merged correctly, but the final dir will be read-only. This is a limitation of the current systemd version (lower than 256) and will be addressed in future releases.
- System extensions provided binaries are only available after the `initramfs` stage.
- Currently only signed+verity sysexts are supported under Trusted Boot (UKI). For non-uki Kairos, the signature is not enforced yet.
- Sysexts/confexts need to be signed with the same key/cert as the ones used to sign the EFI files. As those are part of the system and available in the EFI firmware, we can extract the public part and verify the sysexts locally. Any of the PK, KEK or DB keys can be used to sign sysexts. This is planned to be expanded in the future to allow signing them with a different key/cert and provide the public keys as part of the install configuration so they can be verified.
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
