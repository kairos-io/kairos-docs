---
title: "Confidential computing setup"
sidebar_label: "Confidential Computing"
sidebar_position: 9
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

[Confidential Containers](https://confidentialcontainers.org/) (CoCo) runs on Kairos the same way it runs on any Kubernetes distribution. Follow the [upstream installation guide](https://confidentialcontainers.org/docs/getting-started/installation/), then opt workloads in by selecting the appropriate [runtime class](https://confidentialcontainers.org/docs/getting-started/workload/). This page covers what is specific to Kairos: the host settings SEV-SNP needs, and the changes needed on Hadron.

## Host requirements

Enable the virtualization and memory-encryption options in the firmware: SEV, SEV-SNP and SNP memory coverage on AMD, or the equivalent TDX settings on Intel.

On AMD, also check the **Minimum SEV non-ES ASID** setting (called **SEV-ES ASID Space Limit** on some boards). Only the ASIDs below that value can be used by SEV-ES and SEV-SNP guests, so a value of `1` leaves none and the kernel keeps SNP disabled. Set it to the number of SEV-ES/SNP guests you plan to run plus one. After a reboot, the kernel should report SNP as enabled:

```bash
dmesg | grep kvm_amd                          # SEV-SNP enabled
cat /sys/module/kvm_amd/parameters/sev_snp    # Y
```

## Ubuntu and other glibc-based images

Kairos no longer ships prebuilt Ubuntu images, so build your own with the kernel command-line flags and vendor packages (Intel TDX/SGX attestation libraries, container image decryption tooling, etc.) your scenario needs. The upstream install then works unchanged. See:

- [Bring Your Own Image (BYOI)](/docs/reference/byoi/): the recommended path for Ubuntu and other non-Hadron bases.
- [The Kairos Factory](/docs/reference/kairos-factory/): how to turn a customized base image into a Kairos-ready artifact.

## Hadron

[Hadron](https://github.com/kairos-io/hadron) is musl-only. Since Kata 4.0.0, the Kata host binaries the CoCo chart installs (`containerd-shim-kata-v2`, `kata-runtime`, `kata-monitor`) are built statically ([kata-containers#13243](https://github.com/kata-containers/kata-containers/pull/13243)), so they run on Hadron. The nydus-snapshotter the chart installs for guest image pulls is still the glibc build, so `nydus-for-kata-tee.service` fails with `203/EXEC` and pods never get a sandbox.

Pick one of the two setups below. The examples use chart `0.23.0` (Kata 4.2.0) on k3s. Set `k8sDistribution` to match your distribution.

<Tabs>
<TabItem value="guest-pull" label="Guest pull without nydus (recommended)" default>

Kata can pull images inside the guest without nydus-snapshotter, using its force guest-pull mode (marked experimental upstream). There is then no snapshotter to install and nothing on the host to patch.

Save this values file. It deploys only the `qemu-snp` runtime, skips the nydus setup and turns on force guest-pull:

```yaml title="coco-hadron-snp.yaml"
kata-as-coco-runtime:
  k8sDistribution: k3s
  snapshotter:
    setup: []
  shims:
    disableAll: true
    qemu-snp:
      enabled: true
      containerd:
        snapshotter: null
        forceGuestPull: true
    qemu-tdx:
      enabled: false
    qemu-coco-dev:
      enabled: false
    qemu-coco-dev-runtime-rs:
      enabled: false
    qemu-nvidia-gpu-snp:
      enabled: false
    qemu-nvidia-gpu-tdx:
      enabled: false
```

The other TEE shims are turned off because the chart wires them to nydus by default. To use one of them as well, set `enabled: true` and give it the same `containerd` block as `qemu-snp`.

Install the chart and check that the runtime class exists:

```bash
helm install coco oci://ghcr.io/confidential-containers/charts/confidential-containers \
  --version 0.23.0 -n coco-system --create-namespace \
  -f coco-hadron-snp.yaml --wait
kubectl -n coco-system rollout status ds/kata-as-coco-runtime
kubectl get runtimeclass kata-qemu-snp
```

</TabItem>
<TabItem value="nydus" label="Keep nydus-snapshotter">

Use this only if you need nydus-snapshotter itself. It takes three changes on the host, and the binary swap in step 4 has to be repeated whenever kata-deploy reinstalls its files.

**1. Persist the snapshotter state.** nydus keeps its snapshots under `/var/lib/nydus-for-kata-tee`. On Kairos that path sits on the overlay root, and the kernel refuses to use an overlay as the upper directory of another overlay (`mount overlayfs by syscall: invalid argument`). Bind-mount it from the persistent partition at install time:

```yaml
#cloud-config
install:
  bind_mounts:
    - /var/lib/nydus-for-kata-tee
```

On a node that is already installed, see [Adding persistent paths after install](/docs/examples/extra_persistent_paths_after_install).

**2. Provide `mount.fuse`.** nydus hands containerd mounts of type `fuse.nydus-overlayfs`. containerd runs those through the `mount.fuse` helper, which in turn calls `nydus-overlayfs`. Hadron does not ship the FUSE userspace tools. No FUSE is actually involved, so a small stand-in is enough. This cloud-config writes it on every boot:

```yaml
#cloud-config
stages:
  boot:
    - name: "mount.fuse stand-in for nydus-overlayfs"
      files:
        - path: /usr/local/sbin/mount.fuse
          permissions: 0755
          owner: 0
          group: 0
          content: |
            #!/bin/sh
            # containerd calls: mount.fuse <source> <target> -o a -o b ... -t <helper>
            helper= opts= pos=
            while [ $# -gt 0 ]; do
              case "$1" in
                -t) helper=$2; shift 2 ;;
                -o) opts=${opts:+$opts,}$2; shift 2 ;;
                *)  pos="$pos $1"; shift ;;
              esac
            done
            [ -n "$helper" ] || { echo "mount.fuse: missing -t" >&2; exit 1; }
            exec "$helper" $pos ${opts:+-o "$opts"}
```

**3. Install the chart** with its defaults:

```bash
helm install coco oci://ghcr.io/confidential-containers/charts/confidential-containers \
  --version 0.23.0 -n coco-system --create-namespace \
  --set kata-as-coco-runtime.k8sDistribution=k3s --wait
```

**4. Swap in the static nydus binaries.** Use the static build of the nydus version that the chart's Kata release pins (`v0.15.15` for chart `0.23.0`). The static tarball is published for amd64 only.

```bash
V=v0.15.15
curl -fLO "https://github.com/containerd/nydus-snapshotter/releases/download/${V}/nydus-snapshotter-${V}-linux-static.tar.gz"
tar xzf "nydus-snapshotter-${V}-linux-static.tar.gz"
install -m 0755 bin/containerd-nydus-grpc bin/nydus-overlayfs /opt/kata/nydus-for-kata-tee/
systemctl restart nydus-for-kata-tee.service
```

The `kata-as-coco-runtime` pod copies its files back into `/opt/kata` every time it starts, which brings the glibc binary back. Repeat this step after that pod restarts or the chart is upgraded.

</TabItem>
</Tabs>

### Run a test workload

```yaml title="snp-test.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: snp-test
spec:
  runtimeClassName: kata-qemu-snp
  restartPolicy: Never
  containers:
  - name: test
    image: busybox:1.36
    command: ["sh", "-c", "dmesg | grep -iE 'sev|snp|memory encryption'; uname -r; sleep 3600"]
```

```bash
kubectl apply -f snp-test.yaml
kubectl logs snp-test
```

The logs come from the guest kernel and should include `Memory Encryption Features active: AMD SEV SEV-ES SEV-SNP`.


## Legacy enclave-cc integration

:::warning Warning

The rest of this page describes an earlier, experimental integration based on [`enclave-cc`](https://github.com/confidential-containers/enclave-cc) and the `coco` community bundle. It is kept for historical reference and does not reflect the current recommended approach described above.

:::


Confidential computing is a type of secure computing that allows users to encrypt and decrypt data on a secure, isolated computing environment.
It works by encrypting the data before it is sent to the cloud or other computing resources. This allows users to keep their data private and secure, even if it is accessed by unauthorized parties.
This makes it useful for sensitive data such as financial information, health records, and other confidential data.

One important aspect of Confidential Computing is the ability to encrypt data even in-memory. This document describes how to setup Kairos to use [`enclave-cc`](https://github.com/confidential-containers/enclave-cc)
in order to run confidential workloads.

### Create a Kairos cluster

The [`coco community bundle`](https://github.com/kairos-community/bundles/tree/main/coco) is supported since Kairos version `v2.0.0-alpha3` ("coco" stands for "**Co**nfidential **Co**mputing").

A configuration file like the following should be used (see the `bundles` section):

```
#cloud-config
bundles:
    - targets:
        - run://quay.io/kairos/community-bundles:cert-manager_latest
        - run://quay.io/kairos/community-bundles:kairos_latest
        - run://quay.io/kairos/community-bundles:coco_latest

install:
    auto: true
    device: auto
    reboot: true

k3s:
    enabled: true

users:
    - name: kairos
      passwd: kairos
      groups:
          - admin
```

The bundle is making some changes on the host's filesystem (installs a customized containerd binary among other things) and a restart of the node is needed in order for the changes to be applied fully.
When this file appears, reboot the node: `/etc/containerd/.sentinel`.

### Additional steps

- [Label our node](https://github.com/confidential-containers/documentation/blob/main/quickstart.md#prerequisites):

```
  kubectl label --overwrite node $(kubectl get nodes -o jsonpath='{.items[].metadata.name}') node-role.kubernetes.io/worker=""
```

- [Deploy the operator](https://github.com/confidential-containers/documentation/blob/main/quickstart.md#deploy-the-the-operator)

```
  kubectl apply -k github.com/confidential-containers/operator/config/release?ref=v0.4.0
```

- [Deploy the `ccruntime` resource]

```
  kubectl apply -k github.com/confidential-containers/operator/config/samples/ccruntime/ssh-demo?ref=v0.4.0
```

  (wait until they are all running: `kubectl get pods -n confidential-containers-system --watch`)

- [Deploy a workload](https://github.com/confidential-containers/documentation/blob/main/quickstart.md#test-creating-a-workload-from-the-sample-encrypted-image)

  The last part with the verification will only work from within a Pod because the IP address is internal:

  `ssh -i ccv0-ssh root@$(kubectl get service ccv0-ssh -o jsonpath="{.spec.clusterIP}")`

  You can create a Pod like this:

  ```
  apiVersion: v1
  kind: Pod
  metadata:
    name: kubectl
  spec:
    containers:
    - name: kubectl
      image: opensuse/leap
      command: ["/bin/sh", "-ec", "trap : TERM INT; sleep infinity & wait"]
  ```

  Get a shell to it and run the verification commands (You will need to install `ssh` in the Pod first).

### Known limitations

The above solution has some known limitations that might be addressed in future releases of Kairos. Namely:

- After a Kairos upgrade, the above process has to be repeated in order to install the customized `containerd` and the relevant configuration.
- There is no simple way to upgrade to newer versions of the bundle ([this is a general bundles limitation](https://github.com/kairos-io/kairos/issues/974)).
