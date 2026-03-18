---
title: "OSArtifact"
linkTitle: "OSArtifact"
weight: 4
date: 2025-07-25
description: Build OS artifacts (ISOs, cloud images, netboot, UKI) from container images using the two-stage OSArtifact API
---

The `OSArtifact` custom resource lets you build Linux distribution artifacts (ISO images, cloud images, netboot, UKI signed artifacts) from container images directly in Kubernetes. The API is organized in **two stages**: **Stage 1** defines how to obtain the OCI image (pre-built or built from options or a custom OCI spec); **Stage 2** defines which artifacts to produce from that image (ISO, cloud image, etc.).

:::tip Terminology: OCI spec vs Dockerfile
This documentation uses **OCI spec** (or **OCI build definition**) to mean the instructions that describe how to build a container image — the same concept that is often called a **Dockerfile** elsewhere. We use vendor-neutral wording; the format and behavior are the same as the Dockerfile format you may already know (e.g. `FROM`, `RUN`, `COPY`). When the spec says "store your OCI spec in a Secret," you can put a Dockerfile-format file there (commonly with key `Dockerfile`).
:::

:::info Note
For a complete guide on creating custom cloud images and when to use these build methods, see [Creating Custom Cloud Images](/docs/advanced/creating_custom_cloud_images/).
:::

## Prerequisites

- A Kubernetes cluster with `kubectl` (and optionally `helm`) installed. [kind](https://github.com/kubernetes-sigs/kind) works as well.
- The [Kairos operator](../installation) installed on the cluster.

### Creating the Secrets

Several examples below reference Secrets (OCI spec, image credentials, cloud-config). Here is what those Secrets must look like.

**Image credentials** (`spec.image.imageCredentialsSecretRef`): used for both **pull** and **push** of container images. The Secret must be of type `kubernetes.io/dockerconfigjson` and contain the key `.dockerconfigjson` with a JSON object. The `auth` field is the base64-encoding of `username:password` for the registry. See [Image credentials: when they are used](#image-credentials-when-they-are-used) for all use cases.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: default
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "my-registry.example.com": {
          "username": "myuser",
          "password": "mypassword",
          "auth": "bXl1c2VyOm15cGFzc3dvcmQ="
        }
      }
    }
```

Replace `my-registry.example.com`, `myuser`, and `mypassword` with your registry host, username, and password. The `auth` value is `echo -n 'myuser:mypassword' | base64 -w0`. You can also create this Secret with:

```bash
kubectl create secret docker-registry registry-credentials \
  --docker-server=my-registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  -n default
```

**OCI spec** (`spec.image.ociSpec.ref`): when you build from your own OCI spec, store it in a Secret of type `Opaque`. Use one key (e.g. `ociSpec` or `Dockerfile`) whose value is the full OCI spec content (the instructions that define how to build the image). The `spec.image.ociSpec.ref.key` in the OSArtifact must match that key name.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-ocispec
  namespace: default
type: Opaque
stringData:
  ociSpec: |
    FROM quay.io/kairos/kairos-init:v0.7.0 AS kairos-init
    FROM opensuse/leap:15.6
    ARG MODEL=generic
    ARG VERSION=v3.6.0
    COPY --from=kairos-init /kairos-init /kairos-init
    RUN /kairos-init -l debug -s install -m "${MODEL}" --version "${VERSION}" && \
        /kairos-init -l debug -s init -m "${MODEL}" --version "${VERSION}" && \
        rm -f /kairos-init
```

In the OSArtifact, reference it with `ociSpec.ref.name: my-ocispec` and `ociSpec.ref.key: ociSpec`. You can use `Dockerfile` as the key instead; just set `ref.key` to match.

**Cloud config** (`artifacts.cloudConfigRef`): create a Secret with key `userdata` (or another key you reference) containing your cloud-init YAML (e.g. `#cloud-config` and users, install options).

#### Image credentials: when they are used

The same credentials Secret (`spec.image.imageCredentialsSecretRef`) is used in different places depending on how you obtain the Stage 1 image:

| Use case | Where credentials are used | Why |
|----------|----------------------------|-----|
| **Pulling the tool image** (AuroraBoot, Kaniko, etc.) from a private registry | Pod-level **ImagePullSecrets** | The Kubernetes kubelet uses `spec.imagePullSecrets` to pull the builder pod’s container images. When `imageCredentialsSecretRef` is set, the operator also adds that secret to the pod’s ImagePullSecrets so the same credentials can pull the tool image if it lives in your private registry. |
| **Pulling a pre-built image** (`spec.image.ref`) from a private registry | Unpack container (AuroraBoot) | When using a pre-built image, the operator runs an init container that uses AuroraBoot to unpack `image.ref`. AuroraBoot uses go-containerregistry’s default keychain, which reads from `DOCKER_CONFIG`. The operator mounts the credentials at `/root/.docker` and sets `DOCKER_CONFIG` so the unpack container can pull private `image.ref`. |
| **Pulling the base image** when building with **buildOptions** | Kaniko build container | The operator injects `FROM buildOptions.baseImage`; Kaniko must pull that image. The operator mounts the credentials in the Kaniko container and sets `DOCKER_CONFIG` so Kaniko can pull from private registries. |
| **Pulling the `FROM` image** when building with **ociSpec** | Kaniko build container | Your OCI spec’s first line is typically `FROM <some-image>`. Kaniko must pull that image. The same mount and `DOCKER_CONFIG` in the Kaniko container allow pulls from private registries. |
| **Pushing the built image** when `spec.image.push: true` | Kaniko build container | When you enable push, Kaniko pushes the built image to the registry. The same credentials mount is used for push. |

You can also set **`spec.imagePullSecrets`** (a list of Secret names) if you need additional pull secrets only for the pod’s container images (e.g. a different registry for the tool image). For pulling `image.ref`, the FROM/base image, and for push, use **`spec.image.imageCredentialsSecretRef`**.

---

## Two-stage model

| Stage | Spec | Purpose |
|-------|------|---------|
| **Stage 1** | `spec.image` | How to obtain the OCI image: use a pre-built ref, build with options (default OCI spec), or build with your own OCI spec. Optionally push the built image to a registry. |
| **Stage 2** | `spec.artifacts` | Which artifacts to produce from the Stage 1 image: ISO, cloud image, netboot, Azure/GCE images, UKI signed outputs. Optional; if omitted or all disabled, only Stage 1 runs (build + optional push). |

### Choosing how to build (decision tree)

1. **Already have a Kairos image?** → Set `spec.image.ref` to the image reference. No build; Stage 2 uses that image. Use this when you build the Kairos image through other means (e.g. using [AuroraBoot](https://github.com/kairos-io/AuroraBoot) directly) or when consuming the upstream released Kairos images.
2. **Build with options only (no custom OCI spec)?** → Set `spec.image.buildOptions` (e.g. `version`, `baseImage`, `model`, `kubernetesDistro`). The operator uses its default OCI build definition and injects `kairos-init`. Version is required. Use this method when you want to define the base image and some parameters but you don't need any additional control.
3. **Full control (your OCI spec including FROM and kairos-init)?** → Set `spec.image.ociSpec.ref` to a Secret holding your OCI build definition. The operator does not modify it. Use this method when you want full control, for example when you want to perform some action between the kairos-init installation and init stages.
4. **Your OCI spec fragment + operator adds base image and kairos-init?** → Set both `spec.image.ociSpec` (template, no `FROM`) and `spec.image.buildOptions`. The operator injects `FROM buildOptions.baseImage` at the top and the kairos-init block at the bottom. Use this method when you want to add steps to the used ociSpec (e.g. install or remove packages, enable services etc) but you don't need to intercept the "kairosification" steps.
5. **Push the built image to a registry?** → When building, set `spec.image.push: true` and `spec.image.imageCredentialsSecretRef` (and optionally `spec.image.buildImage` for registry/repository/tag).
6. **Build behind a proxy or use a custom CA for the registry?** → When building, set `spec.image.buildEnv` (e.g. `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`) and/or `spec.image.caCertificatesVolume` (volume with CA certs). See [Build environment and CA certificates (Kaniko)](#build-environment-and-ca-certificates-kaniko).

---

## Stage 1: Image source

### Pre-built image (`image.ref`)

When `spec.image.ref` is set, the operator does not build; it uses the given image for Stage 2. `buildOptions` and `ociSpec` are ignored.

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: from-prebuilt-image
  namespace: default
spec:
  image:
    ref: quay.io/kairos-io/kairos:v3.6.0

  artifacts:
    arch: amd64
    iso: true
    cloudImage: true
    cloudConfigRef:
      name: cloud-config
      key: userdata

  exporters: []
```

Create a `cloud-config` Secret with key `userdata` containing your cloud-init config (e.g. users, install options). Then apply the manifest.

### Build with options only (default OCI spec)

When you want a “kairosified” image without writing a OCI spec, use `spec.image.buildOptions`. The operator uses an embedded default OCI build definition and injects `kairos-init` with the options you supply. **Version is required.**

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: standard-kairos-build
  namespace: default
spec:
  image:
    buildOptions:
      version: v3.6.0
      baseImage: ubuntu:24.04
      model: generic
      kubernetesDistro: k3s
      kubernetesVersion: "v1.35.1+k3s1"
    buildImage:
      registry: my-registry.example.com
      repository: my-ns/standard-kairos
      tag: v3.6.0
    push: true
    imageCredentialsSecretRef:
      name: registry-credentials

  artifacts:
    arch: amd64
    iso: true
    cloudImage: true
    cloudConfigRef:
      name: cloud-config
      key: userdata

  exporters: []
```

- **baseImage**: Base image for the build (e.g. `ubuntu:24.04` or a non-kairosified image like `ghcr.io/kairos-io/hadron:v0.0.4`). When set, the operator injects `FROM baseImage` at the top.
- **model**: Hardware/platform target passed to `kairos-init` (`-m`). Determines device-specific boot and kernel configuration. Use **`generic`** for x86_64/AMD64 or generic ARM; use **`rpi3`** or **`rpi4`** when building images that will boot on Raspberry Pi 3 or 4. If you omit this or use `generic` for a Raspberry Pi, the image may not boot. See [Kairos Factory](/docs/reference/kairos-factory/) for the full flag reference.
- **buildImage**: Registry, repository, and tag for the built image (useful for tools that bump tags).
- **push** and **imageCredentialsSecretRef**: Push the built image to a registry; the Secret must contain `.dockerconfigjson` for the registry. The same secret is also used to pull the base image (see [Image credentials: when they are used](#image-credentials-when-they-are-used)).

### Kairosify a custom base image

Same as above, but use a custom base (e.g. Hadron) and optionally disable push or some artifacts:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: kairosify-custom-base
  namespace: default
spec:
  image:
    buildOptions:
      version: v1.0.0
      baseImage: ghcr.io/kairos-io/hadron:v0.0.4
      model: generic
      kubernetesDistro: k0s
      kubernetesVersion: "v1.35.1+k0s.0"
    buildImage:
      registry: quay.io
      repository: kairos/hadron
      tag: v1.0.0
    push: false

  artifacts:
    arch: amd64
    iso: true
    cloudConfigRef:
      name: cloud-config
      key: userdata

  exporters: []
```

### Building for Raspberry Pi

When the target device is a Raspberry Pi 3 or 4, set **`spec.image.buildOptions.model`** to `rpi3` or `rpi4` and **`spec.artifacts.arch`** to `arm64`. With a custom OCI spec, pass the same model to `kairos-init` (e.g. `ARG MODEL=rpi4` and `-m "${MODEL}"` in your Dockerfile).

```yaml
spec:
  image:
    buildOptions:
      version: v3.6.0
      baseImage: ubuntu:24.04
      model: rpi4
      kubernetesDistro: k3s
      kubernetesVersion: "v1.35.1+k3s1"
  artifacts:
    arch: arm64
    iso: true
    cloudImage: true
    # ... cloudConfigRef, exporters, etc.
```

### Build with your own OCI spec (full control)

For full control, store your OCI spec (build definition) in a Secret and reference it with `spec.image.ociSpec.ref`. Your definition must include the base image (`FROM`) and any kairos-init logic; the operator does not modify it. When building for Raspberry Pi, pass the correct **model** to `kairos-init` (e.g. `-m rpi4` or `ARG MODEL=rpi4` and `-m "${MODEL}"`); see [model](#build-with-options-only-default-oci-spec) above.

```yaml
---
kind: Secret
apiVersion: v1
metadata:
  name: my-ocispec
  namespace: default
type: Opaque
stringData:
  Dockerfile: |
    FROM quay.io/kairos/kairos-init:v0.7.0 AS kairos-init
    FROM opensuse/leap:15.6
    ARG MODEL=generic
    ARG VERSION=v3.6.0
    COPY --from=kairos-init /kairos-init /kairos-init
    RUN /kairos-init -l debug -s install -m "${MODEL}" --version "${VERSION}" && \
        /kairos-init -l debug -s init -m "${MODEL}" --version "${VERSION}" && \
        rm -f /kairos-init
---
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: full-control-ocispec
  namespace: default
spec:
  image:
    ociSpec:
      ref:
        name: my-ocispec
        key: Dockerfile
    buildImage:
      registry: my-registry.example.com
      repository: my-ns/full-control-kairos
      tag: latest
    push: true
    imageCredentialsSecretRef:
      name: registry-credentials

  artifacts:
    arch: amd64
    iso: true
    cloudConfigRef:
      name: cloud-config
      key: userdata

  exporters: []
```

#### Templating the OCI spec

You can render the OCI spec with variables using `ociSpec.templateValuesFrom` (Secret) and/or `ociSpec.templateValues` (inline). Use standard Go template syntax (e.g. `{{ .VariableName }}`). Values are applied when the operator renders the build definition before the build.

**Example: inline values**

```yaml
---
kind: Secret
apiVersion: v1
metadata:
  name: my-ocispec-templated
  namespace: default
type: Opaque
stringData:
  ociSpec: |
    FROM {{ .BaseImage }}
    ARG VERSION={{ .Version }}
    RUN echo "Built from {{ .BaseImage }} at {{ .Version }}" > /etc/build-info
---
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: templated-build
  namespace: default
spec:
  image:
    ociSpec:
      ref:
        name: my-ocispec-templated
        key: ociSpec
      templateValues:
        BaseImage: "ubuntu:22.04"
        Version: "v1.0.0"
    buildImage:
      registry: my-registry.example.com
      repository: my-ns/templated
      tag: latest
  artifacts:
    arch: amd64
    iso: true
```

You can use a Secret for values instead: set `templateValuesFrom.name` to the Secret name; the operator uses all keys in that Secret as template values. Inline `templateValues` take precedence over the Secret on key conflict. Missing keys render as empty strings.

**Restrictions:** Only value substitution and basic control flow (`if`/`else`, `range`, `with`) are supported. The directives **`define`**, **`template`**, and **`block`** are not allowed and will cause the build to fail. This keeps templates predictable and avoids nesting that is not useful in OCI build definitions.

For a larger example that combines templating with BuildOptions and a build context, see [OCISpec + BuildOptions (templated OCI spec + kairos-init)](#ocispec--buildoptions-templated-oci-spec--kairos-init).

### OCI-only build (no artifacts)

When you only want to build and optionally push the OCI image (no ISO or cloud image), omit `spec.artifacts` or leave all artifact types disabled. Only Stage 1 runs.

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: oci-only-build
  namespace: default
spec:
  image:
    buildOptions:
      version: v3.6.0
      baseImage: ubuntu:24.04
      model: generic
      kubernetesDistro: k3s
      kubernetesVersion: "v1.35.1+k3s1"
    buildImage:
      registry: my-registry.example.com
      repository: my-ns/kairos-oci
      tag: v3.6.0
    push: true
    imageCredentialsSecretRef:
      name: registry-credentials

  # No artifacts: only build and push the OCI image.
```

### Build environment and CA certificates (Kaniko)

When building (with `buildOptions` or `ociSpec`), the operator runs Kaniko to build the Stage 1 image. You can pass environment variables and custom CA certificates to the Kaniko container.

**`spec.image.buildEnv`** — Environment variables for the Kaniko build container. Use this for:

- **Proxy settings**: Set `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` when the cluster uses an HTTP proxy to reach the internet. Kaniko (and any `RUN` steps that use the network) will use these. Exclude registries and in-cluster hosts in `NO_PROXY` so image pull/push still works (e.g. `NO_PROXY=localhost,127.0.0.1,.cluster.local,.svc,quay.io`).
- **Any other build-time env**: Any standard Kubernetes EnvVar entry is supported (either with `name` and `value`, or with `name` and `valueFrom` for ConfigMap or Secret references).

Only used when building (Stage 1); ignored when `spec.image.ref` is set (pre-built image).

**`spec.image.caCertificatesVolume`** — Name of a volume (from `spec.volumes`) that contains custom CA certificates. The operator mounts this volume at `/kaniko/ssl/certs` in the Kaniko container (read-only). Use it when pulling or pushing images from a registry that uses a private or corporate CA (e.g. TLS for private registries). Only used when building; ignored when using a pre-built image. The volume must exist in `spec.volumes` (e.g. a Secret with `ca.crt` or a ConfigMap with PEM files).

Example: build behind a proxy with custom CA for the registry.

Create a Secret that contains your registry’s CA certificate(s) (PEM format). Use any key name; the whole Secret is mounted as a directory at `/kaniko/ssl/certs`, so Kaniko will use all PEM files it finds there:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-ca-secret
  namespace: default
type: Opaque
stringData:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAKL0UG+mRKQbMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
    BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
    aWRnaXRzIFB0eSBMdGQwHhcNMjAwMTAxMDAwMDAwWhcNMzAwMTIzMTIzNTk1WjBF
    MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
    ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
    CgKCAQEA0... (your registry CA PEM)
    -----END CERTIFICATE-----
```

Then reference it in the OSArtifact:

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: build-with-proxy-and-ca
  namespace: default
spec:
  image:
    buildOptions:
      version: v3.6.0
      baseImage: ubuntu:24.04
      model: generic
    buildEnv:
      - name: HTTP_PROXY
        value: "http://proxy.example.com:3128"
      - name: HTTPS_PROXY
        value: "http://proxy.example.com:3128"
      - name: NO_PROXY
        value: "localhost,127.0.0.1,.cluster.local,.svc,my-registry.example.com"
    caCertificatesVolume: my-ca-certs
  volumes:
    - name: my-ca-certs
      secret:
        secretName: registry-ca-secret
  artifacts:
    iso: true
```

---

## Stage 2: Artifacts

All artifact options live under `spec.artifacts`. Common fields:

- **arch**: `amd64` or `arm64`
- **iso**: Produce a hybrid bootable ISO (UEFI/MBR).
- **cloudImage**: Produce a raw disk image (e.g. for QEMU and AWS).
- **azureImage**, **gceImage**: Produce Azure VHD or GCE disk images.
- **netboot**, **netbootURL**: Netboot artifacts.
- **cloudConfigRef**: Secret reference for cloud-init userdata (key typically `userdata`).
- **diskSize**: Disk size for cloud images (e.g. `32000` for 32GB).
- **grubConfig**, **bundles**, **osRelease**, **kairosRelease**: Additional AuroraBoot options. **bundles** is a list of OCI image references; each image is unpacked onto the rootfs (e.g. add-ons like Helm or k9s). Valid bundles are published in the [Kairos packages repository](https://packages.kairos.io/Kairos/) and as container images at `quay.io/kairos/packages` with tags like `helm-utils-4.1.1`, `k9s-utils-0.50.18` (use full refs, e.g. `quay.io/kairos/packages:helm-utils-4.1.1`).

Example: ISO + cloud image with cloud-config:

```yaml
spec:
  image:
    ref: quay.io/kairos-io/kairos:v3.6.0
  artifacts:
    arch: amd64
    iso: true
    cloudImage: true
    cloudConfigRef:
      name: cloud-config
      key: userdata
```

### Overlay volumes (scoped under artifacts)

To inject files into the ISO or the OS rootfs, use **volumes** and **importers**, then reference the volume names under `spec.artifacts`. The operator passes these to [AuroraBoot](https://github.com/kairos-io/AuroraBoot) when building the ISO:

- **overlayISOVolume**: Volume name for `--overlay-iso` (files appear at `/run/initramfs/live` during live boot).
- **overlayRootfsVolume**: Volume name for `--overlay-rootfs` (files are merged into the OS rootfs/squashfs).

Define volumes in `spec.volumes` and populate them with `spec.importers` (init containers). Then set `artifacts.overlayISOVolume` and/or `artifacts.overlayRootfsVolume` to those volume names.

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: importers-scoped-bindings
  namespace: default
spec:
  image:
    ref: quay.io/kairos/hadron:v0.0.1-core-amd64-generic-v3.7.2

  volumes:
    - name: iso-overlay
      emptyDir: {}
    - name: rootfs-overlay
      emptyDir: {}

  importers:
    - name: populate-iso-overlay
      image: busybox:latest
      command: ["/bin/sh", "-c"]
      args:
        - |
          echo "On ISO root (live)." > /overlay/README-ISO.txt
      volumeMounts:
        - name: iso-overlay
          mountPath: /overlay
    - name: populate-rootfs-overlay
      image: busybox:latest
      command: ["/bin/sh", "-c"]
      args:
        - |
          mkdir -p /overlay/etc
          echo "Baked into OS rootfs." > /overlay/etc/README-ROOTFS.txt
      volumeMounts:
        - name: rootfs-overlay
          mountPath: /overlay

  artifacts:
    arch: amd64
    iso: true
    overlayISOVolume: iso-overlay
    overlayRootfsVolume: rootfs-overlay
```

### UKI (signed) artifacts

To build signed UKI artifacts (Secure Boot, TPM), use `spec.artifacts.uki` with a volume that holds the signing keys. When any of `uki.iso`, `uki.container`, or `uki.efi` is true, **keysVolume** is required (validation).

The keys volume must contain (e.g. from `auroraboot genkey <name> -o keys/`): `PK.auth`, `KEK.auth`, `db.auth`, `db.key`, `db.pem`, `tpm2-pcr-private.pem`. Use a volume (e.g. `emptyDir`) and an importer to generate or copy the keys.

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: uki-keys-volume
  namespace: default
spec:
  image:
    ref: quay.io/kairos/hadron:v0.0.1-core-amd64-generic-v3.7.2

  volumes:
    - name: uki-keys
      emptyDir: {}

  importers:
    - name: generate-uki-keys
      image: quay.io/kairos/auroraboot:latest
      command: ["/bin/sh", "-c"]
      args:
        - auroraboot genkey my-uki -o /keys
      volumeMounts:
        - name: uki-keys
          mountPath: /keys

  artifacts:
    arch: amd64
    uki:
      iso: true
      # container: true   # signed UKI OCI image
      # efi: true        # raw .efi files
      keysVolume: uki-keys
```

UKI outputs use distinct names (e.g. `<artifact-name>-uki.iso`) so they do not collide with unsigned artifacts.

---

## Build context volume (OCISpec)

When building from a custom OCI spec which uses `COPY` from the build context, set **spec.image.ociSpec.buildContextVolume** to a volume name from `spec.volumes`. Importers can populate that volume; Kaniko will see it at `/workspace`.

```yaml
---
kind: Secret
apiVersion: v1
metadata:
  name: my-ocispec-with-context
  namespace: default
type: Opaque
stringData:
  Dockerfile: |
    FROM quay.io/kairos/kairos-init:v0.7.0 AS kairos-init
    FROM opensuse/leap:15.6
    ARG MODEL=generic
    ARG VERSION=v3.6.0
    COPY --from=kairos-init /kairos-init /kairos-init
    COPY build-info.txt /etc/kairos-build-info.txt
    RUN /kairos-init -l debug -s install -m "${MODEL}" --version "${VERSION}" && \
        /kairos-init -l debug -s init -m "${MODEL}" --version "${VERSION}" && \
        rm -f /kairos-init
---
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: ocispec-build-context-volume
  namespace: default
spec:
  image:
    ociSpec:
      ref:
        name: my-ocispec-with-context
        key: Dockerfile
      buildContextVolume: build-context

  volumes:
    - name: build-context
      emptyDir: {}

  importers:
    - name: populate-build-context
      image: busybox:latest
      command: ["/bin/sh", "-c"]
      args:
        - 'echo "Built with importers at $(date)" > /ctx/build-info.txt'
      volumeMounts:
        - name: build-context
          mountPath: /ctx

  artifacts:
    arch: amd64
    iso: true
```

---

## OCISpec + BuildOptions (templated OCI spec + kairos-init)

When both `spec.image.ociSpec` and `spec.image.buildOptions` are set, the operator injects:

- At the **top**: `FROM buildOptions.baseImage` (when baseImage is set).
- At the **bottom**: the kairos-init block; BuildOptions supply its arguments.

Your OCI spec (e.g. a template) must **not** add its own `FROM`; it can be built from multiple named fragments that you define (for example, one fragment from a shared or generated source and one from the user). Use **templateValuesFrom** and/or **templateValues** to fill the template, and **buildContextVolume** if the OCI spec uses `COPY` from the context.

The example below uses two template variables, `Part1` and `Part2`, to illustrate the idea—you can use any variable names and any number of fragments.

```yaml
---
kind: Secret
apiVersion: v1
metadata:
  name: dockerfile-template-concat
  namespace: default
type: Opaque
stringData:
  Dockerfile: |
    {{ .Part1 }}
    {{ .Part2 }}
---
kind: Secret
apiVersion: v1
metadata:
  name: dockerfile-fragments
  namespace: default
type: Opaque
stringData:
  Part1: |
    RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
    COPY extra-bundle.txt /etc/extra-bundle.txt
  Part2: |
    RUN apt-get update && apt-get install -y --no-install-recommends curl jq && rm -rf /var/lib/apt/lists/*
---
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: template-fragments-kairosify
  namespace: default
spec:
  image:
    ociSpec:
      ref:
        name: dockerfile-template-concat
        key: Dockerfile
      templateValuesFrom:
        name: dockerfile-fragments
      buildContextVolume: build-context
    buildOptions:
      baseImage: ubuntu:24.04
      version: v3.6.0
      model: generic
      kubernetesDistro: k3s
      kubernetesVersion: "v1.35.1+k3s1"
    buildImage:
      registry: my-registry.example.com
      repository: my-ns/template-fragments-kairos
      tag: v3.6.0
    push: true
    imageCredentialsSecretRef:
      name: registry-credentials

  volumes:
    - name: build-context
      emptyDir: {}

  importers:
    - name: populate-build-context
      image: busybox:latest
      command: ["/bin/sh", "-c"]
      args:
        - 'echo "Extra packages and files" > /ctx/extra-bundle.txt'
      volumeMounts:
        - name: build-context
          mountPath: /ctx

  artifacts:
    arch: amd64
    iso: true
    cloudConfigRef:
      name: cloud-config
      key: userdata

  exporters: []
```

---

## Netboot artifacts

Enable netboot under `spec.artifacts`:

```yaml
spec:
  image:
    ref: quay.io/kairos-io/kairos:v3.6.0
  artifacts:
    arch: amd64
    netboot: true
    netbootURL: https://...
    cloudConfigRef:
      name: cloud-config
      key: userdata
  exporters: []
```

---

## Cloud images (raw, Azure, GCE)

Output file names are derived from the OSArtifact **resource name** (`metadata.name`). For example, an OSArtifact named `my-hadron-cloud` produces `my-hadron-cloud.raw`, `my-hadron-cloud-azure.vhd`, and `my-hadron-cloud.gce.raw.tar.gz`.

- **Cloud image (raw)**: Set `artifacts.cloudImage: true`. Produces a raw disk (e.g. `<name>.raw`) bootable in QEMU and suitable for AWS. Use `artifacts.diskSize` (e.g. `32000` for 32GB) if needed.
- **Azure**: Set `artifacts.azureImage: true`. Produces `<name>-azure.vhd`.
- **GCE**: Set `artifacts.gceImage: true`. Produces `<name>.gce.raw.tar.gz`.

Example (raw + cloud-config):

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: my-hadron-cloud
  namespace: default
spec:
  image:
    ref: quay.io/kairos/hadron:v0.0.3-core-amd64-generic-v4.0.0
  artifacts:
    arch: amd64
    cloudImage: true
    diskSize: "32000"
    cloudConfigRef:
      name: cloud-config
      key: userdata
```

:::info Note
The cloud image boots into recovery mode on first boot and partitions the disk. Your cloud-config can contain users and other config; see [configuration reference](/docs/reference/configuration/).
:::

### Using the raw image (QEMU, AWS, OpenStack)

- **QEMU**: Resize if needed (`truncate -s "+$((32000*1024*1024))" my-hadron-cloud.raw`), then run with EFI:
  `qemu-system-x86_64 -m 2048 -bios /usr/share/qemu/ovmf-x86_64.bin -drive if=virtio,media=disk,file=my-hadron-cloud.raw`
- **AWS**: Upload to S3, use `aws ec2 import-snapshot` and register an AMI; set firmware to UEFI. See [AWS docs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html#creating-launching-ami-from-snapshot) and [Kairos on AWS](/docs/installation/aws/).
- **OpenStack**: `osp image create my-hadron-cloud-image --property hw_firmware_type='uefi' --file ./my-hadron-cloud.raw`
- **Azure**: Upload VHD to blob storage, then `az image create --source ... --hyper-v-generation v2`.
- **GCE**: `gsutil cp ... gs://<bucket>/`, then `gcloud compute images create ... --guest-os-features=UEFI_COMPATIBLE`.

---

## One-off builds: immutability and reusing manifests

An OSArtifact represents a **single build run**. Its **spec is immutable** after creation: the API server rejects any update that changes `spec`. To run another build with different options (e.g. a new image tag or artifact set), create a **new** OSArtifact rather than editing the existing one.

### Reusing the same manifest with generateName

To run the same build configuration repeatedly without editing the YAML each time, use **metadata.generateName** instead of **metadata.name**. Kubernetes will assign a unique name (e.g. `my-build-7x2k9`) when the resource is created. Use **kubectl create** (not **apply**) so each run creates a new OSArtifact:

```yaml
metadata:
  generateName: my-kairos-iso-
  namespace: default
# do not set metadata.name
```

```bash
# Each command creates a new OSArtifact with a generated name.
kubectl create -f my-osartifact.yaml
```

:::note
**kubectl apply** does not support manifests that rely only on `metadata.generateName`. Without `metadata.name`, `apply` cannot identify a stable resource to patch, so the command will fail rather than “create on first run, then update on later runs.” For repeated runs with the same manifest, continue to use **kubectl create -f** so every run creates a new OSArtifact with a fresh generated name.
:::

---

## Monitoring build status

The OSArtifact resource reports status in **status.phase** (and optionally **status.message** for failure details). The phases match the controller logic:

- **Pending**: Initial state; build not yet started (default).
- **Building**: Builder pod is running (image build and/or artifact generation).
- **Exporting**: Build pod succeeded; exporter jobs are running (if `spec.exporters` is set). If there are no exporters, this phase is brief before transitioning to Ready.
- **Ready**: Build and all exporters completed successfully.
- **Error**: Build pod failed or an exporter job failed. Check **status.message** for details.

```bash
kubectl get osartifact my-kairos-iso
kubectl describe osartifact my-kairos-iso
```

### Streaming build logs

The builder Pod is labeled **`build.kairos.io/artifact=<osartifact-name>`**. To stream logs from the build Pod (all containers, including init containers such as importers and the Kaniko build), use the label with the name of your OSArtifact:

```bash
# Replace <artifact-name> with the OSArtifact name (e.g. my-kairos-iso or a generated name like my-build-7x2k9).
kubectl logs -f -l build.kairos.io/artifact=<artifact-name> --all-containers
```

If you used **generateName**, get the actual name from **`kubectl get osartifacts -n default`**, then use it in the label selector above. Exporter Jobs and their Pods are also labeled **`build.kairos.io/artifact=<artifact-name>`**, so the same selector can be used to stream or inspect exporter logs after the build Pod has finished.

---

## Accessing built artifacts

- **Exporters**: Configure `spec.exporters` to run jobs that copy, upload, or process the built artifacts (e.g. upload to nginx or S3). Each exporter is a Job template; the artifacts volume is mounted at `/artifacts`.
- **Direct PVC**: The controller creates a PersistentVolumeClaim for each OSArtifact. PVCs are namespaced: the artifacts PVC is created in the **same namespace as the OSArtifact**, named `<artifact-name>-artifacts`, and labeled `build.kairos.io/artifact=<artifact-name>`. Other pods in that namespace can mount it by name or by selecting that label.

---

## Serving artifacts with Nginx

The operator repo includes an nginx kustomization so exporters can upload artifacts (HTTP PUT) and you can download them (HTTP GET and directory listing). It lives under [config/nginx](https://github.com/kairos-io/kairos-operator/tree/main/config/nginx) in the operator repository. Nginx is configured via a ConfigMap (`nginx-upload-config`) that enables the DAV module with `dav_methods PUT`, `create_full_put_path on`, and `autoindex on` for the root location; the server root is a PersistentVolumeClaim so uploaded files persist.

Deploy it in the namespace where you run OSArtifacts (e.g. `default`):

```bash
kubectl apply -k https://github.com/kairos-io/kairos-operator/config/nginx -n default
```

This creates an nginx Deployment (backed by a PVC for storage), the ConfigMap, and a NodePort Service named `kairos-operator-nginx`. Configure an exporter to upload artifacts to that service:

```yaml
spec:
  image:
    ref: quay.io/kairos-io/kairos:v3.6.0
  artifacts:
    arch: amd64
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
                    curl -fsSL -T "$f" "$NGINX_URL/$base" || exit 1
                  done
              volumeMounts:
                - name: artifacts
                  readOnly: true
                  mountPath: /artifacts
```

Download the ISO:

```bash
PORT=$(kubectl get svc kairos-operator-nginx -o jsonpath='{.spec.ports[0].nodePort}')
curl http://<node-ip>:$PORT/my-kairos-iso.iso -o output.iso
```

If nginx is in another namespace, set `NGINX_URL` to `http://kairos-operator-nginx.<namespace>.svc.cluster.local`.

---

## Volume and importer reference

- **spec.volumes**: Standard Kubernetes volumes (emptyDir, ConfigMap, Secret, PVC, etc.) available to importers and to the build/artifact stages via the scoped bindings below.
- **spec.importers**: Init containers that run in order before the build. They can mount any `spec.volumes` volume. Use them to fetch files, generate config, or populate overlay/build-context directories.
- **Scoped bindings**:
  - **Stage 1**: `spec.image.ociSpec.buildContextVolume` — volume name for the OCI build context at `/workspace` (Kaniko). Only used when building from an OCI spec.
  - **Stage 1**: `spec.image.caCertificatesVolume` — volume name for custom CA certificates mounted at `/kaniko/ssl/certs` (Kaniko). Only used when building.
  - **Stage 2**: `spec.artifacts.overlayISOVolume`, `spec.artifacts.overlayRootfsVolume` — volume names for AuroraBoot overlay-iso and overlay-rootfs.
  - **UKI**: `spec.artifacts.uki.keysVolume` — volume name for the directory containing UKI signing keys.

:::info Note
Do not use reserved volume names: `artifacts`, `rootfs`, `config`, `dockerfile`, `cloudconfig`. The controller rejects them.
:::

---

## Advanced configuration example

Multiple artifact types, custom cloud-config, GRUB, bundles, image pull secrets, and a custom PVC size. The **volume** field is optional: it lets you override the [PersistentVolumeClaimSpec](https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/#PersistentVolumeClaimSpec) for the artifacts PVC that the controller creates (name `<artifact-name>-artifacts`). If omitted, the controller uses a default of 10Gi and ReadWriteOnce. Use it when you need more space or different access modes.

```yaml
apiVersion: build.kairos.io/v1alpha2
kind: OSArtifact
metadata:
  name: advanced-build
  namespace: default
spec:
  image:
    ref: quay.io/kairos/hadron:v0.0.3-core-amd64-generic-v4.0.0

  artifacts:
    arch: amd64
    iso: true
    cloudImage: true
    azureImage: true
    cloudConfigRef:
      name: cloud-config-secret
      key: cloud-config.yaml
    grubConfig: |
      set timeout=5
      set default=0
    osRelease: "hadron"
    kairosRelease: "v4.0.0"
    bundles:
      - quay.io/kairos/packages:helm-utils-4.1.1
      - quay.io/kairos/packages:k9s-utils-0.50.18

  imagePullSecrets:
    - name: private-registry-secret

  volume:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 50Gi
```
