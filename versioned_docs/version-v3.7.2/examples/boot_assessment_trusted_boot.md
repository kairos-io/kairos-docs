---
title: "Enabling Automatic Boot Assessment with Trusted Boot"
sidebar_label: "Enabling Automatic Boot Assessment with Trusted Boot"
sidebar_position: 4
description: This section describe examples on how to enable Automatic Boot Assessment with Trusted Boot in your own services.
---

## Boot Assessment in Kairos: Introduction and Extensions

Kairos provides a robust mechanism for assessing the success or failure of boot entries through integration with `systemd-boot`. This document is divided into two parts:

1. **Kairos Default Boot Assessment Strategy**: Explains how boot assessment is managed in a standard Kairos installation.
2. **Extending the Default Boot Assessment**: Shows how to customize and extend Kairos boot assessment by integrating additional systemd services and adding automatic reboot mechanisms.

---

## Part 1: Kairos Default Boot Assessment Strategy

Kairos uses `systemd-boot` to manage boot entries and determine their health based on runtime behavior. The current boot assessment strategy in Kairos works as follows:

1. **Boot Entry Marking**:
   - If the system successfully reaches `multi-user.target`, the boot entry is marked as *good*.
   - If it does not, retries are consumed for the boot entry.

2. **Failure Handling**:
   - Kernel panics, `initramfs` failures, or any unexpected reboots reduce the retry count for the current boot entry.
   - No Kairos services explicitly auto-reboot on failure.

3. **Retry Exhaustion and Fallbacks**:
   - Each boot entry is given a limited number of retries (3 by default).
   - If retries are exhausted:
      - The **passive (fallback)** entry is booted next.
      - If the passive entry also fails, the system boots into **recovery** mode.
      - If recovery fails, the system attempts **autorecovery**.

:::info
Current boot fallback behaviour is not set in stone yet and prone to changes in the future.
:::

This default behavior ensures resilience and an automatic progression to recovery states, but it can be further extended to incorporate custom services and automatic reboot logic.





## Part 2: Extending the Default Boot Assessment with Your Own Services

While the default Kairos behavior is sufficient for many use cases, you can extend the boot assessment mechanism to include custom services and additional robustness features, such as:

- Integrating custom systemd services into the boot assessment process.
- Adding automatic reboot behavior for services that fail.


:::info
All the commands shown in this tutorial are meant to be run on a Kairos node.
:::


## Step 1: Configuring a Service to Trigger `boot-complete.target`

To ensure a service's failure impacts the boot assessment, modify its service file to interact with `boot-complete.target`:

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

As usual you can use cloud-init with the different stage_modules) to automate this process. Here is an example of how to use cloud-init to enable boot assessment and configure services to participate in the boot assessment process:

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

 - We expect the number of checks for a system to be marked "good" to keep growing as we add more checks to the boot assessment process.
 - Services are started on both passive and active boot entries. So if a service is failing on active, and the failure is not due to the OS, it will also fail on passive. This can lead to the system rebooting on passive boot entries as well as active and end in the system booting to recovery.
 - We recommend using this feature with caution, as it can lead to a boot loop if not configured correctly.
 - Ideally, as the upgrade is done against the active images, we would recommend having 2 service overrides, one for the active and one for the passive, to avoid the system rebooting on passive boot entries and having a safe fallback to the active boot entry. This can be achieved by using and IF stanza when using cloud-init to check for the system state (marked by the files `/run/cos/active_mode` and `/run/cos/passive_mode`) so the service that auto reboots can be started only on the active boot entry.

The follow up example uses cloud-init to generate 2 different service overrides during initramfs, one for the active and one for the passive boot entry. Only when selecting the active entry will the service auto restart:

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
   
For more information about cloud-init in Kairos, see the [Cloud-Init Architecture](/docs/v3.7.2/architecture/cloud-init/) guide.
For more information about stage modules, see the [Stage Modules Reference](/docs/v3.7.2/reference/stage_modules/).
   