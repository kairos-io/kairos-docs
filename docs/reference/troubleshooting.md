---
title: "Troubleshooting"
sidebar_label: "Troubleshooting"
sidebar_position: 6
date: 2022-11-13
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Things can go wrong. This section tries to give guidelines in helping out identify potential issues.

It is important first to check out if your issue was already submitted [in the issue tracker](https://github.com/kairos-io/kairos/issues).


<Tabs>
<TabItem value="kairos" label="Kairos">
## Gathering logs

To gather useful logs and help developers spot right away issues, it's suggested to boot with `console=tty0 rd.debug` enabled for example:

![debug](https://user-images.githubusercontent.com/2420543/191934926-7d4ac908-9a4c-4ef4-9891-75820e6b8fe6.gif)

To edit the boot commands, type 'e' in the boot menu. To boot with the changes press 'CTRL+X'.

In case logs can't be acquired, taking screenshot or videos while opening up issues it's strongly recommended!

Another option that can be enabled is immucore debug logs with `rd.immucore.debug`

After booting, you can find the logs from immucore under `/run/immucore/` (whether you enabled debug output or not).
Check the [immucore README](https://github.com/kairos-io/kairos/tree/master/immucore) for more configuration parameters.

In order to gather the logs, you can use the `kairos-agent logs` command:


```bash
localhost:~# kairos-agent logs
2025-07-07T10:14:09Z INF Kairos Agent version=v0.0.1
2025-07-07T10:14:09Z INF creating a runtime
2025-07-07T10:14:09Z INF detecting boot state
2025-07-07T10:14:09Z INF Boot Mode boot_mode=active_boot
2025-07-07T10:14:09Z INF Boot in uki mode result=false
2025-07-07T10:14:09Z INF Kairos Agent version=v0.0.1
2025-07-07T10:14:09Z INF creating a runtime
2025-07-07T10:14:09Z INF detecting boot state
2025-07-07T10:14:09Z INF Boot Mode boot_mode=active_boot
2025-07-07T10:14:09Z INF Boot in uki mode result=false
2025-07-07T10:14:09Z INF [2814] systemd not available, skipping journal log collection
2025-07-07T10:14:09Z INF [2814] Logs collected successfully to ./kairos-logs.tar.gz
```

This command will collect logs from various components of the system and package them into a tarball named `kairos-logs.tar.gz`. You can then attach this file when reporting issues.

## Initramfs breakpoints

Initramfs can be instructed to drop a shell in various phases of the boot process. For instance:

- `rd.break=pre-mount rd.shell`: Drops a shell before setting up mount points.
- `rd.break=pre-pivot rd.shell`: Drops a shell before switch-root

## In-RAM boot failures

See [Run Kairos from RAM with local persistent data](/docs/installation/netboot#run-kairos-from-ram-with-local-persistent-data)
for the supported kernel options and disk-selection rules.

In-RAM mode stops before cloud config runs when `COS_OEM` or
`COS_PERSISTENT` is missing and partition creation is not enabled. It also
stops when the selected disk is unavailable, the requested sizes are invalid,
or an existing partition table requires explicit wipe consent. Under [Trusted
Boot](/docs/installation/trustedboot), it additionally stops when a freshly
created partition cannot be encrypted with the TPM PCR policy — check the TPM
prerequisites, or wipe the disk and retry, since the partition table may be
left partially initialized at that point.

Immucore prints a full-screen error on every available console with the failed
condition and the kernel option needed to correct it. On systemd systems, press
any key to reboot immediately. With no input, the machine reboots after 90
seconds so boot assessment records a failed boot. On non-systemd systems,
immucore prints the message and the boot fails without the timed reboot. Check
`/run/immucore/` for the full immucore logs on the next boot.

## Mount failures

A custom mount (`rd.cos.mount=`, `rd.immucore.mount=`, `VOLUMES`) or a persistent state bind that does not mount stops the boot. Immucore prints the `IMMUCORE BOOT FAILED` banner with the step that broke, the kernel cmdline and the log directory, and persists the same text to `/run/immucore/boot_failure.log`.

This is deliberate. A node that comes up with some of its persistent paths bound and some of them not writes the unbound ones to the ephemeral overlay and loses them on the next reboot, and before Kairos v4.3 nothing reported it.

Two knobs change what happens:

- `rd.immucore.ignoremountfailure` in the kernel cmdline boots anyway, which is the older behaviour. The paths that did not mount are ephemeral for that boot.
- The `mount-failure` cloud config stage runs before the decision either way, so a distribution or an operator can define their own recovery: remount by hand, call home, write a sentinel, or take the console. It gets `IMMUCORE_MOUNT_FAILURE_STEP` (`custom-mount` or `mount-bind`) and `IMMUCORE_MOUNT_FAILURE` (the error) in its environment.

A hook that repairs the mount still has to be paired with `rd.immucore.ignoremountfailure`, because the stage runs before the decision and does not change it.

```yaml
name: "Recover from a mount failure"
stages:
   mount-failure:
     - name: "Report what broke"
       commands:
       - |
          echo "step=${IMMUCORE_MOUNT_FAILURE_STEP} error=${IMMUCORE_MOUNT_FAILURE}" > /run/immucore/my-recovery.log
```

Under Trusted Boot the cmdline is measured, so `rd.immucore.ignoremountfailure` has to be set when the UKI is built and signed. The `mount-failure` stage needs no cmdline change and works there as it does on a GRUB boot.

## Disable immutability

It is possible to disable immutability by adding `rd.cos.debugrw` to the kernel boot commands.

Booting with `rd.cos.debugrw` mounts the state partition read-write, so the OS images can change. Immucore removes the checksum file of the image it boots when you do, because the image can change. A new one is written the next time `kairos-agent` writes that image, if `image-checksum.create` is on.

## Check OS images for corruption at boot

Kairos can record a sha256 checksum for each OS image and check it before the image is mounted, to catch disk corruption and half written images. It is off by default and needs two switches: one to write the checksums, one to check them at boot.

### Write the checksums

With `image-checksum.create` on, `kairos-agent` writes a `.sha256` file next to each image it writes, in the `cOS` directory of the partition that holds the image:

| Action | Checksums written |
|--------|-------------------|
| install | `active.img.sha256` and `passive.img.sha256` on `COS_STATE`, `recovery.img.sha256` on `COS_RECOVERY` |
| upgrade | `active.img.sha256` for the new image, and `passive.img.sha256` for the previous active image that became passive (when you upgrade from active; passive is left alone when you upgrade from passive) |
| `upgrade --recovery` | `recovery.img.sha256` |
| reset | `active.img.sha256` and `passive.img.sha256` |

The files use the `sha256sum` format, so you can check an image by hand:

```bash
cd /run/initramfs/cos-state/cOS && sha256sum -c active.img.sha256
```

With `create` off (the default), no checksum files are written, and the old checksum of an image the agent replaces is removed, so it never describes a different image.

### Check them at boot

`image-checksum.verify` tells immucore what to do before it mounts an image:

| Value | Behavior |
|-------|----------|
| `none` (default) | The image is not checked and not read. |
| `warn` | The image is checked. Every problem is logged and the boot continues. |
| `fail` | The image is checked. On a problem the image is not mounted and the boot stops on a failure screen that shows the image, the stored sha256 and the sha256 computed from the image. |

Only the image being booted is checked: booting active checks `active.img`, booting passive checks `passive.img`, booting recovery checks `recovery.img`. Hashing a multi-GB image adds to the boot time, mostly on slow disks such as SD cards, which is why the default is `none`. The time is capped by a budget, see [Time budget](#time-budget).

An image with no checksum file (installed by an older agent, or written with `create` off) is skipped, and so is one that an older agent replaced without updating the checksum. Both are logged, and neither stops the boot. To count them as a problem, set `image-checksum.require`. When checking is on, a checksum file that cannot be read, or an image that does not match its checksum, is always a problem.

### Time budget

The time immucore needs is about the image size divided by the read speed of the disk: seconds on NVMe or SSD, tens of seconds for a large image on a hard disk, minutes for a multi-GB image on an SD card. The boot has a hard limit on how long it waits for the root device: dracut gives up after `rd.retry` seconds (180 by default) and the node reboots, over and over when the kernel command line has `rd.emergency=reboot`. A check that is too slow must not cause that, so it has a time budget, `image-checksum.verify-timeout`, in seconds:

- The default is 60. `0` means no limit.
- When the budget runs out, immucore stops hashing, logs a warning with the image, the bytes it read and the time it spent, and boots the image without the check. This is the same in `warn` and `fail`: a check that was skipped never stops the boot.
- The exception is `fail` together with `require: true`. That combination means "never boot an image that was not verified", so a check skipped for lack of time stops the boot on the failure screen, like a missing checksum does.
- A skipped check says nothing about the image. To verify an image on a slow disk, raise the budget and `rd.retry` together, so that the budget plus the rest of the boot stays under `rd.retry`, or run `kairos-agent verify-images` once the system is up. It has no time limit.

`kairos-agent verify-images` is not affected by the budget.

If you set `verify-timeout` to `0` or to more than about two minutes, add a larger `rd.retry` to the kernel command line as well, for example with `kairos-agent grubedit set extra_active_cmdline=rd.retry=900`.

### Configure it

```yaml
#cloud-config
image-checksum:
  create: true
  verify: warn
  require: false
  verify-timeout: 60
```

Every key can also be set on the kernel cmdline in dot notation, and the cmdline wins over the cloud config:

| Config key | Kernel cmdline |
|------------|----------------|
| `image-checksum.create` | `image-checksum.create=true` or `=false` |
| `image-checksum.verify` | `image-checksum.verify=none\|warn\|fail` |
| `image-checksum.require` | `image-checksum.require=true` or `=false` |
| `image-checksum.verify-timeout` | `image-checksum.verify-timeout=<seconds>`, `0` for no limit |

`create` is read by `kairos-agent` when it runs, from the cloud config and from the kernel cmdline of the running system.

`verify`, `require` and `verify-timeout` are read by immucore very early in the boot, before the cloud config is available. So immucore looks at the kernel cmdline first, and then at an `image-checksum.conf` file that `kairos-agent` keeps next to the images. A cmdline value applies at once. A change to the cloud config only reaches the boot the next time `kairos-agent` writes that file:

- On `COS_STATE` (used to boot active and passive) it is written by install, upgrade and reset.
- On `COS_RECOVERY` (used to boot recovery) it is written by install and `upgrade --recovery`.

The file mirrors the configuration of that last run, kernel cmdline values included. If `image-checksum.verify=fail` was on the cmdline when you ran an upgrade, `fail` is stored and stays in effect after the cmdline value is gone. Setting `verify` to `none` and `require` to `false` removes the file at the next run.

To try `fail` or to get past a failure, edit the boot entry in the boot menu (press `e`) and add `image-checksum.verify=warn` or `image-checksum.verify=none`.

The result is in the immucore logs under `/run/immucore/`.

### Check the images by hand

`kairos-agent verify-images` checks the active, passive and recovery images against their checksum files and prints the stored (expected) and computed (actual) sha256 of each. By default it looks at the `COS_STATE` partition of the running system, and at `COS_RECOVERY` when it is mounted. It only reads, so it is safe to run at any time. It checks every image it finds, not only the booted one, whatever `image-checksum.verify` says. It exits with an error when an image does not match, when a checksum file or an image cannot be read, or when an image has no usable checksum and `image-checksum.require` is on. It reads `image-checksum.require` from the cloud config and the kernel cmdline. Use `--dir` to check another directory.

```bash
sudo kairos-agent verify-images
```

### Limits

This protects against disk corruption and partial writes. It is not a security feature: the checksum is stored next to the image, so someone with write access to the partition can change both. For that, use [Trusted Boot](/docs/installation/trustedboot/). Trusted Boot (UKI) systems and systemd-boot installs are not covered, as they do not boot from these image files, and neither is a squashfs recovery image.

## See also

- [Dracut debug docs](https://fedoraproject.org/wiki/How_to_debug_Dracut_problems)

</TabItem>
<TabItem value="kairos-uki" label="Kairos UKI">

### Note

The workflow for building UKI images is not yet set in stone and might change in the future so currently we cannot advise how to proceed here to build the UKI images with debug options yet. This will be updated in the future.


Currently on UKI mode we cannot easily change the cmdline to provide debug options easily as the cmdline is measured by the TPM and the system will not boot if the cmdline is changed.



## Enable Immucore debug logs

In case of boot issues, Immucore accepts the `rd.immucore.debug` parameter in the cmdline to enable debug logs.

After booting, you can find the logs from immucore under `/run/immucore/` (whether you enabled debug output or not).

## Disabling SecureBoot

In case of issues with SecureBoot, it's possible to disable it from the UEFI settings and make Immucore boot without it by setting the `rd.immucore.securebootdisabled` parameter in the cmdline. Note that this is not supported and its only provided for troubleshooting purposes as it defeats the purpose of the security features provided by SecureBoot.

</TabItem>
</Tabs>
## Root permission

By default, there is no root user set. A default user (`kairos`) is created and can use `sudo` without password authentication during LiveCD bootup.

## Get back the kubeconfig

On all nodes, which are deployed with the P2P full-mesh feature of the cluster, it's possible to invoke `kairos get-kubeconfig` to recover the kubeconfig file.

## Debugging cloud config issues

If a machine does not behave as expected after applying a cloud config (users not created, a stage not running, `k3s`/`k0s` not configured), the cause is often a malformed configuration file or a stage that is not doing what you think it does.

A few things to check before reinstalling:

- Validate the syntax and schema of your cloud config before deploying it. See [Validate Your Cloud Config](/docs/reference/configuration#validate-your-cloud-config).
- Test what a given stage actually does by running it locally in a container instead of reinstalling the machine. See [Test your cloud configs](/docs/reference/configuration#test-your-cloud-configs).
- Inspect the configuration the running system actually loaded with `kairos-agent config`, which prints the merged cloud config currently in use (redact any sensitive values before sharing it).

## Reporting issues

If you are reporting a bug, please open an issue on the [Kairos GitHub repository](https://github.com/kairos-io/kairos)

When reporting issues, please provide as much information as possible. This includes:

- The version of Kairos you are using (Attach the full `/etc/os-release` file)
- The hardware you are running Kairos on (In case of suspecting hardware compatibility issues)
- The steps to reproduce the issue
- Any logs or screenshots you have
- Any other relevant information
- If you are using a custom configuration, please provide the configuration file


Some small things you can do to provide us with the best information possible:
- When running kairos-agent commands, please add the `--debug` flag and attach the output to the issue
- You can also run `kairos-agent state` and attach the output to the issue as that provides information about various components of the system
- You can also run `kairos-agent config` and attach the output to the issue as that provides the current cloud-config for the system (Be aware that any sensitive information should be redacted before attaching the output)
- Immucore logs, available under `/run/immucore/` can be useful to attach as well
- Agent logs, available under `/var/log/kairos/*.log` which are stored on each run of the agent
- Journalctl logs for the following services (use `journalctl -u <service>` to get the logs) can be useful:
  - cos-setup-network
  - cos-setup-fs
  - cos-setup-boot
  - kairos

## Trusted boot

### TPM Event Logs

The Trusted Platform Module (TPM) logs contain important security-related measurements that are taken during the boot process. These logs are instrumental in ensuring that the boot process is secure and has not been tampered with.

#### Viewing TPM Event Logs

To view TPM event logs, you can use the `tpm2_eventlog` command as follows:

```bash
tpm2_eventlog /sys/kernel/security/tpm0/binary_bios_measurements
```

However, for a more detailed and structured view, especially when analyzing what contributes to a specific PCR (Platform Configuration Register) value like PCR 7, the `systemd-pcrlock` tool provides enhanced visibility:

```bash
/usr/lib/systemd/systemd-pcrlock
```

This tool is particularly useful for understanding the sequence of events that influence each PCR value during the boot process.

#### Key Management in Firmware

To ensure the integrity and security of your system, it is critical to manage and verify the keys used by the firmware, especially when dealing with upgrades and security patches.

#### Listing Enrolled Keys

You can list keys that are currently enrolled in the firmware using `sbctl`:

```bash
sbctl list-enrolled-keys
```

For further details and usage, refer to the `sbctl` tool's GitHub repository:
[https://github.com/Foxboron/sbctl](https://github.com/Foxboron/sbctl)

##### Verifying EFI Signature

To verify if the EFI executables are signed with the correct keys, you can use tools like `goverify`:

```bash
go get -u github.com/Foxboron/go-uefi/cmd/goverify
goverify
```

This step ensures that any upgrades or installations are performed using authorized and validated keys, thereby preserving the security of the system. More information and source code can be found on GitHub:
[https://github.com/Foxboron/go-uefi/blob/master/cmd/goverify/main.go](https://github.com/Foxboron/go-uefi/blob/master/cmd/goverify/main.go)

##### Checking if Secure Boot is Enabled

Secure Boot is a security standard that helps to ensure that a device boots using only software that is trusted by the Original Equipment Manufacturer (OEM). When Secure Boot is enabled, the firmware checks each piece of boot software for a valid digital signature.

##### Command to Check Secure Boot Status

To check if Secure Boot is enabled on your system, use the following command:

```bash
dmesg | grep -i secure
```

The output will display entries related to Secure Boot, indicating whether it is enabled and showing details about the X.509 certificates loaded during the boot process, as seen in the example output provided in your notes.
