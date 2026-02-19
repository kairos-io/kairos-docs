---
title: "Trusted Boot Upgrades"
sidebar_label: "Trusted Boot"
sidebar_position: 6
date: 2022-11-13
description: Learn how to upgrade a Kairos node with Trusted Boot enabled
---


:::warning Warning
This section is still a work in progress and only available in Kairos v3.x releases and alphas.
:::

This section covers how to upgrade a Kairos node with Trusted Boot enabled.

See the [Trusted Boot Installation](/docs/v3.5.7/Installation/trustedboot/) and [Trusted Boot Architecture](/docs/v3.5.7/Architecture/trustedboot/) pages for more references.

### Upgrades

In order to upgrade a node to a new version of the OS, you need to generate again the installable medium with the same keys used in the steps before.

:::tip Note
The resulting container image can be used for upgrades with `kairos-agent`.
:::

The process will generate an EFI file which we will pack into a container image that will be used to upgrade the node.

#### Generate the upgrade image

1. Build the Container image used for upgrades

```bash {class="only-flavors=Ubuntu+24.04,Fedora+40"}
CONTAINER_IMAGE={{<oci variant="core">}}

docker run --rm -v $PWD/keys:/keys -v $PWD:/work -ti {{< registryURL >}}/auroraboot:{{< auroraBootVersion >}} build-uki -t container --public-keys /keys --tpm-pcr-private-key $PATH_TO_TPM_KEY --sb-key $PATH_TO_SB_KEY --sb-cert $PATH_TO_SB_CERT $CONTAINER_IMAGE
```

2. Push the upgrade image to a registry

```bash
# Now you can load upgrade_image.tar to a registry and use it with kairos-agent
docker load -i *.tar
#401b8e83daf6: Loading layer [==================================================>]  1.263GB/1.263GB
# Loaded image: kairos_uki:v3.0.0-alpha2
docker push <IMAGE_NAME>
```

#### Upgrade with kairos-agent

:::warning Warning
For upgrading use the image that has been loaded with `docker load` in the step earlier. That contains the EFI files for the upgrade process. **Do not use** the source/base image used (`$CONTAINER_IMAGE` in the example above) used as input!
:::

Let's assume an upgrade image named `acme.com/acme/kairos` has been built and pushed
as described in the section above. From a shell inside a running Kairos OS,
the following command will upgrade to the new version:

```bash
kairos-agent upgrade --source oci:acme.com/acme/kairos
```

#### Upgrades with Kubernetes

To upgrade Kairos with Kubernetes, the Kairos operator needs to be deployed on the target cluster. [Read the instructions here](/docs/v3.5.7/Upgrade/kairos-operator/).

A `NodeOp` resource needs to be created which will use the image generated in the step above.
Since that image only contains the EFI files for the upgrade and in order to be able use any ImagePullSecrets
defined on the cluster, we will create an image that can be used to start a Pod and also contains
the efi and conf files for the upgrade.

Assuming an upgrade image named `acme.com/acme/kairosUpgradeImage` was built using a Kairos
image named `acme.com/acme/baseImage`, the following
dockerfile will create an image that can be used to start a Plan for upgrade:

```
FROM acme.com/acme/kairos as upgradeImage
FROM acme.com/acme/baseImage
COPY --from=upgradeImage / /trusted-boot
```
(Let's call the image built with this dockerfile `planImage:vx.y.z`)

The following NodeOp can now be deployed on the cluster:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: trusted-boot-upgrade
  namespace: default
spec:
  # NodeSelector to target specific nodes
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  # The container image containing the upgrade files
  image: "planImage"

  # Custom command to execute the trusted boot upgrade
  command:
    - sh
    - -c
    - |
      set -e
      rm -rf /host/usr/local/trusted-boot
      mkdir -p /host/usr/local/trusted-boot
      mount --rbind /trusted-boot /host/usr/local/trusted-boot
      chroot /host kairos-agent --debug upgrade --source dir:/usr/local/trusted-boot

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

:::tip Note
To understand more on how this works, see the [Kairos operator documentation](/docs/v3.5.7/Upgrade/kairos-operator/) for general information about the operator and the [regular upgrade process](/docs/v3.5.7/Upgrade/kubernetes/) for non-trusted boot upgrades.
:::
