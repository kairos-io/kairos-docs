---
title: "Security model"
linkTitle: "Security"
weight: 9
description: What the provider protects, the blast radius of each secret, and what the hardening deliberately does not do.
sidebar_position: 9
---

This page is the trust model, stated as plainly as the provider's own documentation states it. The short version first, because it decides how you read the rest:

None of the hardening described below is a boundary against an actor who already has root on the node. Kairos keeps every persistent path under `/usr/local`, as bind mounts out of `/usr/local/.state`, so whoever can write there can already write `/etc/systemd`, `/opt`, `/var/lib/kubelet` and `/etc/kubernetes`. What these measures remove is name-based and accidental substitution, and state that outlives the image it came from.

## The secrets, and what each one is worth

### cluster_token is not key material

`cluster_token` is a low-trust correlation value. The provider derives no credential from it. There is no hash of it anywhere in the code; kubeadm's own generators produce every token and key.

It is rejected if it is empty or shorter than 16 characters, and a one-time warning is logged below roughly 128 bits of estimated entropy. It is never logged. A leaked `cluster_token` does not by itself grant cluster access. Keep it confidential regardless.

### A worker join bundle is bounded and low value

Worker joins use a bootstrap token with a bounded TTL, one hour by default, plus a CA SPKI pin. Within that TTL a leaked worker token lets someone join one node as a `system:node` identity. That is the whole blast radius.

CA pinning is mandatory and enforced by construction. The provider refuses to emit a token-discovery join config without a CA anchor and never sets `unsafeSkipCAVerification`. For an externally managed control plane you supply the anchor yourself, as a hash, as `ca_certs` in PEM form, or as a CA-embedded discovery file. Supply both a hash and a PEM and they are cross-validated, with a mismatch failing loudly.

### A control-plane join bundle is a cluster root credential

A control-plane join additionally needs a `certificateKey` that decrypts the cluster PKI uploaded to the `kubeadm-certs` Secret, including the CA private key. Anyone holding that key, a live token and reachability of the API server can obtain the CA key and mint a credential for any identity. Treat it as a root credential for the whole cluster, because that is what it is.

What the provider enforces around it: the key is minted fresh for each control-plane join, never reused and never persisted by the provider. It flows only through a 0600 file on tmpfs under `/run`, is consumed through kubeadm's `--config`, and is shredded as soon as the kubeadm process returns. It never appears on a command line and is never logged; kubeadm's stderr is sanitized at the error boundary, and the structs that carry it redact themselves. The upstream two-hour expiry on the `kubeadm-certs` Secret is preserved and never set to zero, so a leaked key is worthless once the Secret self-deletes.

What is yours: deliver control-plane material over a confidential, integrity-protected channel, fresh per node, just before that node boots. Do not store, log or commit a rendered control-plane cloud-config, and do not leave it on the joined node's persistent storage.

### There is no node attestation

The provider cannot verify that the node receiving join material is the node you meant to send it to. The delivery channel is the trust boundary. For control-plane material, a compromised channel means full cluster takeover, not one rogue worker. TPM2 node attestation is the designated future hardening; it is not here today.

## Never clobber an existing cluster

A node configured `role: init` against an endpoint where a control plane already answers is refused, with a loud terminal error pointing at `role: controlplane`, rather than running `kubeadm init` and destroying what is there. This protects clusters the provider bootstrapped and clusters it did not equally.

## Secrets at rest

The provider persists no bootstrap secrets of its own. A control-plane node still holds full-cluster secrets at rest, all on the persistent partition:

| Artifact | Location | Notes |
|----------|----------|-------|
| The kubeadm PKI, including the CA private keys | `/etc/kubernetes/pki` | 0600 root:root. |
| kubeconfigs with embedded client keys | `/etc/kubernetes/*.conf` | `admin.conf` is cluster-admin. |
| Live etcd data, so every Secret | `/var/lib/etcd` | |
| kubeadm's etcd data-directory copies | `/etc/kubernetes/tmp/kubeadm-backup-etcd-*` | Written by `kubeadm upgrade` on every stacked control plane, regardless of encryption, and kept until you delete them or reset. |
| The provider's pre-upgrade etcd snapshot | `/usr/local/provider-kubernetes/etcd-backup/` | Written only onto dm-crypt. Kept until the next upgrade's snapshot. Not removed by a reset. |

All of this is plaintext on disk unless the persistent partition is encrypted. For production, [kcrypt TPM2 encryption](/docs/advanced/partition_encryption/) of the persistent partition on control-plane nodes is a requirement, not a suggestion. Be honest about what the provider does here: it never hard-fails on missing encryption, and it does not yet emit a general runtime warning when it cannot confirm encryption. The one place it checks is the pre-upgrade etcd snapshot, which it refuses to write unless the target directory is on dm-crypt. See [Upgrades](../upgrades).

When you decommission a control plane, or rotate credentials after an incident, delete the snapshot directory and any `kubeadm-backup-etcd-*` copies, or wipe the disk. They hold Secrets and keys you have since deleted or rotated in the live cluster.

`/run` must be tmpfs, and it is on every supported Kairos image. That is load-bearing for control-plane joins, because the transient config there decrypts the CA key.

## Exec hygiene

Every tool the provider runs is an absolute path in the booted image, started with an environment the provider builds itself. Nothing is looked up on `PATH`, and nothing else is inherited from the provider's own environment.

| Tool | Path | Environment |
|------|------|-------------|
| kubeadm | `/usr/bin/kubeadm` | `PATH=/usr/sbin:/usr/bin:/sbin:/bin` plus the proxy variables |
| kubectl | `/usr/bin/kubectl` | A tmpfs discovery cache, kuberc disabled, plus the proxy variables |
| ctr | `/usr/bin/ctr` | empty |
| systemctl | `/usr/bin/systemctl` | empty |
| etcdctl | `/usr/bin/etcdctl` | empty |

This matters on Kairos specifically. `/usr/local` is the persistent partition and comes before `/usr/bin` in the default `PATH`, so a binary placed in `/usr/local/bin`, by an operator, a sample script, or anyone with a single root write, would otherwise run instead of the bundled tool and survive every image upgrade. Inherited variables could also change what a tool does: `SYSTEMD_OFFLINE=1` turns `systemctl restart kubelet` into a successful no-op, `CONTAINERD_ADDRESS` sends the image import to another socket, a kuberc file injects kubectl flags such as `--server`, and `GODEBUG` or `SSL_CERT_FILE` change TLS behavior.

Only `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY`, in both cases, are passed through. `KUBECONFIG`, `HOME`, `GODEBUG`, `SSL_CERT_FILE`, `SSL_CERT_DIR` and any `KUBEADM_*`, `KUBERC`, `SYSTEMD_*` or `CONTAINERD_*` variable are not. A derived image must install these tools at `/usr/bin`, or the provider fails loudly, naming the tool and the path.

containerd and the kubelet are started by systemd, not by the provider, and they resolve helpers by name. The image ships drop-ins that set the same `PATH` for both, takes the containerd shim and runc by absolute path in containerd's configuration, and points containerd's image verifier and NRI plugin directories at `/usr/lib` rather than the persistent `/opt`. Those directories ship empty; NRI itself stays enabled, so plugins that connect over its socket keep working.

One `/opt` path is not closed, because containerd offers no setting for it. Its CRI pod-sandbox code calls the deprecated NRI v0.1 client, which appends `/opt/nri/bin` to containerd's own `PATH`. Because it is appended and never prepended it cannot shadow a binary the image ships; it can only supply a name the image does not have. Treat `/opt/nri/bin` as a root-exec input on the node.

## Unit files belong to the image

The units the provider owns live in `/usr/lib/systemd/system`, which is part of the booted image and is replaced wholesale by every A/B upgrade. Earlier releases installed them into `/etc/systemd/system`, a persistent bind mount that immucore refreshes with `rsync --update`: a copy there was replaced only when the new build's mtime happened to be newer, survived a rollback, was never deleted, and made `systemctl mask` fail while it existed.

The one-time cleanup that removes those copies deletes only a file that is byte-identical to something this project shipped at that exact path. It works from a fixed list of paths and a frozen set of hashes, never a glob, and walks each path component without following symlinks. Anything else is kept and named in the journal with a reason, and the unit then fails, so a copy still shadowing an image unit shows up in `systemctl --failed` rather than silently.

This is an integrity measure, not a privilege boundary. Every unit directory that outranks `/usr/lib/systemd/system` is persistent and root-writable, so anyone with root can still override any of these units, and the cleanup is deliberately conservative enough that it never deletes such an override. What it fixes is the accident: a runtime or helper installed under `/usr/local` by following upstream instructions used to silently replace a root component of the node and survive every upgrade, which meant a fix delivered in a new image never took effect. See [Upgrades](../upgrades).

## Supply chain

Downloaded binaries (kubeadm, kubectl, crictl, runc, the CNI plugins) are pinned and checksum-verified against the publisher's HTTPS-served checksums during the image build. kubelet and containerd are built fully static from source, cloned at the version tag and pinned to the expected commit SHA, because the base is musl and the official binaries cannot exec there.

Control-plane images are resolved to digests from the bundled kubeadm's own image list, cosign-verified against the Kubernetes release signing identity where upstream signs them, and pulled by that digest. `pause`, `etcd` and `coredns` must verify or the build fails. `images.lock` records each digest and whether it verified. `etcdctl` and `etcdutl` are extracted from that same verified etcd image rather than downloaded separately, so they match the etcd version kubeadm deploys.

Released images and binaries carry keyless SLSA build provenance and CycloneDX SBOM attestations. Verify them with the GitHub CLI:

```bash
digest=$(docker buildx imagetools inspect \
  ghcr.io/kairos-io/provider-kubernetes:v0.4.0-k8s1.37 \
  --format '{{.Manifest.Digest}}')
gh attestation verify \
  oci://ghcr.io/kairos-io/provider-kubernetes@${digest} \
  --repo kairos-io/provider-kubernetes
```

Each image also carries an attestation of the control-plane images it bundled: which images, by digest, and whether each was cosign-verified upstream or digest-pinned only. It uses a custom predicate type, so select it explicitly:

```bash
gh attestation verify \
  oci://ghcr.io/kairos-io/provider-kubernetes@${digest} \
  --repo kairos-io/provider-kubernetes \
  --predicate-type https://kairos.io/attestations/bundled-control-plane-images/v1
```

## What this model does not cover

Read this part as carefully as the rest.

It is not a boundary against root. Everything above assumes the persistent partition has not been written by a hostile hand. An actor who already has root, or a hostPath-capable workload, has equivalent or greater access to every path involved.

The daemon settings are overridable by anyone with root. systemd reads unit fragments and drop-ins from `/etc/systemd/system`, `/etc/systemd/system.control`, `/run/systemd/system` and `/usr/local/lib/systemd/system`, all of which outrank `/usr/lib`; an activated systemd-sysext can overlay `/usr/lib` itself; and an `EnvironmentFile=` outranks an `Environment=`, so a `PATH` line in the persistent `/var/lib/kubelet/kubeadm-flags.env` wins over the drop-in.

The exec hygiene covers the provider's own commands. Kairos itself runs yip stage commands through an `sh` found on `PATH`, and plugin discovery scans `PATH`. The provider removes this for what it executes, and nothing more.

Persistent inputs that run as root by design are unchanged and out of scope: `/etc/kubernetes/manifests` for static pods, `/var/lib/kubelet`, `/etc/cni/net.d` and `/opt/cni/bin`, `/etc/modprobe.d`, the FlexVolume directory, `/var/lib/extensions` and `/var/lib/confexts`, and `/etc/ssl/certs`.

Booting a new image does not make a tampered node known-good. It replaces `/usr` and the image-owned units and leaves every persistent path above exactly as it was.

The cluster-config directory the provider creates on a UKI node is not a boundary either. [Trusted boot](../trusted-boot) states precisely what its mode does and does not buy, and lists two residual risks that the fix does not close and cannot close from here.

When a kubeadm run hits its deadline and is killed, a helper it started, for example the copy of the etcd data directory during an upgrade, can keep running. The provider stops waiting for it after five seconds.
