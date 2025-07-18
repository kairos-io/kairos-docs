---
title: "Trusted Boot Upgrades"
linkTitle: "Trusted Boot"
weight: 6
date: 2022-11-13
description: Learn how to upgrade a Kairos node with Trusted Boot enabled
---


{{% alert title="Warning" color="warning" %}}
This section is still a work in progress and only available in Kairos v3.x releases and alphas.
{{% /alert %}}

This section covers how to upgrade a Kairos node with Trusted Boot enabled.

See the [Trusted Boot Installation]({{< relref "../installation/trustedboot" >}}) and [Trusted Boot Architecture]({{< relref "../architecture/trustedboot" >}}) pages for more references.

### Upgrades

In order to upgrade a node to a new version of the OS, you need to generate again the installable medium with the same keys used in the steps before.

{{% alert title="Note" color="success" %}}
The resulting container image can be used for upgrades with `kairos-agent`.
{{% /alert %}}

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

{{% alert title="Warning" color="warning" %}}
For upgrading use the image that has been loaded with `docker load` in the step earlier. That contains the EFI files for the upgrade process. **Do not use** the source/base image used (`$CONTAINER_IMAGE` in the example above) used as input!
{{% /alert %}}

Let's assume an upgrade image named `acme.com/acme/kairos` has been built and pushed
as described in the section above. From a shell inside a running Kairos OS,
the following command will upgrade to the new version:

```bash
kairos-agent upgrade --source oci:acme.com/acme/kairos
```

#### Upgrades with Kubernetes

To upgrade Kairos with Kubernetes, system-upgrade-controller needs to be deployed on the target cluster. [Read the instructions here]({{< relref "./system-upgrade-controller" >}}).

A "Plan" resource needs to be created which will use the image generated in the step above.
Since that image only contains the EFI files for the upgrade and in order to be able use any ImagePullSecrets
defined on the cluster, we will create and image that can be used to start a Pod and also contains
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

The following plan can now be deployed on the cluster:

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: upgrade
  namespace: system-upgrade
type: Opaque
stringData:
  upgrade.sh: |
    #!/bin/sh
    rm -rf /host/usr/local/trusted-boot
    mkdir -p /host/usr/local/trusted-boot
    mount --rbind /trusted-boot /host/usr/local/trusted-boot
    chroot /host kairos-agent --debug upgrade --source dir:/usr/local/trusted-boot
---
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: os-upgrade
  namespace: system-upgrade
  labels:
    k3s-upgrade: server
spec:
  concurrency: 1
  version: "vx.y.z" # The tag of the "upgrade.image" below
  nodeSelector:
    matchExpressions:
      - {key: kubernetes.io/hostname, operator: Exists}
  serviceAccountName: system-upgrade
  secrets:
    - name: upgrade
      path: /host/run/system-upgrade/secrets/upgrade
  cordon: false
  drain:
    force: false
    disableEviction: true
  upgrade:
    image: "planImage"
    command: ["sh"]
    args: ["/run/system-upgrade/secrets/upgrade/upgrade.sh"]
```

{{% alert title="Note" color="success" %}}
To understand more on how this works, see the [example here](https://github.com/rancher/system-upgrade-controller/blob/master/examples/ubuntu/bionic.yaml) regarding
the system upgrade controller and the [`suc-upgrade.sh` script](https://github.com/kairos-io/packages/blob/821de2dded0c2f590b539261002c5d257fb8ea07/packages/system/suc-upgrade/suc-upgrade.sh#L13-L15)
which is used for regular (non trusted boot) upgrades.
{{% /alert %}}