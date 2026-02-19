---
title: "Upgrading from Kubernetes"
sidebar_label: "From Kubernetes"
sidebar_position: 2
date: 2022-11-13
description: Learn how to upgrade Kairos using Kubernetes
---

Kairos upgrades can be performed either manually or via Kubernetes if the cluster is composed of Kairos nodes. The recommended approach is to use the Kairos operator, which provides a more integrated and Kairos-specific way to manage upgrades.

## Prerequisites

The Kairos operator needs to be deployed on the target cluster. [Read the instructions here](/docs/v3.6.0/upgrade/kairos-operator/)

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
  image: quay.io/kairos/@flavor
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

Container images can be signed during the build phase of a CI/CD pipeline using [Cosign](https://github.com/sigstore/cosign), Kairos signs every artifact as part of the release process.

To ensure that the images used during upgrades match the expected signatures, [Kyverno](https://kyverno.io/) can be used to set up policies. This is done by checking if the signature is present in the OCI registry and if the image was signed using the specified key. The policy rule check fails if either of these conditions is not met.

To learn more about this specific Kyverno feature, you can refer to the [documentation](https://kyverno.io/docs/writing-policies/verify-images/). This allows for the verification of image authenticity directly at the node level prior to upgrading.

A Kyverno policy for standard images might look like the following:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: check-image
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  failurePolicy: Fail
  rules:
    - name: check-image
      match:
        any:
        - resources:
            kinds:
              - Pod
      verifyImages:
      - imageReferences:
        - "quay.io/kairos/@flavor*"
        attestors:
        - entries:
          # See: https://kyverno.io/docs/writing-policies/verify-images/#keyless-signing-and-verification
          - keyless:
              subject: "https://github.com/kairos-io/provider-kairos/.github/workflows/release.yaml@refs/tags/*"
              issuer: "https://token.actions.githubusercontent.com"
              rekor:
                url: https://rekor.sigstore.dev
```

To install Kyverno in a Kairos cluster, you can simply use the community [bundles](/docs/v3.6.0/advanced/bundles/). For example, you can use the following installation cloud config file:

```yaml
#cloud-config

hostname: kyverno-{{ trunc 4 .MachineID }}

# Specify the bundle to use
bundles:
- targets:
  - run://quay.io/kairos/community-bundles:cert-manager_latest
  - run://quay.io/kairos/community-bundles:kyverno_latest

users:
- name: kairos
  passwd: kairos
  groups:
  - admin

k3s:
 enabled: true
```

This configuration file prepares the system with the `cert-manager` and `kyverno` bundles, enabling `k3s`. The Kairos operator can be deployed separately using the instructions in the [Kairos Operator documentation](/docs/v3.6.0/upgrade/kairos-operator/).

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
  image: quay.io/kairos/@flavor
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
  image: quay.io/kairos/@flavor
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

- [Upgrade nodes manually](/docs/v3.6.0/upgrade/manual/)
- [Immutable architecture](/docs/v3.6.0/architecture/immutable/)
- [Create decentralized clusters](/docs/v3.6.0/installation/p2p/)
