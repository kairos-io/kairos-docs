---
title: "OSArtifact"
linkTitle: "OSArtifact"
weight: 4
date: 2025-07-25
description: Build OS artifacts (ISOs, cloud images, netboot) from container images using the OSArtifact custom resource
---

The `OSArtifact` custom resource allows you to build Linux distribution artifacts (ISO images, cloud images, netboot artifacts, etc.) from container images directly in Kubernetes. This is particularly useful for building Kairos OS images and other bootable artifacts as Kubernetes-native resources.

{{% alert title="Note" color="info" %}}
This guide provides detailed information about building Kairos images using the Kairos operator. For a complete guide on creating custom cloud images, including when and how to use these build methods, see [Creating Custom Cloud Images](/docs/advanced/creating_custom_cloud_images/).
{{% /alert %}}

While it's possible to just run Kairos from the artifacts provided by our release process, there are specific use-cases which need extended customization, for example when additional kernel modules, or custom, user-defined logic that you might want to embed in the media used for installations.

## Prerequisites

To build with the Kubernetes Native extensions, a Kubernetes cluster is required and `helm` and `kubectl` installed locally. Note [kind](https://github.com/kubernetes-sigs/kind) can be used as well. The Native extensions don't require any special permission, and run completely unprivileged.

The [Kairos operator](installation) needs to be installed on the cluster.

## Image Sources

The OSArtifact resource supports two ways to specify the source image:

1. **Pre-built Kairos image** (using `imageName`):
   ```yaml
   spec:
     imageName: quay.io/kairos/opensuse:leap-15.6-core-amd64-generic-v3.6.0
   ```

2. **Dockerfile in a Secret** (using `baseImageDockerfile`):
   ```yaml
   spec:
     baseImageDockerfile:
       name: dockerfile-secret
       key: Dockerfile
     iso: true
   ```

## Build an ISO

To build an ISO, consider the following spec, which provides a hybrid bootable ISO (UEFI/MBR), with the `core` kairos image, adding `helm`:

```yaml
kind: Secret
apiVersion: v1
metadata:
  name: cloud-config
stringData:
  userdata: |
    #cloud-config
    users:
    - name: "kairos"
      passwd: "kairos"
    install:
      device: "auto"
      reboot: true
      poweroff: false
      auto: true # Required, for automated installations
---
kind: OSArtifact
apiVersion: build.kairos.io/v1alpha2
metadata:
  name: hello-kairos
spec:
  imageName: "{{<oci variant="standard">}}"
  iso: true
  bundles:
  # Bundles available at: https://packages.kairos.io/Kairos/
  - quay.io/kairos/packages:helm-utils-3.10.1
  cloudConfigRef:
    name: cloud-config
    key: userdata
  exporters:
  - template:
      spec:
        restartPolicy: Never
        containers:
        - name: upload
          image: quay.io/curl/curl
          command: ["sh", "-ec"]
          args:
          - |
            NGINX_URL="${NGINX_URL:-http://kairos-operator-nginx}"
            for f in /artifacts/*; do
              [ -f "$f" ] || continue
              base=$(basename "$f")
              echo "Uploading $base to $NGINX_URL/$base"
              curl -fsSL -T "$f" "$NGINX_URL/$base" || exit 1
            done
            echo "Upload done"
          env:
          - name: NGINX_URL
            value: "http://kairos-operator-nginx"
          volumeMounts:
          - name: artifacts
            readOnly: true
            mountPath: /artifacts
```

Apply the manifest with `kubectl apply`.

Note, the CRD allows to specify a custom Cloud config file, [check out the full configuration reference](/docs/reference/configuration/).

The exporter in the example above uploads the built artifacts to an nginx server. The operator includes a ready-to-use nginx kustomization that deploys an nginx server with WebDAV upload support. See [Serving Artifacts with Nginx](#serving-artifacts-with-nginx) below.

To download the built artifacts, get the nginx service's node port and use it to fetch the ISO:

```bash
$ PORT=$(kubectl get svc kairos-operator-nginx -o json | jq '.spec.ports[0].nodePort')
$ curl http://<node-ip>:$PORT/hello-kairos.iso -o output.iso
```

## Netboot Artifacts

It is possible to use the CRD to prepare artifacts required for netbooting, by enabling `netboot: true`:

```yaml
kind: OSArtifact
metadata:
  name: hello-kairos
spec:
  imageName: "{{<oci variant="core">}}"
  netboot: true
  netbootURL: ...
  bundles: ...
  cloudConfigRef: ...
  exporters: ...
```

## Build a Cloud Image

Cloud images are images that automatically boot into recovery mode and can be used to deploy whatever image you want to the VM. Custom user-data from the Cloud provider is automatically retrieved. Additionally the CRD allows to embed a custom cloudConfig so that we can use to make configuration permanent also for VM images running outside a cloud provider.

A Cloud Image boots in QEMU and also in AWS, consider:

```yaml
kind: Secret
apiVersion: v1
metadata:
  name: cloud-config
stringData:
  userdata: |
    #cloud-config
    users:
    - name: "kairos"
      passwd: "kairos"
---
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: hello-kairos
spec:
  imageName: "{{<oci variant="core">}}"
  cloudImage: true
  cloudConfigRef:
    name: cloud-config
    key: userdata
```

{{% alert title="Note" color="info" %}}
The cloud image boots into recovery mode on first boot and automatically partitions the disk and resets into the active system. This is handled internally by AuroraBoot during the build process, so the cloud-config only needs to contain your own configuration (users, etc.). The CRD also allows embedding a custom cloud-config to make configuration permanent for VM images running outside a cloud provider.
{{% /alert %}}

After applying the spec, the controller will create a Kubernetes Job which runs the build process and then copy the produced `hello-kairos.raw` file to the nginx server (see above). Alternatively you may configure your own job to copy the content elsewhere. This file is an EFI bootable raw disk, bootable in QEMU and compatible with AWS which automatically provisions the node:

```bash
$ PORT=$(kubectl get svc kairos-operator-nginx -o json | jq '.spec.ports[0].nodePort')
$ curl http://<node-ip>:$PORT/hello-kairos.raw -o output.raw
```

Note, in order to use the image with QEMU, we need to resize the disk at least to 32GB, this can be done with the CRD by setting `diskSize: 32000` or by truncating the file after downloading:

```bash
truncate -s "+$((32000*1024*1024))" hello-kairos.raw
```

This is not required if running the image in the Cloud as providers usually resize the disk during import or creation of new instances.

To run the image locally with QEMU we need `qemu` installed in the system, and we need to be able to run VMs with EFI, for example:

```bash
qemu-system-x86_64 -m 2048 -bios /usr/share/qemu/ovmf-x86_64.bin -drive if=virtio,media=disk,file=output.raw
```

### Use the Image in AWS

To consume the image, copy it into an s3 bucket:

```bash
aws s3 cp <cos-raw-image> s3://<your_s3_bucket>
```

Create a `container.json` file referring to it:

```json
{
"Description": "Kairos custom image",
"Format": "raw",
"UserBucket": {
  "S3Bucket": "<your_s3_bucket>",
  "S3Key": "<cos-raw-image>"
}
}
```

Import the image:

```bash
aws ec2 import-snapshot --description "Kairos custom image" --disk-container file://container.json
```

Follow the procedure described in [AWS docs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html#creating-launching-ami-from-snapshot) to register an AMI from snapshot. Use all default settings except for the firmware, set to force to UEFI boot.

Since release v3.3.0, Kairos release pipeline is pushing a public image to AWS, which you can use. Read how to deploy Kairos using an AMI (the released or a custom one), in the [relevant page](/docs/installation/aws/).

### Use the Image in OpenStack

First get the generated image:
```bash
$ PORT=$(kubectl get svc kairos-operator-nginx -o json | jq '.spec.ports[0].nodePort')
$ curl http://<node-ip>:$PORT/hello-kairos.raw -o output.raw
```

Import the image to Glance:

```bash
osp image create hello-kairos-image --property hw_firmware_type='uefi' --file ./hello-kairos.raw
```

Image could be used to create an OpenStack instance.

Set the property to force to UEFI boot. If not kairos won't be able to start and you could be prompted endlessly by :

```bash
Booting from hard drive...
```

## Build a Cloud Image for Azure

Similarly we can build images for Azure, consider:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: hello-kairos
spec:
  imageName: "{{<oci variant="core">}}"
  azureImage: true
  ...
```

Will generate a compressed disk `hello-kairos-azure.vhd` ready to be used in Azure.

```bash
$ PORT=$(kubectl get svc kairos-operator-nginx -o json | jq '.spec.ports[0].nodePort')
$ curl http://<node-ip>:$PORT/hello-kairos-azure.vhd -o output.vhd
```

### How to use the image in Azure

Upload the Azure Cloud VHD disk in  `.vhda`  format to your bucket:

```bash
az storage copy --source <cos-azure-image> --destination https://<account>.blob.core.windows.net/<container>/<destination-azure-image>
```

Import the disk:

```bash
az image create --resource-group <resource-group> --source https://<account>.blob.core.windows.net/<container>/<destination-azure-image> --os-type linux --hyper-v-generation v2 --name <image-name>
```

Note:  There is currently no way of altering the boot disk of an Azure VM via GUI, use the `az` to launch the VM with an expanded OS disk if needed

## Build a Cloud Image for GCE

Similarly we can build images for GCE, consider:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: hello-kairos
spec:
  imageName: "{{<oci variant="core">}}"
  gceImage: true
  ...
```

Will generate a compressed disk `hello-kairos.gce.raw.tar.gz` ready to be used in GCE.

```bash
$ PORT=$(kubectl get svc kairos-operator-nginx -o json | jq '.spec.ports[0].nodePort')
$ curl http://<node-ip>:$PORT/hello-kairos.gce.raw.tar.gz -o output.gce.raw.tar.gz
```

### How to use the image in GCE

To upload the image in GCE (compressed):

```bash
gsutil cp <cos-gce-image> gs://<your_bucket>/
```

Import the disk:

```bash
gcloud compute images create <new_image_name> --source-uri=<your_bucket>/<cos-gce-image> --guest-os-features=UEFI_COMPATIBLE
```

See [here how to use a cloud-init with Google cloud](https://cloud.google.com/container-optimized-os/docs/how-to/create-configure-instance#using_cloud-init_with_the_cloud_config_format).

## Building from Dockerfiles

You can also build from a Dockerfile stored in a Kubernetes Secret:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: custom-build
  namespace: default
spec:
  baseImageDockerfile:
    name: my-dockerfile-secret
    key: Dockerfile  # Optional: defaults to "Dockerfile"
  iso: true
```

### Dockerfile Templating

When building from a Dockerfile (via `baseImageDockerfile`), you can use Go template syntax in the Dockerfile. This lets you parameterize your builds — for example, changing the base image or injecting version strings — without maintaining multiple Dockerfiles.

Template variables use the standard Go template syntax `{{ .VariableName }}`. Values can be provided in two ways, and both can be used together:

1. **Inline values** (`dockerfileTemplateValues`) — a map of key-value pairs defined directly in the OSArtifact spec.
2. **Secret reference** (`dockerfileTemplateValuesFrom`) — a reference to a Kubernetes Secret whose data entries are used as template values.

When both are set, inline values take precedence on key conflicts.

#### Example Dockerfile with template variables

Create a Secret containing a Dockerfile that uses template variables:

```bash
kubectl create secret generic my-dockerfile --from-file=Dockerfile
```

Where `Dockerfile` contains:

```dockerfile
FROM {{ .BaseImage }}

RUN zypper install -y {{ .ExtraPackages }}
RUN echo "Version: {{ .Version }}" > /etc/build-info
```

#### Inline template values

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: custom-build
  namespace: default
spec:
  baseImageDockerfile:
    name: my-dockerfile
    key: Dockerfile
  dockerfileTemplateValues:
    BaseImage: "opensuse/leap:15.6"
    ExtraPackages: "vim curl"
    Version: "1.0.0"
  iso: true
```

#### Template values from a Secret

First, create a Secret with the template values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerfile-values
  namespace: default
stringData:
  BaseImage: "opensuse/leap:15.6"
  ExtraPackages: "vim curl"
  Version: "1.0.0"
```

Then reference it in the OSArtifact:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: custom-build
  namespace: default
spec:
  baseImageDockerfile:
    name: my-dockerfile
    key: Dockerfile
  dockerfileTemplateValuesFrom:
    name: dockerfile-values
  iso: true
```

#### Combining both sources

You can use a Secret for base values and override specific ones inline:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: custom-build
  namespace: default
spec:
  baseImageDockerfile:
    name: my-dockerfile
    key: Dockerfile
  dockerfileTemplateValuesFrom:
    name: dockerfile-values
  dockerfileTemplateValues:
    Version: "2.0.0"  # overrides the value from the Secret
  iso: true
```

#### Template restrictions

Only simple value substitution and basic control flow (`if`/`else`/`range`/`with`) are supported. The `define`, `template`, and `block` directives are explicitly forbidden and will cause the build to fail. Any template variable that is not provided will render as an empty string.

## Monitoring Build Status

The OSArtifact resource tracks the build status through the `status.phase` field:

- `Pending`: The artifact is queued for building
- `Building`: The build is in progress
- `Exporting`: The artifact is being exported (if exporters are configured)
- `Ready`: The artifact build completed successfully
- `Error`: The build failed

You can check the status with:

```bash
kubectl get osartifact my-kairos-iso
kubectl describe osartifact my-kairos-iso
```

## Accessing Built Artifacts

Built artifacts are stored in a PersistentVolumeClaim (PVC) that is automatically created. You can access them through:

1. **Export Jobs**: Configure `exporters` in the spec to run custom jobs that can copy, upload, or process the artifacts
2. **Direct PVC Access**: The PVC is labeled with `build.kairos.io/artifact=<artifact-name>` and can be mounted by other pods

## Serving Artifacts with Nginx

The operator includes a ready-to-use nginx kustomization that deploys an nginx server with WebDAV upload support. This lets OSArtifact exporters upload built artifacts via HTTP PUT and then serve them for download.

Deploy it with:

```bash
# Deploy in the same namespace as your OSArtifact resources
kubectl apply -k https://github.com/kairos-io/kairos-operator/config/nginx -n default
```

This creates:
- An **nginx Deployment** with a PersistentVolumeClaim for artifact storage
- A **ConfigMap** with an nginx configuration that enables WebDAV PUT and directory listing
- A **NodePort Service** (`kairos-operator-nginx`) to expose the server
- A **Role** (`artifactCopier`) with permissions to list pods and exec into them

Once deployed, configure your OSArtifact exporter to upload artifacts to the nginx service:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: my-kairos-iso
  namespace: default
spec:
  imageName: quay.io/kairos/opensuse:leap-15.6-core-amd64-generic-v3.6.0
  iso: true
  exporters:
  - template:
      spec:
        restartPolicy: Never
        containers:
        - name: upload-to-nginx
          image: curlimages/curl
          command: ["sh", "-ec"]
          args:
          - |
            NGINX_URL="${NGINX_URL:-http://kairos-operator-nginx}"
            for f in /artifacts/*; do
              [ -f "$f" ] || continue
              base=$(basename "$f")
              echo "Uploading $base to $NGINX_URL/$base"
              curl -fsSL -T "$f" "$NGINX_URL/$base" || exit 1
            done
            echo "Upload done"
          env:
          - name: NGINX_URL
            value: "http://kairos-operator-nginx"
          volumeMounts:
          - name: artifacts
            readOnly: true
            mountPath: /artifacts
```

If the nginx service is deployed in a different namespace than the OSArtifact, set the `NGINX_URL` environment variable to `http://kairos-operator-nginx.<namespace>.svc.cluster.local`.

## Advanced Configuration

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: advanced-build
  namespace: default
spec:
  imageName: quay.io/kairos/opensuse:leap-15.6-core-amd64-generic-v3.6.0

  # Build multiple formats
  iso: true
  cloudImage: true
  azureImage: true

  # Custom cloud config
  cloudConfigRef:
    name: cloud-config-secret
    key: cloud-config.yaml

  # Custom GRUB configuration
  grubConfig: |
    set timeout=5
    set default=0

  # OS release information
  osRelease: "opensuse-leap-15.6"
  kairosRelease: "v3.6.0"

  # Additional bundles to include
  bundles:
  - docker
  - k3s

  # Image pull secrets for private registries
  imagePullSecrets:
  - name: private-registry-secret

  # Custom volume configuration
  volume:
    accessModes:
    - ReadWriteOnce
    resources:
      requests:
        storage: 50Gi
```
