---
title: "Troubleshooting"
linkTitle: "Troubleshooting"
weight: 6
date: 2022-11-13
---

Things can go wrong. This section tries to give guidelines in helping out identify potential issues.

It is important first to check out if your issue was already submitted [in the issue tracker](https://github.com/kairos-io/kairos/issues).


{{< tabpane text=true  >}}
{{% tab header="Kairos" %}}
## Gathering logs

To gather useful logs and help developers spot right away issues, it's suggested to boot with `console=tty0 rd.debug` enabled for example:

![debug](https://user-images.githubusercontent.com/2420543/191934926-7d4ac908-9a4c-4ef4-9891-75820e6b8fe6.gif)

To edit the boot commands, type 'e' in the boot menu. To boot with the changes press 'CTRL+X'.

In case logs can't be acquired, taking screenshot or videos while opening up issues it's strongly recommended!

Another option that can be enabled is immucore debug logs with `rd.immucore.debug`

After booting, you can find the logs from immucore under `/run/immucore/` (whether you enabled debug output or not).
Check the [immucore README](https://github.com/kairos-io/immucore/) for more configuration parameters.

## Initramfs breakpoints

Initramfs can be instructed to drop a shell in various phases of the boot process. For instance:

- `rd.break=pre-mount rd.shell`: Drops a shell before setting up mount points.
- `rd.break=pre-pivot rd.shell`: Drops a shell before switch-root

## Disable immutability

It is possible to disable immutability by adding `rd.cos.debugrw` to the kernel boot commands.

## See also

- [Dracut debug docs](https://fedoraproject.org/wiki/How_to_debug_Dracut_problems)

{{% /tab %}}
{{% tab header="Kairos UKI" %}}

### Note

The workflow for building UKI images is not yet set in stone and might change in the future so currently we cannot advise how to proceed here to build the UKI images with debug options yet. This will be updated in the future.


Currently on UKI mode we cannot easily change the cmdline to provide debug options easily as the cmdline is measured by the TPM and the system will not boot if the cmdline is changed.



## Enable Immucore debug logs

In case of boot issues, Immucore accepts the `rd.immucore.debug` parameter in the cmdline to enable debug logs.

After booting, you can find the logs from immucore under `/run/immucore/` (whether you enabled debug output or not).

## Disabling SecureBoot

In case of issues with SecureBoot, it's possible to disable it from the UEFI settings and make Immucore boot without it by setting the `rd.immucore.securebootdisabled` parameter in the cmdline. Note that this is not supported and its only provided for troubleshooting purposes as it defeats the purpose of the security features provided by SecureBoot.

{{% /tab %}}
{{< /tabpane >}}
## Root permission

By default, there is no root user set. A default user (`kairos`) is created and can use `sudo` without password authentication during LiveCD bootup.

## Get back the kubeconfig

On all nodes, which are deployed with the P2P full-mesh feature of the cluster, it's possible to invoke `kairos get-kubeconfig` to recover the kubeconfig file.

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
- You can also run `kairos-agent config` and attach the output to the issue as that provides information about various components of the system
- You can also run `kairos-agent config show` and attach the output to the issue as that provides the current cloud-config for the system (Be aware that any sensitive information should be redacted before attaching the output)
- Immucore logs, available under `/run/immucore/` can be useful to attach as well
- Agent logs, available under `/var/log/kairos/*.log` which are stored on each run of the agent
- Journalctl logs for the following services (use `journalctl -u <service>` to get the logs) can be useful:
  - cos-setup-network
  - cos-setup-fs
  - cos-setup-boot
  - kairos