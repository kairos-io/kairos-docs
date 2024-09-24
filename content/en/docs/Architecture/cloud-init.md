---
title: "Cloud init based"
linkTitle: "Cloud init based"
weight: 3
date: 2022-11-13
---

Kairos supports the [standard cloud-init syntax](https://github.com/mudler/yip#compatibility-with-cloud-init-format) and [its own extended syntax](https://github.com/mudler/yip) to allow to configure a system declaratively with a cloud-config centric approach.

If you are not familiar with the concepts of cloud-init, [official cloud-init](https://cloud-init.io/) is a recommended read.

## Configuration persistency

Kairos is an Immutable OS and the only configuration that is persistent across reboots is the cloud-init configuration.
Multiple cloud-init files can be present in the system and Kairos will read them and process them in sequence (lexicographic order) allowing to extend the configuration with additional pieces also after deployment, or to manage logical configuration pieces separately.

In Kairos the `/oem` directory keeps track of all the configuration of the system and stores the configuration files. Multiple files are allowed and they are all executed during the various system stages. `/usr/local/cloud-config` can be optionally used as well to store cloud config files in the persistent partition instead. `/system/oem` is instead reserved to default cloud-init files that are shipped by the base OS image.

By using the standard cloud-config syntax, a subset of the functionalities are available and the settings will be executed in the boot stage.

## Boot stages

During boot the stages are emitted in an event-based pattern until a system completes its boot process 

![Kairos-boot-events](https://user-images.githubusercontent.com/2420543/195111193-3167eab8-8058-4676-a1a0-f64aea745646.png)

The events can be used in the cloud-config extended syntax to hook into the various stages, which can allow to hook inside the different stages of a node lifecycle.

For instance, to execute something before reset is sufficient to add the following to the config file used to bootstrap a node:

```yaml
name: "Run something before reset"
stages:
   before-reset:
     - name: "Setting"
       commands:
       - | 
          echo "Run a command before reset the node!"

```

Below there is a detailed list of the stages available that can be used in the cloud-init configuration files:

| **Stage**                  | **Description**                                                                                                                                                                                                                                                                     |
|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _rootfs_                   | This is the earliest stage, running before switching root, just right after the root is mounted in /sysroot and before applying the immutable rootfs configuration. This stage is executed over initrd root, no chroot is applied.                                                  |
| _initramfs_                | This is still an early stage, running before switching root. Here you can apply radical changes to the booting setup of Elemental. Despite this is executed before switching root this execution runs chrooted into the target root after the immutable rootfs is set up and ready. |
| _boot_                     | This stage is executed after initramfs has switched root, during the systemd bootup process.                                                                                                                                                                                        |
| _fs_                       | This stage is executed when fs is mounted and is guaranteed to have access to the state and persistent partitions ( `COS_STATE`  and  `COS_PERSISTENT` respectively).                                                                                                               |
| _network_                  | This stage is executed when network is available                                                                                                                                                                                                                                    |
| _reconcile_                | This stage is executed 5m after boot and periodically each 60m.                                                                                                                                                                                                                     |
| _kairos-install.pre_       | This stage is executed before installation of the OS starts                                                                                                                                                                                                                         |
| _kairos-uki-install.pre_   | This stage is executed before installation of the OS starts. Only run under Trusted Boot                                                                                                                                                                                            |
| _kairos-install.after_     | This stage is executed after installation of the OS ends                                                                                                                                                                                                                            |                         
| _kairos-uki-install.after_ | This stage is executed after installation of the OS ends. Only run under Trusted Boot                                                                                                                                                                                               |                         
| _kairos-uki-reset.pre_     | This stage is executed before reset. Only run under Trusted Boot                                                                                                                                                                                                                    |                         
| _kairos-uki-reset.after_   | This stage is executed after reset. Only run under Trusted Boot                                                                                                                                                                                                                     |                       
| _kairos-uki-upgrade.pre_   | This stage is executed before upgrade. Only run under Trusted Boot                                                                                                                                                                                                                  |                       
| _kairos-uki-upgrade.after_ | This stage is executed after upgrade. Only run under Trusted Boot                                                                                                                                                                                                                   |                       
| _before-install_           | This stage happens after partitioning but before the image OS is applied                                                                                                                                                                                                            |
| _after-install-chroot_     | This stage happens after installing active and grub inside chroot[^1]                                                                                                                                                                                                               |
| _after-install_            | This stage runs after active,passive and recovery images are installed and after disks have been encrypted                                                                                                                                                                          |
| _before-reset_             | This stage happens after partitions have been formatted and mounted but before the image has been reset                                                                                                                                                                             |
| _after-reset_              | This stage happens after partitions have been formatted and mounted and active and passive images reset                                                                                                                                                                             |
| _after-reset-chroot_       | This stage happens after active has been reset but before passive has been touched inside chroot[^1]                                                                                                                                                                                |
| _before-upgrade_           | This stage happens after mounting partitions with RW but before any image has been upgraded                                                                                                                                                                                         |
| _after-upgrade_            | This stage happens after upgrade has been done                                                                                                                                                                                                                                      |
| _after-upgrade-chroot_     | This stage happens after the image has been upgraded inside chroot[^1]                                                                                                                                                                                                              |


In case you're using a standard image, with the Kairos provider, then these other stages are also available

| **Stage**                                 | **Description**                                                    |
|-------------------------------------------|--------------------------------------------------------------------|
| _provider-kairos.bootstrap.before.<role>_ | The provider fires this stage before starting to bootstrap K3S.    |
| _provider-kairos.bootstrap.after.<role>_  | The provider fires this stage after it finished bootstrapping K3S. |


### System stages with after and before substages
The system run stages that are not part of an action (install,upgrade,reset) all have sub-stages so users can override or modify system behaviour.

This applies to `rootfs`, `initramfs`, `boot`, `fs`, `reconcile` and `network` stages. All of those stages will also run a suffixed `after` and `before` substage that users can hook into to change different setting before the main stage is run.

As those stages are run as part of the system os during different phases and some default configs are shipped with a Kairos system, we add those stages on the fly so they are easily overridable or reverted if one would not want something that ships with KAiros.

For example if we detect that we are running on a VM, [we try to enable the helper services that VM vendors provide](https://github.com/kairos-io/packages/blob/main/packages/static/kairos-overlay-files/files/system/oem/26_vm.yaml) but that may conflict with a user approach of having no superfluous services running. As that config is shipped as part of the base image, its not easy to remove it unless you build a new artifact.

Instead we can revert that by having a config that disables it as soon as possible.

We know that the stage is run during `boot` stage as shown in the [config file](https://github.com/kairos-io/packages/blob/main/packages/static/kairos-overlay-files/files/system/oem/26_vm.yaml) so we could write the following config:

```yaml
name: "Disable QEMU tools"
stages:
  boot.after:
    - name: "Disable QEMU"
      if: |
        grep -iE "qemu|kvm|Virtual Machine" /sys/class/dmi/id/product_name && \
        ( [ -e "/sbin/systemctl" ] || [ -e "/usr/bin/systemctl" ] || [ -e "/usr/sbin/systemctl" ] || [ -e "/usr/bin/systemctl" ] )
      commands:
        - systemctl stop qemu-guest-agent
```

Notice how we set the stage to be `boot.after`. That will run immediately after the `boot` stage has run, so we dont have to know where it will run and play with trying to disable it in the same stage and run into race problems, we cna just use that substage to make sure that our configs runs after the default system ones.

All the mentioned stages (`rootfs`, `initramfs`, `boot`, `fs`, `reconcile` and `network`) have `STAGE.before` and `STAGE.after` substages.


### Stages during kairos-agent operations in detail

![Install Stages](https://github.com/user-attachments/assets/b050f247-990a-4395-9b45-334e04f84d45)


### Modules

For each stage, a number of modules are available, that implement various useful functions.
Read more about them in this page: [Stage modules]({{< relref "../Reference/stage_modules.md" >}})

### Sentinels

When a Kairos boots it creates sentinel files in order to allow to execute cloud-init steps programmaticaly.

- /run/cos/recovery_mode is being created when booting from the recovery partition
- /run/cos/live_mode is created when booting from the LiveCD

To execute a block using the sentinel files you can specify: `if: '[ -f "/run/cos/..." ]'`, for instance:




[^1]: Steps executed at the `chroot` stage are running inside the new OS as chroot, allowing to write persisting changes to the image, for example by downloading and installing additional software.
