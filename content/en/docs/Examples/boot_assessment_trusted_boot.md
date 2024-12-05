---
title: "Enabling Automatic Boot Assessment with Trusted Boot"
linkTitle: "Enabling Automatic Boot Assessment with Trusted Boot"
weight: 4
description: This section describe examples on how to enable Automatic Boot Assessment with Trusted Boot in your own services.
---



In this tutorial, we will walk through how to configure Kairos to enable **automatic boot assessment**, where the boot loader can determine the health of a boot entry. Specifically, we'll configure systemd services to trigger the `boot-complete.target` to mark boot entries as *good* or *bad*. We'll also cover how to implement automatic reboots when a service fails, allowing retries of a boot entry until success or exhaustion of attempts.

---

{{% alert color="info" %}}
All the commands shown in this tutorial are meant to be run on a Kairos node.
{{% /alert %}}


## Overview of Trusted Boot Automatic Boot Assessment

`systemd-boot` manages boot entries and provides a mechanism to automatically assess their success or failure. The key features are:

1. **Boot Entry Marking**:
    - A boot entry is marked as *good* when the `boot-complete.target` is reached during startup.
    - If the system fails to reach `boot-complete.target`, the boot entry is marked as *bad*.

2. **Retries**:
    - By default, each boot entry has **3 retries**. A failure to reach `boot-complete.target` reduces the retry count. Once retries are exhausted, another boot entry is chosen if available.

3. **Service-Level Controls**:
    - Configure services to participate in boot entry assessment and trigger reboots on failure.

---

## Step 1: Configuring a Service to Trigger `boot-complete.target`

To ensure a service's success or failure impacts the boot assessment, modify its service file to interact with `boot-complete.target`:

1. **Edit the Service File**:  

   Override the service configuration using:
   ```bash
   sudo systemctl edit <service-name>
    ```

2. **Add Dependencies and Order to the Service File**:

   Append the following to the override file:
    ```bash
    [Unit]
    # Ensure this unit starts after default system targets
    After=default.target graphical.target multi-user.target
    # Ensure this unit completes before boot-complete.target
    Before=boot-complete.target
   
    [Install]
    # Make this service a hard dependency of boot-complete.target
    RequiredBy=boot-complete.target
    ```
   
3. **Reload Systemd and Enable the Service:**:

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable <service-name>
    ```
   
4. **Explanation**:

  - The service runs after critical system targets (e.g., default.target) to ensure the system is operational.
  - The service must complete successfully to allow boot-complete.target to be reached.
  - If the service fails, the boot entry is not marked as good.


## Step 2: Adding Automatic Reboot to a Service

To configure a service to automatically reboot the system upon failure:

1.  Edit the Service File:

    Override the service configuration using:
    ```bash
    sudo systemctl edit <service-name>
    ```
2. Add the Reboot Action:

   In the [Unit] section, add:
    ```bash
    [Unit]
    FailureAction=reboot
    ```
3. Reload Systemd:
    ```bash
    sudo systemctl daemon-reload
    ```
4. Explanation:
   - On failure, FailureAction=reboot instructs systemd to reboot the system.
   - This causes the boot entry to retry until success or retries are exhausted.


## Step 3: Combining Both Approaches

While the above configurations are independent, combining them can create a robust system:

1. Trigger boot-complete.target:
   Configure services as described in Step 1 to impact boot assessment.

2. Enable Automatic Reboot:
   Add `FailureAction=reboot` to relevant services as described in Step 2.

3. Behavior:
  - On a service failure, the system reboots (`FailureAction=reboot`).
  - During the retry, if boot-complete.target is not reached, the boot entry is not marked as good, and retries continue.
  - If retries are exhausted, the system attempts the next available boot entry.


## Using cloud configs to automate the process

As usual you can use [cloud-init]({{%relref "/docs/architecture/cloud-init" %}}) with the different [stages]({{%relref "/docs/reference/stage_modules" %}}) to automate this process. Here is an example of how to use cloud-init to enable boot assessment and configure services to participate in the boot assessment process:

```yaml
#cloud-config
name: Enable Boot assessment for <service-name>
stages:
  initramfs:
    - name: Configure service to trigger boot-complete.target
      files:
         - path: /etc/systemd/system/<service-name>.service.d/override.conf
           permissions: 0644
           owner: 0
           group: 0
           content: |
             [Unit]
             # Ensure this unit starts after default system targets
             After=default.target graphical.target multi-user.target
             # Ensure this unit completes before boot-complete.target
             Before=boot-complete.target
             # If auto reboot on service failure is wanted
             FailureAction=reboot
             [Install]
             # Make this service a hard dependency of boot-complete.target
             RequiredBy=boot-complete.target
    - name: Enable service
      systemctl:
         enabled:
            - <service-name>
```


## Notes

 - Services are started on both passive and active boot entries. So if a service is failing on active, and the failure is not due to the OS, it will also fail on passive. This can lead to the system rebooting on passive boot entries as well as active and end in the system booting to recovery.
 - We recommend using this feature with caution, as it can lead to a boot loop if not configured correctly.
 - Ideally, as the upgrade is done against the active images, we would recommend having 2 service overrides, one for the active and one for the passive, to avoid the system rebooting on passive boot entries and having a safe fallback to the active boot entry. This can be achieved by using and IF stanza when using cloud-init to check for the system state (marked by the files `/run/cos/active_mode` and `/run/cos/passive_mode`) so the service that auto reboots can be started only on the active boot entry.

The follow up example uses [cloud-init]({{%relref "/docs/architecture/cloud-init" %}}) to generate 2 different service overrides during initramfs, one for the active and one for the passive boot entry. Only when selecting the active entry will the service auto restart:

```yaml
#cloud-config
name: Enable Boot assessment for <service-name>
stages:
  initramfs:
    - name: Configure service to trigger boot-complete.target on active
      if: '[ ! -f "/run/cos/active_mode" ]'
      files:
        - path: /etc/systemd/system/<service-name>.service.d/override.conf
          permissions: 0644
          owner: 0
          group: 0
          content: |
            [Unit]
            # Ensure this unit starts after default system targets
            After=default.target graphical.target multi-user.target
            # Ensure this unit completes before boot-complete.target
            Before=boot-complete.target
            # If auto reboot on service failure is wanted
            FailureAction=reboot
            [Install]
            # Make this service a hard dependency of boot-complete.target
            RequiredBy=boot-complete.target
    - name: Configure service to trigger boot-complete.target on passive
      if: '[ ! -f "/run/cos/passive_mode" ]'
      files:
        - path: /etc/systemd/system/<service-name>.service.d/override.conf
          permissions: 0644
          owner: 0
          group: 0
          content: |
            [Unit]
            # Ensure this unit starts after default system targets
            After=default.target graphical.target multi-user.target
            # Ensure this unit completes before boot-complete.target
            Before=boot-complete.target
            [Install]
            # Make this service a hard dependency of boot-complete.target
            RequiredBy=boot-complete.target
    - name: Enable service
      systemctl:
         enabled:
            - <service-name>
```
   