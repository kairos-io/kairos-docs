---
title: "NVIDIA GPU support on Hadron"
sidebar_label: "Overview"
sidebar_position: 1
---

# NVIDIA GPU support on Hadron

Hadron supports two NVIDIA GPU platforms, each with its own build and deploy flow. Both bake the
kernel driver into the OS image (Hadron is musl-based and from-scratch, so NVIDIA's pre-built
driver containers do not apply) and then run the [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/)
in **driver-less mode** so Kubernetes can schedule `nvidia.com/gpu` workloads.

## Which page do I need?

| Your hardware | Follow |
|---|---|
| Discrete NVIDIA GPU on x86_64 (data-center, workstation) | [Discrete NVIDIA GPU on x86_64](discrete-x86.md) |
| NVIDIA Jetson AGX Thor (Tegra SoC, ARM64) | Build the base image with [Nvidia AGX Thor](/docs/installation/nvidia_agx_thor/), then set up the cluster with [GPU Operator on Jetson Thor](thor-cluster.md) |
| Older NVIDIA Jetson (Orin, Xavier, Nano) | Not currently covered — open an issue on [`kairos-io/kairos`](https://github.com/kairos-io/kairos/issues) |

The two paths share a few pieces of infrastructure explained once here; the platform-specific
pages assume you have read this overview.

## What the two paths share

### Driver-less GPU Operator

Both platforms build the kernel driver **into the OS image** (open GPU kernel modules on x86,
Tegra out-of-tree modules for Thor). This means the GPU Operator is installed with
`driver.enabled=false` — it manages only the device plugin, feature discovery and (on x86) the
container toolkit. It does **not** deploy a driver container.

Consequence: an upgrade to a new NVIDIA driver version is a **Hadron image rebuild**, not a
Kubernetes-side upgrade. Plan driver bumps like OS upgrades.

### GPU Operator version pin

Use **GPU Operator `v25.10.1`**. Do **not** upgrade to `v26.x`.

`v26.x` ships `nvidia-device-plugin v0.19.x`, which bundles `nvidia-ctk` `1.19` and generates
CDI specs referencing the `-host-cuda-version` flag introduced in `1.19`. Both the host
`nvidia-ctk` on Thor (`1.18.1` from the r38.4 jetson repo) and the toolkit shipped by the
operator's own container on x86 are still on `1.18.x`, so CDI hook execution fails with:

```
flag provided but not defined: -host-cuda-version
```

Stay on `v25.10.1` until NVIDIA bumps the jetson repo and the operator's toolkit image in
lockstep.

### Validation

Once the OS image boots and the GPU Operator's daemonset pods are `Running`, both paths validate
the same way:

1. **Kubelet sees the GPU:**

    ```bash
    kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.allocatable.nvidia\.com/gpu}{"\n"}{end}'
    ```

    Expect `1` (or more) per GPU-enabled node.

2. **`nvidia-smi` runs on the host:**

    ```bash
    ssh kairos@<node-ip> "nvidia-smi"
    ```

    Should print the GPU name, driver version and temperature.

3. **CUDA compute works from a pod:**

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

    Expected tail: `Test PASSED`.

    On Thor, run the equivalent [Thor-specific smoke pod](thor-cluster.md#validate) instead — the
    Tegra path uses `runtimeClassName: nvidia` and NVIDIA's Thor CUDA image.

The per-platform pages skip these generic checks and only spell out the platform-specific
verification (driver version match, extra pod annotations, etc.).
