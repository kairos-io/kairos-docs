---
title: "Upgrading from Kubernetes"
sidebar_label: "From Kubernetes"
sidebar_position: 2
date: 2022-11-13
description: Learn how to upgrade Kairos using Kubernetes
---

Kairos upgrades can be performed either manually or via Kubernetes if the cluster is composed of Kairos nodes. The recommended approach is to use the Kairos operator, which provides a more integrated and Kairos-specific way to manage upgrades.

## Prerequisites

The Kairos operator needs to be deployed on the target cluster. [Read the installation instructions here](/operator-docs/installation/)

### Upgrading from version X to version Y with Kubernetes

To trigger an upgrade, create a `NodeOpUpgrade` resource which refers to the image version that you want to upgrade to. This is the recommended approach for upgrading Kairos nodes.

```bash
cat <<'EOF' | kubectl apply -f -
---
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-upgrade
  namespace: default
spec:
  # The container image containing the new Kairos version
  image: {{< RegistryURL  >}}/{{< FlavorCode  >}}
  # Example: quay.io/kairos/debian

  # NodeSelector to target specific nodes (optional)
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # Maximum number of nodes that can run the upgrade simultaneously
  # 0 means run on all nodes at once
  concurrency: 1

  # Whether to stop creating new jobs when a job fails
  # Useful for canary deployments
  stopOnFailure: true

  # Whether to upgrade the active partition (defaults to true)
  upgradeActive: true

  # Whether to upgrade the recovery partition (defaults to false)
  upgradeRecovery: false

  # Whether to force the upgrade without version checks
  force: false
EOF
```

To upgrade the "recovery" partition instead of the active one, set `upgradeRecovery: true` and `upgradeActive: false`:

```yaml
spec:
  # ... other fields ...
  upgradeActive: false
  upgradeRecovery: true
```

To check all the available versions, see the [images](https://quay.io/repository/kairos/opensuse?tab=tags) available on the container registry, corresponding to the flavor/version selected.

:::tip Note
The Kairos operator provides several upgrade strategies that can be configured through the `NodeOpUpgrade` resource. You can control concurrency, node selection, and failure handling. The example above shows a "canary upgrade" approach where nodes are upgraded one-by-one with failure detection.

:::
Jobs will be created for each node that needs to be upgraded. You can monitor the progress:

```bash
$ kubectl  get jobs -A
NAMESPACE         NAME                             STATUS     COMPLETIONS   DURATION   AGE
default           kairos-upgrade-localhost-wr26f   Running    0/1           24s        24s

$ kubectl  get nodeopupgrades
NAME             AGE
kairos-upgrade   5s
```

Done! We should have all the basics to get our first cluster rolling, but there is much more we can do.

## Verify images attestation during upgrades

Kairos images are signed, and you can check those signatures during upgrades with Kyverno. See the [Kyverno integration page](/docs/integrations/kyverno/) for the policy and setup steps.

## Customize the upgrade process

For advanced customization, you can use a `NodeOp` resource directly instead of `NodeOpUpgrade`. This gives you full control over the upgrade process and allows you to run custom commands before or after the upgrade:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: custom-kairos-upgrade
  namespace: default
spec:
  # NodeSelector to target specific nodes
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # The container image containing the new Kairos version
  image: {{< RegistryURL  >}}/{{< FlavorCode  >}}
  # Example: quay.io/kairos/debian

  # Custom command to execute
  command:
    - sh
    - -c
    - |
      set -e

      # Custom pre-upgrade commands
      echo "Running pre-upgrade tasks..."
      sed -i 's/something/to/g' /host/oem/99_custom.yaml

      # Run the upgrade
      mount --rbind /host/dev /dev
      mount --rbind /host/run /run
      kairos-agent upgrade --source dir:/

      # Custom post-upgrade commands
      echo "Running post-upgrade tasks..."
      # Add any post-upgrade logic here

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
  concurrency: 1

  # Whether to stop creating new jobs when a job fails
  stopOnFailure: true
```

## Upgrade from c3os to Kairos

If you already have a `c3os` deployment, upgrading to Kairos requires changing every instance of `c3os` to `kairos` in the configuration file. This can be done using a custom `NodeOp` resource:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: c3os-to-kairos-upgrade
  namespace: default
spec:
  # NodeSelector to target specific nodes
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # The container image containing the new Kairos version
  image: {{< RegistryURL  >}}/{{< FlavorCode  >}}
  # Example: quay.io/kairos/debian

  # Custom command to execute
  command:
    - sh
    - -c
    - |
      set -e
      # Replace c3os with kairos in configuration
      sed -i 's/c3os/kairos/g' /host/oem/99_custom.yaml
      # Run the upgrade
      mount --rbind /host/dev /dev
      mount --rbind /host/run /run
      kairos-agent upgrade --source dir:/

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
  concurrency: 1

  # Whether to stop creating new jobs when a job fails
  stopOnFailure: true
```

## What's next?

- [Upgrade nodes manually](/docs/upgrade/manual)
- [Immutable architecture](/docs/architecture/immutable)
- [Create decentralized clusters](/docs/installation/p2p)
