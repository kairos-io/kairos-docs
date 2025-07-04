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

### Configuration order

When an action is done (install, upgrade, reset) several default directories in the system are read to obtain the configuration and are merged together.
The directories and the order in which they are read and merged, is as shown below, from first to last. Notice that any values found in different directories will override existing ones in previous directories.

 - /run/initramfs/live (Only available on LiveCD/Netboot)
 - /usr/local/cloud-config
 - /etc/kairos
 - /etc/elemental (deprecated)
 - /oem

This means that you could ship an ISO with a bundled config (see [Automated install]({{< relref "../Installation/automated.md" >}}) or [Auroraboot]({{< relref "../Reference/auroraboot.md" >}}) to see how) that adds a generic configuration that you want everywhere, and using userdata you can then overwrite the default config if needed per node/datacenter/deployment, as the useradata is read and stored into `/oem` it will be read later in the process and overwrite whatever you shipped on the defaults bundled with the ISO.

In order to see the final config, you can run on a running system `kairos-agent config` and that should show the final configuration after scanning all sources.

NOTE: Other than configuration (for installation/upgrade/reset/etc), in the cloud config files, you can also define ["stages"](#boot-stages) to be run during boot. When the same stage is defined in more than one cloud config files, all definitions will be respected. In other words, stages won't be overwritten.

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
| _initramfs_                | This is still an early stage, running before switching root. Here you can apply radical changes to the booting setup of Kairos. Despite this is executed before switching root this execution runs chrooted into the target root after the immutable rootfs is set up and ready. |
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

Notice how we set the stage to be `boot.after`. That will run immediately after the `boot` stage has run, so we dont have to know where it will run and play with trying to disable it in the same stage and run into race problems, we can just use that substage to make sure that our configs runs after the default system ones.

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


## Default Kairos configs

We have a set of default cloud-init configs that are shipped with the base image, and can be found in `/system/oem/`. These configs are executed during the various boot stages and can be overridden by user-provided configs in `/oem` or `/usr/local/cloud-config`.

You can check the default configs in the [kairos-init repository](https://github.com/kairos-io/kairos-init/tree/main/pkg/bundled/cloudconfigs).


## Overriding default configs

You can override the default configs by creating a new file in `/oem` and adding your custom configuration. For example, if you want to override the [default sysctl configuration](https://github.com/kairos-io/kairos-init/blob/main/pkg/bundled/cloudconfigs/09_systemd_services.yaml#L7) provided by Kairos on the `boot` stage you would create a file under /oem with the following content:

```yaml
name: "Override"
stages:
  boot:
    - name: "modify sysctl settings"
      sysctl:
        fs.inotify.max_user_instances: 123192
```

Now, we need to make sure that the file is run _after_ the default sysctl configuration is applied, so we can use the `boot.after` stage to ensure that our custom configuration is applied after the default one:

```yaml
name: "Override"
stages:
  boot.after:
    - name: "modify sysctl settings"
      sysctl:
        fs.inotify.max_user_instances: 123192
```

This would ensure that our custom sysctl setting is applied after the default sysctl configuration provided by Kairos.


**What about overriding stages that are in the same stage? Or making sure they run after our wanted step**

For example, you have a default stage that runs in the `boot.after` stage, and you want to override it with your own configuration.

In this case, running them would not guarantee that your configuration is applied after the default one, as both configurations are in the same stage.

For this case [yip]() provides an `after` directive that allows you to run your configuration after the default one, even if they are in the same stage.

```yaml
name: "Override"
stages:
  boot:
    - name: "modify sysctl settings"
      sysctl:
        fs.inotify.max_user_instances: 123192
      after:
        - name: "FULL NAME OF THE STAGE TO OVERRIDE"
```

This would ensure that your custom sysctl setting is applied after the default sysctl configuration provided by Kairos, even if they are in the same stage and step, yip will move it into a different layer to assure that it is run after.

For a practical example:

/oem/01_first.yaml
```yaml
stages:
  test:
  - name: "First stage"
    commands:
      - echo "Hello"
```

/oem/02_second.yaml
```yaml
stages:
  test:
  - name: "after stage"
    after:
      - name: "/oem/01_first.yaml.First stage"
    commands:
      - echo "Hello"
```

Notice the after directive in the second file, that allows running the command after the first stage has been executed, even if they are in the same stage. And fully guarantees that the second stage will run after the first one, even if they are in the same stage and layer.

The name of the stage to override is the full name of the stage, which is a combination of the file path and the stage name, in this case `/oem/01_first.yaml.First stage`.

If you are not sure of the name of the stage to override, you can run `kairos-agent run-stage -a STAGE` to see the final DAG of the stage, which will include the full name of the stage, and you can use that to override it. Notice that if the yaml file has a root name, that will be used instead of the file name.

Here is a real example of the output of `kairos-agent run-stage -a boot`:

```bash
1.
 <init> (background: false) (weak: false)
2.
 <Start agent.0> (background: false) (weak: true)
 <Start recovery on tty1.Recovery> (background: false) (weak: true)
 <Start installer on tty1..0> (background: false) (weak: true)
 <Default config.Default sysctl settings> (background: false) (weak: true)
 <Enable QEMU tools.Enable QEMU.0> (background: false) (weak: true)
3.
 <Enable QEMU tools.Enable QEMU.1> (background: false) (weak: true)
 <Start installer on tty1..1> (background: false) (weak: true)
4.
 <Enable QEMU tools.Enable VBOX.2> (background: false) (weak: true)
5.
 <Enable QEMU tools.Enable VBOX.3> (background: false) (weak: true)
2025-07-04T07:18:12Z DBG [2994] Generating op for stage '/oem/91_sysctl.yaml.first step'
2025-07-04T07:18:12Z DBG [2994] Generating op for stage '/oem/92_another.yaml.0'
1.
 <init> (background: false) (weak: false)
2.
 </oem/91_sysctl.yaml.first step> (background: false) (weak: true)
3.
 </oem/92_another.yaml.0> (background: false) (weak: true)

```


 - `Start agent.0` -> The file has a root name `Start agent` and the step doesn't have a set name so it gets the step number
```yaml
name: "Start agent"
stages:
  boot:
    - if: '[ ! -f "/run/cos/recovery_mode" ]'
      only_service_manager: "systemd"
      files:
        - path: /etc/systemd/system/kairos-agent.service
...
```
 - `Start recovery on tty1.Recovery` -> The file has a root name `Start recovery on tty1` and the step has a name `Recovery`
```yaml
name: "Start recovery on tty1"
stages:
  boot:
    - name: "Recovery"
      if: '[ -f "/run/cos/recovery_mode" ]'
      hostname: "cos-recovery"
      commands:
...
```
 - `/oem/91_sysctl.yaml.first step` -> The file has no root name and the step has a name `first step`, so it gets the file name plus step name.
```yaml
stages:
  boot:
    - name: first step
```
 - `/oem/92_another.yaml.0` -> The file has no root name and the step has no name, so it gets the file name plus step number.
```yaml
stages:
  boot:
    - commands:
```


[^1]: Steps executed at the `chroot` stage are running inside the new OS as chroot, allowing to write persisting changes to the image, for example by downloading and installing additional software.
