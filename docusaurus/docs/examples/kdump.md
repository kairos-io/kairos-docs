---
title: "Enabling kdump"
sidebar_label: "Enabling kdump"
description: This section describe examples on how to enable kdump in Kairos derivatives
---

:::info Info
This tutorial is based on Opensuse Leap. Kdump configs vary over distributions and we are not able to test them all but they should be easily adaptable from this tutorial.
:::
# Introduction

kdump is a feature of the Linux kernel that creates crash dumps in the event of a kernel crash. When triggered, kdump exports a memory image (also known as vmcore) that can be analyzed for the purposes of debugging and determining the cause of a crash.


In the event of a kernel crash, kdump preserves system consistency by booting another Linux kernel, which is known as the dump-capture kernel, and using it to export and save a memory dump. As a result, the system boots into a clean and reliable environment instead of relying on an already crashed kernel that may cause various issues, such as causing file system corruption while writing a memory dump file

This is why we need a clean initramfs that disables most of the modules and mounts the persistent partition into the `/var/crash` route in order to store the dumps over reboots

# Requirements

 - A custom image that builds a simple,small initrd with the kdump module and that mounts persistent to store the dump
 - A service override to skip the kdump service rebuilding the initrd on an immutable system

# Steps

 - Build the custom derivative artifact
 - Build an iso from that artifact
 - Install the iso
 - Check that kdump is enabled and works


### Building the custom derivative

We will keep this short as there is more docs about building your own derivatives than what we can go in this tutorial like the [Customizing page](customizing)

The main step is to build a clean initrd that has the kdump module and can mount persistent to store the kernel dump.


```dockerfile
FROM quay.io/kairos/opensuse:leap-15.6-core-amd64-generic-v3.1.2

# Install kdump
RUN zypper ref && zypper in -y kdump kexec-tools makedumpfile
# Build initramfs with kdump module on it
RUN kernel=$(ls /lib/modules | head -n1) && depmod -a "${kernel}" && \
            dracut -N -f /var/lib/kdump/initrd "${kernel}" -a kdump \
            --omit "plymouth resume usrmount zz-fadumpinit immucore kairos-network kairos-sysext" --compress "xz -0 --check=crc32" \
            --mount "/dev/disk/by-label/COS_PERSISTENT /kdump/mnt/var/crash ext4 rw,relatime"
# On opensuse the path to the kernel is hardcoded so we need to soft link it to our kernel
RUN ln -s /boot/vmlinuz /var/lib/kdump/kernel
# Enable services. early service is the one on the initramfs
RUN systemctl enable kdump-early && systemctl enable kdump
```

We are generating a new initrd and storing it on `/var/lib/kdump/initrd` as the kdump service will look into that directory to find the kernel and initrd needed to exec into.
We are using the following options to generate a simple, clean initrd:
 - `-a kdump`: adds the kdump module explicitly to the initramfs.
 - `--omit`: omits modules from initrd. This is to have a clean, simple initramfs.
 - `--compress`: Compresses the initrd to keep it small.
 - `--mount`: Explicitly mount the PERSISTENT partition into `/kdump/mnt/var/crash` so kdump can store the dump



Then we generate a new artifact using that dockerfile:
```bash
$ docker build -t kdump-kairos .
[+] Building 0.6s (9/9) FINISHED                                                         docker:default
 => [internal] load build definition from Dockerfile                                               0.0s
 => => transferring dockerfile: 853B                                                               0.0s
 => [internal] load metadata for quay.io/kairos/opensuse:leap-15.6-core-amd64-generic-v3.1.2       0.6s
 => [internal] load .dockerignore                                                                  0.0s
 => => transferring context: 2B                                                                    0.0s
 => [1/5] FROM quay.io/kairos/opensuse:leap-15.6-core-amd64-generic-v3.1.2@sha256:a85cf92ea9ed5a0  0.0s
 => CACHED [2/5] RUN zypper ref && zypper in -y kdump kexec-tools makedumpfile                     0.0s
 => CACHED [3/5] RUN kernel=$(ls /lib/modules | head -n1) && depmod -a "${kernel}" &&              0.0s
 => CACHED [4/5] RUN ln -s /boot/vmlinuz /var/lib/kdump/kernel                                     0.0s
 => CACHED [5/5] RUN systemctl enable kdump-early && systemctl enable kdump                        0.0s
 => exporting to image                                                                             0.0s
 => => exporting layers                                                                            0.0s
 => => writing image sha256:a7ed8f51a32648f8e97cae1eb253a309b696dc3243ba366b489a76150721f403       0.0s
 => => naming to docker.io/library/kdump-kairos           
```

### Build an iso from that artifact

Again, this tutorial does not cover this part deeply as there are docs providing a deep insight onto this like the [AuroraBoot page](auroraboot)

```bash
$ docker run -v "$PWD"/build-iso:/tmp/auroraboot -v /var/run/docker.sock:/var/run/docker.sock --rm -ti quay.io/kairos/auroraboot --set container_image="oci:kdump-kairos" --set "disable_http_server=true" --set "disable_netboot=true" --set "state_dir=/tmp/auroraboot"
2:38PM INF Pulling container image 'kdump-kairos' to '/tmp/auroraboot/temp-rootfs' (local: true)
2:38PM INF Generating iso 'kairos' from '/tmp/auroraboot/temp-rootfs' to '/tmp/auroraboot/build'
```


### Install the iso

Then we burn the resulting ISO to a dvd or usb stick and boot it normally. 

**In order to have kdump working properly, we need to reserve a chunk of memory from the system so it can dump correctly**. Several tools exist for this like `kdumptool` which will give us some approximated values to reserve if running on the machine. A safe value might be `512M high` and `72M low`

This values need to be passed to the kernel in the cmdline so kdump knows what memory it has to work with. The easiest way is to set the `install.grub_options.extra_cmdline` value in the [cloud-config](configuration) during install.

```yaml
#cloud-config

install:
  auto: true
  reboot: true
  grub_options:
    extra_cmdline: "crashkernel=512M,high crashkernel=72M,low"

stages:
  initramfs:
    - name: "Set user and password"
      users:
        kairos:
          passwd: "kairos"
    - name: "Set hostname"
      hostname: kairos-{{ trunc 4 .Random }}
```

### Check that kdump is enabled and works

Once the system has been installed there is 2 services that can be checked to see if kdump is correctly enabled. `kdump-early` and `kdump` services run in initrafms and userspace respectively and both of them should be in status `Active` after booting:

```bash
$ systemctl status kdump-early
* kdump-early.service - Load kdump kernel early on startup
     Loaded: loaded (/usr/lib/systemd/system/kdump-early.service; enabled; preset: disabled)
     Active: active (exited) since Mon 2024-09-09 14:41:02 UTC; 19min ago
   Main PID: 1556 (code=exited, status=0/SUCCESS)
        CPU: 68ms

Sep 09 14:41:02 kairos-cfig systemd[1]: Starting Load kdump kernel early on startup...
Sep 09 14:41:02 kairos-cfig systemd[1]: Finished Load kdump kernel early on startup.

$ systemctl status kdump      
* kdump.service - Load kdump kernel and initrd
     Loaded: loaded (/usr/lib/systemd/system/kdump.service; enabled; preset: disabled)
     Active: active (exited) since Mon 2024-09-09 14:41:03 UTC; 20min ago
   Main PID: 1672 (code=exited, status=0/SUCCESS)
        CPU: 64ms

Sep 09 14:41:03 kairos-cfig systemd[1]: Starting Load kdump kernel and initrd...
Sep 09 14:41:03 kairos-cfig systemd[1]: Finished Load kdump kernel and initrd.
```

Now we know that our systems is kdump ready and in case of a kernel crash it will dump the crash allowing us to troubleshoot it.

The dumps will be stored in `/usr/local/DATE` and will survive reboots
```bash
$ ls -ltra /usr/local/2024-09-09-15-03/
total 79488
drwxr-xr-x 9 root root     4096 Sep  9 15:03 ..
-rw-r--r-- 1 root root    74108 Sep  9 15:03 dmesg
drwxr-xr-x 2 root root     4096 Sep  9 15:03 .
-rw-r--r-- 1 root root 81305093 Sep  9 15:03 vmcore
-rw-r--r-- 1 root root      320 Sep  9 15:03 README.txt
```

:::warning Warning
You can manually trigger a crash by running `echo c > /proc/sysrq-trigger`

Note that this will immediately crash your machine, dump the kernel and restart so make sure that everything is ready for the sudden crash.
:::
