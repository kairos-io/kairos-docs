---
title: Nvidia drivers
sidebar_position: 4
---

# Build a custom Hadron image with NVIDIA drivers

Hadron Linux is a musl-based, from-scratch distribution. NVIDIA's pre-built driver containers
target specific glibc distributions (Ubuntu, RHEL, etc.) and do not support Hadron out of the
box. The correct approach is to compile NVIDIA open kernel modules against the exact Hadron
kernel version and bake them — along with the NVIDIA userspace tools and a glibc shim — into a
custom OCI image.

The [`kairos-io/hadron`](https://github.com/kairos-io/hadron) repository provides
`examples/add-packages/Dockerfile.nvidia` which does exactly this.

## Choosing the right base image

The `hadron-extension` final stage uses `BASE_IMAGE` as its base. The right value depends on
what you plan to do with the image:

| Use case | `BASE_IMAGE` |
|---|---|
| Build a bootable ISO / sysextension with Auroraboot | `ghcr.io/kairos-io/hadron` |
| **Upgrade a running Kairos node** (via `NodeOpUpgrade`) | The full Kairos image from `quay.io/kairos` |

When upgrading a running node with the Kairos operator, the upgrade pod runs `kairos-agent`
**from inside your image**. The raw `ghcr.io/kairos-io/hadron` base does not include
`kairos-agent`; using it as the base will fail at upgrade time with
`kairos-agent: command not found`.

To find the correct full Kairos image tag for your running node:

```bash
kairos-agent upgrade list-releases | grep hadron
```

Example output:
```
quay.io/kairos/hadron:v0.0.4-standard-amd64-generic-v4.0.3-k3s-v1.35.2-k3s1
```

Use that full image reference as your `BASE_IMAGE` + `BASE_IMAGE_TAG`.

## Build arguments

| Argument | Purpose |
|---|---|
| `HADRON_VERSION` | Hadron release tag — used for the `hadron-toolchain` image. Must match the kernel on your target node. |
| `BASE_IMAGE` | Registry + image name for the final base (see table above). |
| `BASE_IMAGE_TAG` | Full tag of the base image (may differ from `HADRON_VERSION` for full Kairos images). |
| `NVIDIA_VERSION` | NVIDIA open-gpu-kernel-modules version (e.g. `580.126.20`). |
| `JOBS` | Parallelism for compilation (`$(nproc)` on native builds). |
| `KERNEL_ARCH` | Kernel `ARCH` value — must be `x86_64` (not `amd64`) for x86_64 targets. |

:::info
`HADRON_VERSION` and `BASE_IMAGE_TAG` serve different purposes. `HADRON_VERSION` pins the
toolchain (and thus the kernel version the modules are compiled against). `BASE_IMAGE_TAG` is
the tag of the OS image layered into the final output. Keep `HADRON_VERSION` matching the
Hadron flavor release (e.g. `v0.0.4`); `BASE_IMAGE_TAG` may be the longer Kairos release tag.
:::

## What the image contains

The build produces a Kairos OS image with these additions on top of the base:

| Component | Source | Purpose |
|---|---|---|
| NVIDIA open kernel modules (`.ko.zst`) | Compiled from source against Hadron kernel | `modprobe nvidia` |
| `nvidia-smi`, `nvidia-cuda-mps-*` | NVIDIA redistributable driver | GPU management tools |
| `nvidia-modprobe` | NVIDIA redistributable | Creates `/dev/nvidia*` device nodes at boot |
| glibc runtime (`libc.so.6`, `ld-linux-*.so`) | Ubuntu 24.04 | Lets glibc-linked NVIDIA binaries run on musl |
| NVIDIA compute libraries (`libcuda.so`, `libnvidia-ml.so`, …) | NVIDIA redistributable | CUDA / ML frameworks |
| NVIDIA firmware | NVIDIA redistributable | GPU firmware blobs |
| `/etc/modprobe.d/blacklist-nouveau.conf` | Generated | Prevents nouveau from loading |
| `/etc/udev/rules.d/71-nvidia.rules` | Generated | Triggers `nvidia-modprobe` on module load |

:::info Why `nvidia-modprobe` and the udev rule are required

The NVIDIA kernel modules load at boot, but on Hadron (a from-scratch distro) the standard
distro udev rules for creating NVIDIA device nodes are not present. Without `nvidia-modprobe`
being called after the modules load, `/dev/nvidia0`, `/dev/nvidia-uvm` and friends are never
created. The result is that `nvidia-smi` starts but reports *"couldn't communicate with the
NVIDIA driver"* even though `lsmod | grep nvidia` shows the modules as loaded.

The image installs two udev rules in `/etc/udev/rules.d/71-nvidia.rules`:

```
SUBSYSTEM=="module", ACTION=="add", KERNEL=="nvidia",     RUN+="/usr/bin/nvidia-modprobe -c 0"
SUBSYSTEM=="module", ACTION=="add", KERNEL=="nvidia_uvm", RUN+="/usr/bin/nvidia-modprobe -u"
```

Do **not** combine the flags into a single `nvidia-modprobe -c 0 -u` call: `-u` means *"act
on the UVM module instead of the GPU module"*, so it suppresses `/dev/nvidia0` creation
entirely and the GPU stays inaccessible to userspace.
:::

:::warning Hadron usr-merge trap when extending the image

On Hadron the filesystem layout is:

```
/sbin     -> usr/bin
/usr/sbin -> bin
```

Both `/sbin/*` and `/usr/sbin/*` resolve to `/usr/bin/*`. **Never create a real
`/usr/sbin/` directory in a builder stage that you `COPY --link` into the final image** — for
example with `mkdir -p ${OUTPUT}/usr/sbin && cp something ${OUTPUT}/usr/sbin/...`. BuildKit's
`--link` mode overlays the directory entry and replaces the base image's `/usr/sbin → bin`
symlink with your (almost-empty) real directory, hiding every other binary normally reachable
through `/usr/sbin` (`modprobe`, `init`, `systemctl`, `iptables`, …).

The breakage is silent and far-reaching:

- The kernel reads `/proc/sys/kernel/modprobe` (= `/usr/sbin/modprobe`) to handle
  `request_module()`, so module auto-loading silently fails. **Cilium then crashes with
  `failed to add veth pair: operation not supported`**, the
  `node.cilium.io/agent-not-ready:NoSchedule` taint sticks, the GPU operator's daemonsets
  never schedule, and `nvidia.com/gpu` never gets advertised.
- SSH closes connections after key acceptance because PAM hits `pam_access.so` /
  `pam_time.so` without the missing helper binaries.

The included Dockerfile places `ldconfig` at `${OUTPUT}/usr/bin/ldconfig` for exactly this
reason: `/usr/bin` is a real directory in the base image and merges cleanly, and
`/sbin/ldconfig`, `/usr/sbin/ldconfig` and `/usr/bin/ldconfig` all still resolve to it.
:::

:::info Why `ldconfig` ships in the image at all

The NVIDIA container runtime hook bind-mounts the host's `/sbin/ldconfig` into every GPU
container so the container can rebuild its `ld.so.cache`. Hadron is musl-based and has no
glibc `ldconfig`, so without this file every GPU pod fails to start with
`stat /sbin/ldconfig: no such file or directory` from the OCI `createContainer` hook.

The Dockerfile copies `/sbin/ldconfig.real` (the real glibc binary) from the Ubuntu 24.04
builder, **not** `/sbin/ldconfig` — the latter is a 387-byte wrapper script that delegates
to `/sbin/ldconfig.real`, which does not exist on Hadron.
:::

## Building the image

### Native Linux x86_64 (local build)

```bash
HADRON_VERSION="v0.0.4"
NVIDIA_VERSION="580.126.20"
BASE_IMAGE="quay.io/kairos/hadron"
BASE_IMAGE_TAG="v0.0.4-standard-amd64-generic-v4.0.3-k3s-v1.35.2-k3s1"
IMAGE="my-registry.example.com/myteam/hadron-nvidia:${HADRON_VERSION}"

docker buildx build \
  -f examples/add-packages/Dockerfile.nvidia \
  --build-arg HADRON_VERSION="${HADRON_VERSION}" \
  --build-arg BASE_IMAGE="${BASE_IMAGE}" \
  --build-arg BASE_IMAGE_TAG="${BASE_IMAGE_TAG}" \
  --build-arg NVIDIA_VERSION="${NVIDIA_VERSION}" \
  --build-arg KERNEL_ARCH="x86_64" \
  --build-arg JOBS="$(nproc)" \
  --target hadron-extension \
  -t "${IMAGE}" \
  --push \
  .
```

The build downloads the kernel source (~100 MB) and compiles NVIDIA open kernel modules from
source — expect 15–30 minutes on a 4-core machine.

### GitHub Actions (for Apple Silicon or CI)

Building NVIDIA kernel modules via QEMU emulation on non-native hosts is impractical. GitHub
Actions provides free x86_64 runners with `docker buildx` pre-installed.

Create `.github/workflows/build-hadron-nvidia.yml` in your fork of `kairos-io/hadron`:

```yaml
name: Build Hadron+NVIDIA image

on:
  workflow_dispatch:
    inputs:
      hadron_version:
        description: Hadron release tag
        default: v0.0.4
        required: true
      nvidia_version:
        description: NVIDIA open-gpu-kernel-modules version
        default: '580.126.20'
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: examples/add-packages/Dockerfile.nvidia
          target: hadron-extension
          build-args: |
            HADRON_VERSION=${{ inputs.hadron_version }}
            NVIDIA_VERSION=${{ inputs.nvidia_version }}
            JOBS=4
            KERNEL_ARCH=x86_64
            BASE_IMAGE=quay.io/kairos/hadron
            BASE_IMAGE_TAG=v0.0.4-standard-amd64-generic-v4.0.3-k3s-v1.35.2-k3s1
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/hadron-nvidia:${{ inputs.hadron_version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Trigger it from the **Actions** tab → **Run workflow**, then make the resulting GHCR package
public so your cluster nodes can pull it without credentials.

## Upgrading a running Kairos node with `NodeOpUpgrade`

Use the Kairos operator to upgrade a node in-place. The operator creates a privileged pod on
the target node that runs `kairos-agent` **from inside the container** — this is important
because it creates the squashfs for the new active partition directly from the running container
filesystem, preserving all symlinks (including `/boot/vmlinuz`) correctly. Running
`kairos-agent upgrade --source oci:` directly on the host unpacks OCI layers separately and
can break those symlinks, causing a GRUB boot failure (`invalid magic number`).

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: upgrade-worker-hadron-nvidia
  namespace: default
spec:
  image: ghcr.io/<your-org>/hadron-nvidia:v0.0.4
  upgradeActive: true
  upgradeRecovery: false
  force: true
  nodeSelector:
    matchLabels:
      kubernetes.io/hostname: <your-gpu-node-name>
```

:::info Why `force: true` is required

The operator compares the version string in `/etc/kairos-release` of the running node against
the image. Because the custom NVIDIA image is based on the same Kairos release as the running
node, the versions match and the operator exits with *"Up to date"* without writing anything.
`force: true` bypasses the version check and always performs the upgrade.
:::

Apply it and watch progress:

```bash
kubectl apply -f nodeopupgrade.yaml
kubectl get pods -A | grep upgrade
```

The node will reboot once. After it comes back, verify NVIDIA is functional:

```bash
ssh kairos@<node-ip> "nvidia-smi"
```

Expected output shows the GPU name, driver version `580.126.20`, and temperature.

## Installing the NVIDIA GPU Operator (driver-less mode)

With NVIDIA kernel modules already in the OS image, install the GPU Operator with
`driver.enabled=false` so it manages only the device plugin and feature discovery — not the
driver:

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia && helm repo update

helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --version v25.10.1 \
  --set driver.enabled=false \
  --set toolkit.enabled=true \
  --set devicePlugin.enabled=true \
  --set gfd.enabled=true \
  --set nfd.enabled=true
```

Keep `toolkit.enabled=true`: the toolkit container configures the host's containerd /
CRI-O runtime to invoke the NVIDIA OCI hook for GPU containers. With drivers in the OS
image, the toolkit no longer needs to *install* the driver (`driver.enabled=false`), but
it still needs to wire up the runtime.

:::warning
Use GPU Operator **v25.10.1**, not v26.x. Version 26 ships `nvidia-ctk` 1.19 which conflicts
with the host toolkit version bundled in the Hadron image, causing CDI hook failures.
:::

Verify the GPU resource is registered:

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.allocatable.nvidia\.com/gpu}{"\n"}{end}'
```

A GPU-enabled node should show `1` (or more) in the `nvidia.com/gpu` column.

## Validating end-to-end with a CUDA workload

The operator's bundled `nvidia-cuda-validator` pod runs automatically as part of the
`nvidia-operator-validator` init sequence and is a good first signal — if you see
`nvidia-cuda-validator-xxxxx` in `gpu-operator` namespace with `STATUS: Completed`, basic
CUDA compute already works.

For an explicit, repeatable test deploy NVIDIA's `vectorAdd` sample requesting
`nvidia.com/gpu: 1`:

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: cuda-vectoradd
spec:
  restartPolicy: OnFailure
  containers:
  - name: cuda-vectoradd
    image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda12.5.0-ubi8
    resources:
      limits:
        nvidia.com/gpu: 1
EOF

kubectl wait --for=condition=Ready pod/cuda-vectoradd --timeout=120s || true
kubectl logs cuda-vectoradd
```

Expected output:

```
[Vector addition of 50000 elements]
Copy input data from the host memory to the CUDA device
CUDA kernel launch with 196 blocks of 256 threads
Copy output data from the CUDA device to the host memory
Test PASSED
Done
```

The pod will end up in `Completed` (it's a one-shot CUDA program). If it's stuck in
`Pending` because nothing tolerates the GPU schedule, check that the worker carries the
`nvidia.com/gpu=true` label and the `gpu-operator` daemonset pods on it are all
`Running`.

Clean up:

```bash
kubectl delete pod cuda-vectoradd
```
