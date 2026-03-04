---
title: "Using Private Registries"
linkTitle: "Private Registries"
weight: 5
date: 2025-07-25
description: Configure the Kairos operator to pull images from private container registries
---

The Kairos Operator supports `imagePullSecrets` for [NodeOp](../nodeop/), [NodeOpUpgrade](../nodeop-upgrade/), and [OSArtifact](../osartifact/) resources, allowing you to pull images from private container registries. For **OSArtifact**, you also use **`spec.image.imageCredentialsSecretRef`** when the Stage 1 image (or its base image) comes from a private registry or when you push the built image to a private registry — see [OSArtifact: Image credentials](../osartifact/#image-credentials-when-they-are-used) for the full list of use cases.

## Creating Image Pull Secrets

Before using `imagePullSecrets`, you need to create a Kubernetes secret containing your registry credentials. Here are examples for different registry types ([See also the Kubernetes docs](https://kubernetes.io/docs/concepts/containers/images/#creating-a-secret-with-a-docker-config)):

### Docker Hub

```bash
kubectl create secret docker-registry private-registry-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=your-username \
  --docker-password=your-password \
  --docker-email=your-email@example.com
```

### Private Registry

```bash
kubectl create secret docker-registry private-registry-secret \
  --docker-server=private-registry.example.com \
  --docker-username=your-username \
  --docker-password=your-password \
  --docker-email=your-email@example.com
```

### Using a .docker/config.json file

```bash
kubectl create secret generic private-registry-secret \
  --from-file=.dockerconfigjson=/path/to/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson
```

## Usage with NodeOp

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOp
metadata:
  name: operation-with-private-image
  namespace: default
spec:
  image: private-registry.example.com/my-org/my-image:latest

  imagePullSecrets:
  - name: private-registry-secret

  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  command:
    - sh
    - -c
    - |
      echo "Running on node $(hostname)"

  concurrency: 1
  stopOnFailure: true
  rebootOnSuccess: true
```

## Usage with NodeOpUpgrade

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: upgrade-from-private-registry
  namespace: default
spec:
  image: private-registry.example.com/kairos/opensuse:leap-15.6-standard-amd64-generic-v3.4.2-k3sv1.30.11-k3s1

  imagePullSecrets:
  - name: private-registry-secret

  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"

  concurrency: 1
  stopOnFailure: true
```

## How It Works

1. When you specify `imagePullSecrets` in a `NodeOp` or `NodeOpUpgrade` resource, the operator will include these secrets in the Pod spec of the jobs it creates.
2. For `NodeOpUpgrade` resources, the `imagePullSecrets` are automatically passed to the underlying `NodeOp` resource that gets created.
3. The Kubernetes kubelet on each node will use these secrets to authenticate with the container registry when pulling the specified images.

## Usage with OSArtifact

For **OSArtifact** resources, two mechanisms apply:

1. **`spec.imagePullSecrets`** — Used by the Kubernetes kubelet to pull the **builder pod’s container images** (e.g. the AuroraBoot or Kaniko image). If your tool image is in a private registry, list the pull secret(s) here.
2. **`spec.image.imageCredentialsSecretRef`** — A single Secret reference used for **pull and push** of the Stage 1 image. It is used when:
   - Pulling a **pre-built image** (`spec.image.ref`) from a private registry (unpack container),
   - Pulling the **base image** when building with `buildOptions` or the **FROM image** when building with `ociSpec` (Kaniko),
   - **Pushing** the built image when `spec.image.push: true` (Kaniko).

When `imageCredentialsSecretRef` is set, the operator also adds that secret to the pod’s ImagePullSecrets, so one Secret can cover both the tool image and the Stage 1 image when they share the same registry. For the full table of use cases, see [Image credentials: when they are used](../osartifact/#image-credentials-when-they-are-used) in the OSArtifact documentation.

## Notes

- The secrets must exist in the same namespace as the NodeOp, NodeOpUpgrade, or OSArtifact resource.
- Multiple secrets can be specified in `imagePullSecrets` if needed.
- For NodeOp/NodeOpUpgrade, the secrets are only used for pulling the main operation image, not for any additional images that might be used internally by the operator.
