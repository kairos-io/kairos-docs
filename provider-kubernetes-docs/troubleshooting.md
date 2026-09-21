---
title: "Status and troubleshooting"
linkTitle: "Troubleshooting"
weight: 8
description: The status document, the phases and reason codes, the node annotations, and the failures an operator actually hits.
sidebar_position: 8
---

The reconcile pass runs as a fire-and-forget boot-time stage, so its exit code never reaches `kairos-agent`. Rather than make you read journald, the provider publishes its outcome through two channels you can inspect directly.

Both are best-effort. A status write never blocks the boot, never retries forever, and never changes or masks the real reconcile result.

## The status document

Every reconcile pass and every reset writes a small YAML document to two places:

- `/run/provider-kubernetes/status.yaml`, the current boot, on tmpfs. This is the authoritative copy.
- `/var/log/provider-kubernetes/status.yaml`, a persistent mirror that survives a reboot, for looking at after a failed boot.

Both are written atomically, so a reader never sees a partial document, at mode 0640 owned by root. The group is set to `adm` where that group exists, so a monitoring agent in it can read them; if the lookup fails the file stays root:root. Either way they are not world-readable.

The document carries no secrets by construction. Every field except `message` is a closed enum, and `message` is sanitized, with bootstrap tokens, PEM blocks and long secret-looking runs redacted, then truncated to one short line.

```yaml
apiVersion: provider-kubernetes.kairos.io/v1
phase: Failed
role: worker
membership: uninitialized
outcome: failure
reason: ControlPlaneUnreachable
terminal: false
lastAction: wait-for-control-plane
message: "control-plane endpoint not reachable within budget"
budget:
  attempts: 3
  maxAttempts: 3
updatedAt: "2026-06-03T12:00:00Z"
bootID: 7c9e6679-7425-40de-944b-e07fc1f90ae7
version: v0.4.0
```

| Field | Meaning |
|-------|---------|
| `phase` | `Reconciling`, `Converged`, `Degraded`, `Failed`, or `Reset`. |
| `role` | The declared role: `init`, `controlplane`, or `worker`. |
| `membership` | The probed actual state: `uninitialized`, `initialized`, or `joined`. |
| `outcome` | `success` or `failure`. |
| `reason` | A closed enum, empty on success. |
| `terminal` | `true` if the next boot will not retry. `false` if a later boot may converge. |
| `lastAction` | The last kubeadm action attempted, for example `run-join` or `upgrade-apply`. |
| `message` | One short, sanitized, operator-facing line. |
| `budget` | Attempts used out of the maximum. |
| `updatedAt` | RFC3339 timestamp. |
| `bootID` | The kernel boot ID, so you can tell which boot produced this. |
| `version` | The provider build version. |

This is the only channel that works when a node never joined the cluster, which is the failure you most need to debug. On a [trusted boot](../trusted-boot) node it is the only channel at all.

## Node annotations

When the node is already a cluster member and a local kubeconfig exists, the provider also records the same outcome as annotations on its own Node object, so you can see it without SSH:

```bash
kubectl get node the-node-name -o jsonpath='{.metadata.annotations}' \
  | tr ',' '\n' | grep provider-kubernetes.kairos.io
```

Seven keys are published under `provider-kubernetes.kairos.io/`: `phase`, `outcome`, `reason`, `terminal`, `last-action`, `updated-at` and `version`.

The free-text `message` is not published, so an annotation can never carry a secret; only the closed enum fields go here. The write uses the least-privilege credential already on the node, `kubelet.conf` and its `system:node:` identity, in preference to `admin.conf`. The provider creates no RBAC, no ServiceAccount and no token for this.

If the node is not a member, has no kubeconfig, or the API is unreachable, this layer is silently skipped. The status document still has the truth.

## Phases

`Reconciling` means a pass is in progress.

`Converged` means the node is in the state its role declares, and its kubelet is healthy.

`Degraded` means the node is already a cluster member, `membership` is `initialized` or `joined`, but its kubelet is not healthy. `outcome` is `failure`, because something is genuinely wrong, but `terminal` is `false`, because a later boot or an explicit reset may still converge.

`Failed` means the pass did not converge the node. Read `reason` and `message`, and check `terminal`.

`Reset` is written after a cluster reset.

### What Degraded actually checks

Exactly one thing: a plain HTTP GET of the kubelet's own loopback healthz endpoint, `http://127.0.0.1:10248/healthz`. This is the same endpoint kubeadm itself waits on before it considers a kubelet up. Healthy means an HTTP 200 within two seconds. A dial error, a timeout, a non-200 status and an unreadable body are all "not healthy", including "connection refused", which is exactly what a masked or stopped kubelet looks like.

It is a narrower signal than "the kubelet unit is running" or "every control-plane container is up". It asks the kubelet's own liveness endpoint, on this node, right now, and nothing else.

The provider does not re-run `kubeadm init` or `kubeadm join` in this state. Recovering an established member is an explicit operator action, never an automatic re-bootstrap. Before this phase existed, a dead kubelet on a member node was reported as `Converged`, which masked a real outage.

When you see it, find out why the kubelet is failing before you decide to reset:

```bash
sudo journalctl -u kubelet
sudo journalctl -u containerd
sudo crictl ps -a
```

## Reason codes

| `reason` | What happened |
|----------|---------------|
| `ControlPlaneUnreachable` | The control-plane endpoint was not reachable within the budget. |
| `JoinTimeout` | A join did not complete within the budget. |
| `InitRefused` | A second `role: init` was refused so it could not clobber an existing cluster. |
| `UpgradeRefused` | A downgrade, skip-level, or out-of-window upgrade pin was refused. |
| `BudgetExhausted` | The bounded retry budget ran out. |
| `KubeadmError` | A kubeadm action failed. |
| `ConfigInvalid` | The supplied cluster config was invalid, for example an empty or too-short `cluster_token`. |
| `KubeletUnhealthy` | The signal behind `phase: Degraded`, above. |
| `ResetFailed`, `ResetOK` | The outcome of a cluster reset. |

Eight further reasons, all beginning `ClusterConfig`, come from the cluster-config directory stage that runs before any reconcile pass. They are covered in [Trusted boot](../trusted-boot), where they matter most.

## Where else to look

- The reconcile log, `/var/log/provider-kubernetes-reconcile.log`: the role, the observed membership, the planned actions, and any bounded failure with kubeadm's output, sanitized.
- The import log, `/var/log/provider-kubernetes-image-import.log`.
- The serialized input this boot consumed, `/run/provider-kubernetes/cluster.json`, on tmpfs at mode 0600.
- kubeadm's own artifacts: `/etc/kubernetes/`, including the PKI and the upgrade backups under `/etc/kubernetes/tmp/`; `/var/lib/etcd`; `/var/lib/kubelet`.

The provider fails loudly and does not hang. If bootstrap cannot proceed you get an error in the log, not a stuck boot. If a boot does seem stuck, suspect the environment (network, disk, the kubelet, containerd) rather than the provider looping.

## Failures you will actually hit

### The node is NotReady

Expected until you install a CNI. See [CNI](../cni).

### role: init refused, "a control plane already answers at ..."

Working as intended. The node is configured `role: init` but a control plane already exists at that endpoint, so the provider refuses rather than run `kubeadm init` over a live cluster. Use `role: controlplane` with minted control-plane material, or `role: worker`.

### A join fails for want of a CA anchor

Token discovery requires `caCertHashes`. Re-mint with `mint-join`, which computes the pin, or supply `ca_certs` and let the provider derive it. The provider never joins without pinning the CA and never sets `unsafeSkipCAVerification`. See [Configuration](../configuration).

### A control-plane join cannot decrypt the certificates

The certificate key must match the certificates uploaded to the `kubeadm-certs` Secret, and that upload expires after two hours. Mint control-plane material with `mint-join --role controlplane`, which re-uploads under a fresh key, just before booting the node, and never reuse a key. See [Creating a cluster](../creating-a-cluster).

### The version pin does not match the image

`clusterConfiguration.kubernetesVersion` has to be inside the supported window and has to match the kubeadm binary in the image. A mismatch fails fast by design. Use the image tag for the minor you want, or change the pin.

### An upgrade did not run, or was refused

Nothing happening after you booted a newer image means you did not bump `kubernetesVersion`. A newer binary alone is a no-op by design.

`refuse-upgrade` in the reconcile log means the pin is a downgrade, a skip-level target such as 1.35 to 1.37, or outside the window. One minor at a time. See [Upgrades](../upgrades).

### kubeadm pulls images the image already bundles

Check the import summary line first:

```bash
sudo grep 'image-import:' /var/log/provider-kubernetes-image-import.log | tail -n 20
sudo /system/providers/agent-provider-kubernetes import-images --verify-only
```

A refused image logs its own line with the tarball, the reference and a reason. Common reasons are `dir-unsafe` and `anchor-unsafe` (a directory on the path, or the provider binary used as the reference, is not root-owned or is group or other writable), `lock-missing` and `lock-invalid`, the per-file checks `missing`, `symlink`, `not-regular`, `owner`, `mode` and `size`, `device` (the file is not on the same filesystem as the provider binary, for instance because something is bind-mounted over the bundle directory), `tar-structure`, `manifest` and `config-digest` (the archive is not what it claims), and `ctr-failed` or `deadline`.

Nothing on a supported image should be refused. A refusal means the booted OS image or its mounts were changed. See [Air-gapped installs](../air-gapped).

Note that the bundle covers the default `imageRepository`, `registry.k8s.io`, only. With a custom `imageRepository` kubeadm looks for different references and pulls them.

### A binary installed under /usr/local or /opt is not found

containerd and the kubelet run with `PATH=/usr/sbin:/usr/bin:/sbin:/bin`, set by image-owned drop-ins. `/usr/local/bin`, `/usr/local/sbin` and `/opt/containerd/bin` are not searched, and containerd's image verifier and NRI plugin directories point into `/usr/lib` instead of `/opt`. So a binary installed the upstream way, such as the `containerd-shim-runc-v2` that containerd release tarballs put in `/usr/local/bin`, is ignored, and the daemon reports it as not found.

The provider itself runs `kubeadm`, `kubectl`, `ctr`, `systemctl` and `etcdctl` only from `/usr/bin` and never searches `PATH`. A derived image must install them there.

Confirm what is in effect:

```bash
sudo systemctl show -p FragmentPath,DropInPaths,Environment containerd.service
sudo systemd-delta --type=extended /usr/lib/systemd/system
```

Fix it at the source rather than by widening `PATH`. Give an extra runtime an absolute `runtime_path` in `/etc/containerd/config.toml` and install its binaries under `/usr/bin` in a derived image. Install a kubelet helper in a derived image too: `/usr/local` is the persistent partition, so a copy there is invisible to the image build. Put NRI plugins in `/usr/lib/nri/plugins`, or run them as workloads over the NRI socket, which is still enabled. See [Security](../security) for why.

### provider-kubernetes-unit-migrate.service failed

The one-time cleanup that removes unit copies installed into `/etc/systemd/system` by releases before v0.4.0 kept at least one file, which means that file is still overriding the image's unit. The unit fails on purpose so the state is visible.

```bash
sudo journalctl -b -u provider-kubernetes-unit-migrate.service
```

The summary line ends with an outcome: `clean` (nothing to remove), `migrated` (copies removed), `kept-modified` (at least one copy is not what the project shipped, so it was kept), or `failed` (an I/O error, an unsafe path or a failed reload; the run is retried next boot).

Only a file byte-identical to something the project shipped at that exact path is deleted. A kept file is named with a reason: `modified`, `not-regular`, `owner`, `size`, `link-target`, `walk-unsafe`, `race` or `io`. The migration never logs the content, size or hash of a file it keeps, because a unit file can carry proxy credentials in an `Environment=` line.

To clear a `kept-modified`, move your change into a drop-in and delete the full-unit copy:

```bash
sudo systemctl cat kubelet.service
sudo mkdir -p /etc/systemd/system/kubelet.service.d
sudo vi /etc/systemd/system/kubelet.service.d/20-local.conf
sudo rm /etc/systemd/system/kubelet.service
sudo systemctl daemon-reload
sudo systemctl restart provider-kubernetes-unit-migrate.service
```

### A reset left a stale etcd member

See [Creating a cluster](../creating-a-cluster#removing-a-control-plane).

### Disk usage grows under /etc/kubernetes/tmp

kubeadm's per-upgrade etcd data-directory copies. They hold every Secret and share a device with the live etcd. Delete the older ones once an upgrade is verified. See [Upgrades](../upgrades).

## Resetting a node

Recovery is always explicit. The provider never re-bootstraps or re-joins a node on its own, in any state.

Kairos's cluster-reset event drives the provider's reset path. It runs a bounded `kubeadm reset`, removes the authoritative artifacts under `cluster_root_path` (`etc/kubernetes` including the PKI, `var/lib/kubelet`, `var/lib/etcd`), and sweeps `/run` for leftover transient credential files, so the next boot converges from a clean state. `cluster_root_path` is validated as absolute and free of traversal, and symlinked artifacts are refused rather than followed, so a reset cannot be tricked into wiping a bind-mount target.

On a stacked-etcd control plane the etcd member also has to be deregistered. If the cluster is reachable, `kubeadm reset` does it. If it is not, the member is orphaned and you deregister it from a surviving control plane: see [Creating a cluster](../creating-a-cluster#removing-a-control-plane).

The provider's pre-upgrade etcd snapshot directory is deliberately not removed by a reset.

## Filing an issue

Include the role and `config:` of the affected node with `cluster_token` and any token or certificate key redacted, the tail of the reconcile log, `kubectl get nodes -o wide`, and the image tag and Kubernetes version. Name the release or commit you are on. Issues go to the [provider repository](https://github.com/kairos-io/provider-kubernetes/issues).
