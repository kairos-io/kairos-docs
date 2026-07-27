---
title: "GPU Operator on Jetson AGX Thor"
sidebar_label: "GPU Operator (Thor)"
sidebar_position: 3
---

# GPU Operator on Hadron Thor (T264)

Deploy the NVIDIA GPU Operator on a Hadron Jetson AGX Thor node so pods can request
`nvidia.com/gpu` resources and run CUDA workloads. This page covers **only the cluster-side
setup** — the host image itself is built separately, see
[Nvidia AGX Thor](/docs/installation/nvidia_agx_thor/).

Read [the overview](index.md) first — it explains the driver-less GPU Operator model, the
`v25.10.1` pin (Thor is where the `nvidia-ctk 1.19` mismatch bites hardest) and the shared
validation steps.

## Prerequisites

- Node booted from a Hadron Thor image built via
  [Nvidia AGX Thor](/docs/installation/nvidia_agx_thor/), so the image ships:
  - a build-from-scratch Tegra-compatible kernel with Tegra out-of-tree modules baked in,
  - `nvidia-container-toolkit 1.18.1` (from NVIDIA's r38.4 jetson `.deb` repo),
  - CSV files from `nvidia-l4t-init` under `/etc/nvidia-container-runtime/host-files-for-container.d/`
    (`drivers.csv`, `devices.csv`, `l4t.csv`),
  - `nvidia-cdi-refresh.service` enabled (auto-runs `nvidia-ctk cdi generate` at boot and writes
    `/var/run/cdi/nvidia.yaml`).
- `sudo nvidia-smi` on the host prints `NVIDIA Thor`.
- k3s installed with the NVIDIA runtime configured (containerd CDI enabled).
- `helm` available on your workstation.

## Why the version pin bites harder on Thor

The host on Thor ships `nvidia-ctk 1.18.1` — the latest release currently in NVIDIA's r38.4
jetson `.deb` repo. If NVIDIA has not yet published `1.19.x` for jetson when you read this,
`v26.x` of the operator **will** trip the `flag provided but not defined: -host-cuda-version`
CDI hook error. On x86 you can at least upgrade the host toolkit yourself; on Thor you are tied
to what the jetson repo carries.

| Component                | Version | Source                        |
|--------------------------|---------|-------------------------------|
| Host `nvidia-ctk`        | 1.18.1  | r38.4 jetson repo (`.deb`)    |
| device-plugin container  | v0.18.1 | GPU Operator helm chart       |
| `nvidia-ctk` inside plugin | 1.18.1 | bundled in plugin image       |

Use `v25.10.1`. Do not use `v26.x` until NVIDIA bumps the jetson repo to `1.19+`.

## Install

```bash
helm repo add nvidia https://nvidia.github.io/gpu-operator
helm repo update nvidia

cat > /tmp/gpu-operator-values.yaml <<'EOF'
# Host already ships nvidia-container-toolkit (deb from r38.4 jetson repo).
toolkit:
  enabled: false

# Tegra OOT driver is built into the kernel, not deployed by the operator.
driver:
  enabled: false

# Tegra single-GPU pure-CSV path: when only one GPU is present, the device-plugin
# falls back to "pure CSV" device-spec generation with an empty UUID. The default
# UUID-based namer then returns "" -> "no names defined" -> pod start error.
# Override to index naming.
devicePlugin:
  env:
    - name: DEVICE_ID_STRATEGY
      value: index
EOF

helm upgrade --install gpu-operator nvidia/gpu-operator \
  -n gpu-operator --create-namespace \
  --version v25.10.1 \
  -f /tmp/gpu-operator-values.yaml
```

Compared to the x86 values (`toolkit.enabled=true`, no `devicePlugin.env` override), Thor
disables the toolkit (host provides it) and forces the device-plugin's naming strategy.

## Post-install daemonset patch

The device-plugin container needs to read the host CSV files at
`/etc/nvidia-container-runtime/host-files-for-container.d/` (drivers.csv, devices.csv, l4t.csv).
The chart doesn't expose `extraVolumes` / `extraVolumeMounts` on `devicePlugin`, and the
controller resets `NVIDIA_DRIVER_ROOT=/`, so the alternative of pointing driver-root at the
existing `/host` mount doesn't survive reconciliation.

Bind-mount the CSV directory into the plugin container directly:

```bash
kubectl patch daemonset nvidia-device-plugin-daemonset -n gpu-operator --type=json -p='[
  {"op":"add","path":"/spec/template/spec/volumes/-","value":{"name":"nv-csv","hostPath":{"path":"/etc/nvidia-container-runtime/host-files-for-container.d"}}},
  {"op":"add","path":"/spec/template/spec/containers/0/volumeMounts/-","value":{"name":"nv-csv","mountPath":"/etc/nvidia-container-runtime/host-files-for-container.d","readOnly":true}}
]'
```

:::warning The patch does not survive `helm upgrade`
The patch persists across plugin pod restarts but **is reverted if you `helm upgrade` the
chart**. Re-apply after every helm upgrade.
:::

## Validate

Start with the [shared validation](index.md#validation) (allocatable count, host `nvidia-smi`,
plus the Thor smoke pod below instead of `cuda-vectoradd`). Then:

```bash
# Wait for the device-plugin pod to become Ready
kubectl get pod -n gpu-operator -l app=nvidia-device-plugin-daemonset -w

# GPU resource registered with kubelet
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.allocatable.nvidia\.com/gpu}{"\n"}{end}'
# Expected: <node-name>    1

# Quick describe view
kubectl describe node | grep "nvidia.com/gpu"
```

### Smoke-test pod

```yaml
# /tmp/gpu-smi.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-smi
spec:
  restartPolicy: Never
  runtimeClassName: nvidia
  containers:
  - name: smi
    image: ubuntu:24.04
    command: ["bash", "-c", "nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
```

```bash
kubectl apply -f /tmp/gpu-smi.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/gpu-smi --timeout=2m
kubectl logs gpu-smi
```

Expected:

```
NVIDIA-SMI 580.00     Driver Version: 580.00     CUDA Version: 13.0
0  NVIDIA Thor    Off  |   00000000:01:00.0 Off
```

## Optional: gpu-operator-free path

The image enables `nvidia-cdi-refresh.service`, which auto-runs `nvidia-ctk cdi generate` at boot
and writes `/var/run/cdi/nvidia.yaml`. For workloads that don't need k8s scheduling on
`nvidia.com/gpu`, skip the device-plugin entirely and use a pod with `runtimeClassName: nvidia`
+ `NVIDIA_VISIBLE_DEVICES=all`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-direct
spec:
  restartPolicy: Never
  runtimeClassName: nvidia
  containers:
  - name: smi
    image: ubuntu:24.04
    command: ["bash", "-c", "nvidia-smi"]
    env:
    - name: NVIDIA_VISIBLE_DEVICES
      value: all
    - name: NVIDIA_DRIVER_CAPABILITIES
      value: all
```

This bypasses the device-plugin entirely. Useful for one-off jobs or when you don't want
gpu-operator overhead. Caveat: kube-scheduler has no visibility into GPU consumption, so
co-tenancy isn't enforced.

## Known issues

- **`nvidia-dcgm-exporter` crash-loops.** DCGM doesn't support Tegra. Disable via helm
  `dcgmExporter.enabled=false` if the noise bothers you.
- **`gpu-feature-discovery` reports `nvidia.com/gpu.family=undefined` and
  `nvidia.com/gpu.mode=unknown`.** Cosmetic. NVML on Tegra returns `Not Supported` for several
  queries.
- **gpu-operator's official platform-support page states Jetson is not supported.** The recipe
  above works because Thor's PCIe-attached GPU is close enough to a discrete GPU shape that the
  device-plugin's pure-CSV fallback functions once the namer + CSV mount are corrected. Do not
  expect NVIDIA support if something breaks — file issues on
  [`kairos-io/kairos`](https://github.com/kairos-io/kairos/issues) instead.
- **CDI hook fails with `flag provided but not defined: -host-cuda-version`.** Someone bumped
  the chart past `v25.10.x`. See the [version pin](index.md#gpu-operator-version-pin).
- **Device-plugin pod loses its CSV mount after a `helm upgrade`.** Re-apply the
  [post-install patch](#post-install-daemonset-patch).
