---
title: "Reset a node"
sidebar_label: "Reset"
description: Discover how to reset a Kairos node using boot options, Kubernetes integration, or recovery tools while preserving config data.
sidebar_position: 4
date: 2022-11-13
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Kairos has a recovery mechanism built-in which can be leveraged to restore the system to a known point. At installation time, the recovery partition is created from the installation medium and can be used to restore the system from scratch, leaving configuration intact and cleaning any persistent data accumulated by usage in the host (e.g. Kubernetes images, persistent volumes, etc. ).

The reset action will regenerate the bootloader configuration and the images in the state partition (labeled `COS_STATE`) by using the recovery image generated at install time, cleaning up the host.

The configuration files in `/oem` are kept intact, the node on the next reboot after a reset will perform the same boot sequence (again) of a first-boot installation.

# How to

:::tip Note

By following the steps below you will _reset_ entirely a node and the persistent data will be lost. This includes _every_ user-data stored on the machine.

:::

The reset action can be accessed via the Boot menu, remotely, triggered via Kubernetes or manually. In each scenario the machine will reboot into reset mode, perform the cleanup, and reboot automatically afterwards.

## From the boot menu

It is possible to reset the state of a node by either booting into the "Reset" mode into the boot menu, which automatically will reset the node:

![reset](https://user-images.githubusercontent.com/2420543/191941281-573e2bed-f66c-48db-8c46-e8034417539e.gif?classes=border,shadow)

## Remotely, via command line

On a Kairos booted system, logged as root:

<Tabs>
<TabItem value="kairos-v3-0-0-and-upwards" label="Kairos v3.0.0 and upwards">
To directly select the entry:

```bash
$ kairos-agent bootentry --select statereset
```


Or to get a list of available boot entries and select one interactively:

```bash
$ kairos-agent bootentry
```
</TabItem>
<TabItem value="kairos-before-v3-0-0" label="Kairos before v3.0.0">
```bash
$ grub2-editenv /oem/grubenv set next_entry=statereset
$ reboot
```
</TabItem>
</Tabs>


## From Kubernetes

The [Kairos operator](/docs/v3.5.7/upgrade/kairos-operator/) can be used to apply a NodeOp to the nodes to use Kubernetes to schedule the reset on the nodes itself, similarly on how upgrades are applied.

Consider the following example which resets a machine by changing the config file used during installation:

<Tabs>
<TabItem value="kairos-v3-0-0-and-upwards" label="Kairos v3.0.0 and upwards">
```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: reset-and-reconfig
  namespace: default
spec:
  # NodeSelector to target specific nodes
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # The container image to use
  image: {{< RegistryURL  >}}/{{< FlavorCode  >}}

  # Custom command to execute
  command:
    - sh
    - -c
    - |
      set -e

      # Create new configuration
      cat > /host/oem/90_custom.yaml << 'EOF'
      #cloud-config
      hostname: testcluster-{{ trunc 4 .MachineID }}
      k3s:
        enabled: true
      users:
      - name: kairos
        passwd: kairos
        groups:
        - admin
        ssh_authorized_keys:
        - github:mudler
      EOF

      # Set next boot to reset state
      grub2-editenv /host/oem/grubenv set next_entry=statereset
      sync
      # Note: The reboot is handled automatically by the operator when rebootOnSuccess: true

  # Path where the node's root filesystem will be mounted
  hostMountPath: /host

  # Whether to cordon the node before running the operation
  cordon: true

  # Drain options for pod eviction
  drainOptions:
    enabled: true
    force: false
    gracePeriodSeconds: 30
    ignoreDaemonSets: true
    deleteEmptyDirData: false
    timeoutSeconds: 300

  # Whether to reboot the node after successful operation
  rebootOnSuccess: true

  # Maximum number of nodes that can run the operation simultaneously
  concurrency: 2

  # Whether to stop creating new jobs when a job fails
  stopOnFailure: true
```
</TabItem>
<TabItem value="kairos-before-v3-0-0" label="Kairos before v3.0.0">
```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: custom-script
  namespace: system-upgrade
type: Opaque
stringData:
  config.yaml: |
    #cloud-config
    hostname: testcluster-{{ trunc 4 .MachineID }}
    k3s:
      enabled: true
    users:
    - name: kairos
      passwd: kairos
      groups:
      - admin
      ssh_authorized_keys:
      - github:mudler
  add-config-file.sh: |
    #!/bin/sh
    set -e
    if diff /host/run/system-upgrade/secrets/custom-script/config.yaml /host/oem/90_custom.yaml >/dev/null; then
        echo config present
        exit 0
    fi
    # we can't cp, that's a symlink!
    cat /host/run/system-upgrade/secrets/custom-script/config.yaml > /host/oem/90_custom.yaml
    kairos-agent bootentry --select statereset
    sync

    mount --rbind /host/dev /dev
    mount --rbind /host/run /run
    nsenter -i -m -t 1 -- reboot
    exit 1
---
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: reset-and-reconfig
  namespace: system-upgrade
spec:
  concurrency: 2
  # This is the version (tag) of the image.
  version: "{{< OCITag variant=\"standard\"  >}}"
  nodeSelector:
    matchExpressions:
      - { key: kubernetes.io/hostname, operator: Exists }
  serviceAccountName: system-upgrade
  cordon: false
  upgrade:
    # Here goes the image which is tied to the flavor being used.
    # Currently can pick between opensuse and alpine
    image: {{< RegistryURL  >}}/{{< FlavorCode  >}}
    command:
      - "/bin/bash"
      - "-c"
    args:
      - bash /host/run/system-upgrade/secrets/custom-script/add-config-file.sh
  secrets:
    - name: custom-script
      path: /host/run/system-upgrade/secrets/custom-script
```

</TabItem>
</Tabs>



## Manual reset

It is possible to trigger the reset manually by logging into the recovery from the boot menu and running `kairos reset` from the console.

### Cleaning up state directories

An alternative way and manual of resetting your system is possible by deleting the state paths. You can achieve this by deleting the contents of the `/usr/local` directory. It's recommended that you do this while in recovery mode with all services turned off.

Please note that within `/usr/local`, there are two important folders to keep in mind. The first is `/usr/local/.kairos`, which contains sentinel files that will trigger a complete deployment from scratch when deleted. However, your data will be preserved. The second folder is `/usr/local/.state`, which contains the bind-mounted data for the system. By deleting these two folders, you can achieve a pristine environment while leaving all other contents of `/usr/local` untouched.
