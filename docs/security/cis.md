---
title: "CIS Control Matrix"
sidebar_label: "CIS Benchmark Status"
sidebar_position: 1
date: 2026-09-15
description: "CIS Kubernetes Benchmark v1.9.0 and CIS Distribution Independent Linux L1 control implementation status in Kairos"
---

# CIS Control Implementation Matrix

This page documents the implementation status of CIS (Center for Internet Security) benchmark controls in Kairos. Control IDs and descriptions are sourced from two permissively-licensed projects:

- **CIS Kubernetes Benchmark v1.9.0**: sourced from [`aquasecurity/kube-bench`](https://github.com/aquasecurity/kube-bench) (`cfg/cis-1.9/`, Apache-2.0)
- **CIS Distribution Independent Linux L1**: sourced from [`dev-sec/linux-baseline`](https://github.com/dev-sec/linux-baseline) (Apache-2.0)

**Important sourcing notes**: kube-bench's `cfg/cis-1.9/` files carry no CIS profile-level field, so the 130 Kubernetes controls listed below represent the complete v1.9.0 set rather than a derived Level 1 subset—the Level 1 split is not guessed at. Additionally, `dev-sec/linux-baseline` carries no CIS control-ID tags at all, so the Linux table is keyed on devsec control IDs and maps to CIS numbering in only three cases (os-10, package-09, os-09), which is what "(none in source)" means in the CIS Reference column.

CIS's own benchmark PDF text is not reproduced here. Sourcing details, caveats, and methodology are in the [research notes](https://github.com/kairos-io/kairos-docs/tree/main/docs/security/_research) kept alongside this page in the repository.

## CIS Kubernetes Benchmark v1.9.0

### Overview

Kairos is an OS image builder and does not include a Kubernetes control plane. It installs k3s or k0s from those projects' own installers and applies no Kairos-owned CIS-specific flags. The Kubernetes benchmark is therefore operator territory: hardening is configured where the operator configures the distribution, following k3s's or k0s's own CIS hardening guide.

Kairos itself does not set `protect-kernel-defaults`, `tls-cipher-suites`, `anonymous-auth`, `audit-log`, `secrets-encryption`, or other CIS-relevant flags. Every flag-shaped control is reachable only through the operator's `k3s.args` or `k0s.args` configuration, which Kairos appends verbatim without modification.

### Control Summary by Section

The following table summarizes CIS v1.9.0 coverage by section. Sections 1.x, 2 and 4.x are reachable through the arguments the operator passes to k3s or k0s. Sections 3.x and 5.x are cluster-level policy—RBAC, Pod Security Admission, NetworkPolicy, audit policy—applied after the cluster bootstraps, not flags. The file permission and ownership controls 1.1.9–1.1.12, 1.1.19–1.1.21 and 4.1.3–4.1.10 target paths Kairos persists but never sets a mode or owner on, so those could be addressed in the image and currently are not.

| CIS Section | Control IDs | Controls | Implemented | Not Applicable | Open | Path Forward |
|---|---|---|---|---|---|---|
| 1.1 Control Plane Node Configuration Files | 1.1.1–1.1.21 | 21 | 0 | 14 | 7 | All 7 open controls are file mode and ownership checks (1.1.9–1.1.12, 1.1.19–1.1.21) on paths Kairos persists; they need a mode or owner set in the image, not a k3s or k0s argument |
| 1.2 API Server | 1.2.1–1.2.29 | 29 | 0 | 0 | 29 | k3s/k0s distro configuration via operator `k3s.args` or `k0s.args` |
| 1.3 Controller Manager | 1.3.1–1.3.7 | 7 | 0 | 0 | 7 | k3s/k0s distro configuration via operator `k3s.args` or `k0s.args` |
| 1.4 Scheduler | 1.4.1–1.4.2 | 2 | 0 | 0 | 2 | k3s/k0s distro configuration via operator `k3s.args` or `k0s.args` |
| 2 Etcd Node Configuration | 2.1–2.7 | 7 | 0 | 0 | 7 | k3s/k0s distro configuration via operator `k3s.args` or `k0s.args` |
| 3.1 Authentication and Authorization | 3.1.1–3.1.3 | 3 | 0 | 0 | 3 | Cluster-level policy applied post-bootstrap |
| 3.2 Logging | 3.2.1–3.2.2 | 2 | 0 | 0 | 2 | Cluster-level policy applied post-bootstrap |
| 4.1 Worker Node Configuration Files | 4.1.1–4.1.10 | 10 | 0 | 2 | 8 | All 8 open controls are file mode and ownership checks (4.1.3–4.1.10) on paths Kairos persists; they need a mode or owner set in the image, not a k3s or k0s argument |
| 4.2 Kubelet | 4.2.1–4.2.13 | 13 | 0 | 0 | 13 | k3s/k0s distro configuration via operator `k3s.args` or `k0s.args` |
| 4.3 kube-proxy | 4.3.1 | 1 | 0 | 0 | 1 | k3s/k0s distro configuration via operator `k3s.args` or `k0s.args` |
| 5.1 RBAC and Service Accounts | 5.1.1–5.1.13 | 13 | 0 | 0 | 13 | Cluster-level policy applied post-bootstrap |
| 5.2 Pod Security Standards | 5.2.1–5.2.13 | 13 | 0 | 0 | 13 | Cluster-level policy applied post-bootstrap |
| 5.3 Network Policies and CNI | 5.3.1–5.3.2 | 2 | 0 | 0 | 2 | Cluster-level policy applied post-bootstrap |
| 5.4 Secrets Management | 5.4.1–5.4.2 | 2 | 0 | 0 | 2 | Cluster-level policy applied post-bootstrap |
| 5.5 Extensible Admission Control | 5.5.1 | 1 | 0 | 0 | 1 | Cluster-level policy applied post-bootstrap |
| 5.7 General Policies | 5.7.1–5.7.4 | 4 | 0 | 0 | 4 | Cluster-level policy applied post-bootstrap |
| **Total** | | **130** | **0** | **16** | **114** | |

### Not Applicable Controls

The following 16 controls are not applicable because their target artifacts do not exist on a Kairos node:

**Section 1.1** (Control Plane Node Configuration Files): 1.1.1–1.1.8, 1.1.13–1.1.18
- **Reason**: k3s and k0s do not create kubeadm static pod manifests or kubeadm-style `*.conf` kubeconfigs. These controls reference `/etc/kubernetes/manifests` files and kubeadm configuration files that do not exist.

**Section 4.1** (Worker Node Configuration Files): 4.1.1–4.1.2
- **Reason**: k3s and k0s run the kubelet in-process from the server/agent supervisor; there is no standalone kubelet systemd unit or drop-in file to inspect.

Open controls addressing Kubernetes configuration are trackable under [kairos-io/kairos#4628](https://github.com/kairos-io/kairos/issues/4628).

---

## CIS Distribution Independent Linux L1

### Status Tally

| Status | Count |
|---|---|
| Implemented (pending [kairos-io/kairos#4650](https://github.com/kairos-io/kairos/pull/4650)) | 3 |
| Not Applicable | 4 |
| Open | 52 |

### Notes on Unmerged Implementation

Three controls below are marked **"Implemented (pending kairos-io/kairos#4650)"** because their implementation exists on branch `triage/4626-cis-l1-initial-setup` but has not yet merged into the upstream main branch. These controls are:

- **os-02**: Check owner and permissions for `/etc/shadow`
- **os-03**: Check owner and permissions for `/etc/passwd`
- **os-10**: CIS: Disable unused filesystems

No released Kairos image yet contains these changes. This page will be updated when [PR #4650](https://github.com/kairos-io/kairos/pull/4650) merges.

### Not Applicable Controls

**sysctl-01** (IPv4 Forwarding) and **sysctl-19** (IPv6 Forwarding)
- **Reason**: Kubernetes nodes must forward pod traffic; `net.ipv4.ip_forward=0` and `net.ipv6.conf.all.forwarding=0` are incompatible with Kairos's intended use as a Kubernetes node OS.

**sysctl-29** (Disable loading kernel modules)
- **Reason**: Kairos loads kernel modules throughout the boot sequence: storage, virtio, squashfs, `tpm`, and `dm_crypt` in the initramfs; CNI modules after cluster bootstrap. Latching module loading off would break boot.

**os-12** (Detect vulnerabilities in the cpu-vulnerability-directory)
- **Reason**: A property of the host CPU's microcode and the base image's kernel mitigations, not configurable by the image builder.

### Permanent Exclusions: squashfs and vfat

**os-10 (Filesystem Modules)** is implemented for six of eight filesystems; two are permanently excluded:

- **squashfs**: Required. Kairos ships `rootfs.squashfs` (loop-mounted by initramfs) and `recovery.squashfs` (mounted by GRUB).
- **FAT/vfat**: Required. The EFI system partition uses vfat; blocking it breaks EFI and UKI boot.

### Controls

| devsec ID | Intent | CIS Reference | Status | Evidence / Justification | Issue |
|---|---|---|---|---|---|
| `os-01` | Trusted hosts login | (none in source) | Open | `/etc/hosts.equiv` is never created or asserted by Kairos; `IgnoreRhosts yes` is configured in sshd but the file itself is operator-chosen via base image. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-02` | Check owner and permissions for /etc/shadow | (none in source) | Implemented (pending [#4650](https://github.com/kairos-io/kairos/pull/4650)) | Mode tightened: `kairos-init/pkg/stages/steps_cis_hardening.go:39-40` (`/etc/shadow` → `u-x,g-wx,o-rwx`; `/etc/gshadow` → same). **Partial**: mode only; ownership deliberately not forced due to distribution differences in `unix_chkpwd` group read requirements. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-03` | Check owner and permissions for /etc/passwd | (none in source) | Implemented (pending [#4650](https://github.com/kairos-io/kairos/pull/4650)) | Mode tightened: `steps_cis_hardening.go:37-38` (`/etc/passwd` → `u-x,go-wx`; `/etc/group` → same). Backups guarded on existence. **Partial**: mode only, not ownership. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-03b` | Check passwords hashes in /etc/passwd | (none in source) | Open | Kairos writes no password hash to `/etc/passwd`: `kairos` user has `passwd: "!"` via yip, root locked with `passwd -l`. De facto satisfied but not checked. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-04` | Dot in PATH variable | (none in source) | Open | `sudo` path is hardened; interactive login `PATH` and `/etc/profile.d` are operator-chosen. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-05` | Check login.defs | (none in source) | Open | `/etc/login.defs` is not touched by Kairos; operator-chosen via base image. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-05b` | Check login.defs - RedHat specific | (none in source) | Open | `/etc/login.defs` is not touched by Kairos; operator-chosen via base image. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-06` | Check for SUID/ SGID blacklist | (none in source) | Open | No SUID/SGID pruning in Kairos; inherited from base image. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-07` | Unique uid and gid | (none in source) | Open | Kairos adds fixed `admin` (gid 900) and `kairos` users; no validation of base image's existing passwd/group for duplicate IDs. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-09` | Check for .rhosts and .netrc file | CIS Benchmark 9.2.9-10 (older numbering) | Open | **Partial**: `IgnoreRhosts yes` and `HostbasedAuthentication no` configured in sshd; files themselves not pruned. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-10` | CIS: Disable unused filesystems | CIS DIL 1.1.1.x | Implemented (pending [#4650](https://github.com/kairos-io/kairos/pull/4650)) | Six of eight filesystems blocklisted: cramfs, freevxfs, jffs2, hfs, hfsplus, udf. **Permanently excluded**: squashfs (required for rootfs), vfat (required for EFI boot). Applied via `kairos-init/pkg/bundled/cis.go:25-30` → `/etc/modprobe.d/cis-blocklist.conf`. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-11` | Protect log-directory | (none in source) | Open | `/var/log` persisted but owner/mode never set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-12` | Detect vulnerabilities in the cpu-vulnerability-directory | (none in source) | Not applicable | CPU microcode and kernel mitigations; not configurable by image builder. |  |
| `os-13` | Protect cron directories and files | (none in source) | Open | `cron` installed on Debian-family bases but owner/mode/allow files never set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-14` | Check mountpoints for noexec mount options | (none in source) | Open | **Partial**: Initramfs and early-boot mounts have `noexec,nosuid,nodev`; immucore's overlay RW paths do not. Several target mountpoints not separate filesystems. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-15` | Check mountpoints for nosuid mount options | (none in source) | Open | **Partial**: Initramfs and early-boot mounts configured; runtime overlay RW paths not separately mounted. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-16` | Check mountpoints for nodev mount options | (none in source) | Open | **Partial**: Initramfs and early-boot mounts configured; runtime overlay RW paths not separately mounted. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-01` | Do not run deprecated inetd or xinetd | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-02` | Do not install Telnet server | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-03` | Do not install rsh server | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-05` | Do not install ypserv server (NIS) | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-06` | Do not install tftp server | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-08` | Install auditd | (none in source) | Open | **Partial**: RedHat-family only, with standing question on necessity. Debian/Alpine/SUSE have no auditd; nothing enables it. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-09` | CIS: Additional process hardening | CIS DIL 1.5.4 | Open | Never installed and never explicitly disabled. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-01` | IPv4 Forwarding | (none in source) | Not applicable | Kubernetes nodes must forward; incompatible with Kairos's purpose. |  |
| `sysctl-02` | Reverse path filtering | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-03` | ICMP ignore bogus error responses | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-04` | ICMP echo ignore broadcasts | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-05` | ICMP ratelimit | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-06` | ICMP ratemask | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-07` | TCP timestamps | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-08` | ARP ignore | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-09` | ARP announce | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-10` | TCP RFC1337 Protect Against TCP Time-Wait | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-11` | Protection against SYN flood attacks | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-12` | Shared Media IP Architecture | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-13` | Disable Source Routing | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-14` | Disable acceptance of all IPv4 redirected packets | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-15` | Disable acceptance of all secure redirected packets | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-16` | Disable sending of redirects packets | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-17` | Disable log martians | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-19` | IPv6 Forwarding | (none in source) | Not applicable | Kubernetes nodes must forward; incompatible with Kairos's purpose. |  |
| `sysctl-20` | Disable acceptance of all IPv6 redirected packets | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-21` | Disable acceptance of IPv6 router solicitations messages | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-22` | Disable Accept Router Preference from router advertisement | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-23` | Disable learning Prefix Information from router advertisement | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-24` | Disable learning Hop limit from router advertisement | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-25` | Disable the system's acceptance of router advertisement | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-26` | Disable IPv6 autoconfiguration | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-27` | Disable neighbor solicitations to send out per address | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-28` | Assign one global unicast IPv6 addresses to each interface | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-29` | Disable loading kernel modules | (none in source) | Not applicable | Boot loads modules throughout initramfs and CNI stage; incompatible with Kairos. |  |
| `sysctl-30` | Magic SysRq | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-31a` | Secure Core Dumps - dump settings | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-31b` | Secure Core Dumps - dump path | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-32` | kernel.randomize_va_space | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-33` | CPU No execution Flag or Kernel ExecShield | (none in source) | Open | CPU/kernel capability; not configurable at image build time. Listed as Open (not Not-applicable) because Kairos could in principle assert it and does not. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-34` | Ensure links are protected | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-35` | Restrict ptrace attach to privileged users | (none in source) | Open | No sysctl hardening; only throughput-tuning sysctls set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |

---

## Next Steps

- **Kubernetes hardening**: Configure k3s or k0s with CIS-compliant settings at cluster deployment time. Refer to the CIS Kubernetes Benchmark v1.9.0 and your Kubernetes distro's CIS profile documentation.
- **Linux baseline hardening**: Track progress on Linux controls via [kairos-io/kairos#4628](https://github.com/kairos-io/kairos/issues/4628).
- **Unmerged implementation**: Monitor [PR #4650](https://github.com/kairos-io/kairos/pull/4650) for Linux CIS L1 initial setup merge status.
