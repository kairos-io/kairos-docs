---
title: "CIS Control Matrix"
sidebar_label: "CIS Benchmark Status"
sidebar_position: 1
slug: /security/cis
date: 2026-09-30
description: "CIS Kubernetes Benchmark v1.9.0 and CIS Distribution Independent Linux L1 control implementation status in Kairos"
---

# CIS Control Implementation Matrix

This page documents the implementation status of CIS (Center for Internet Security) benchmark controls in Kairos. Control IDs and descriptions are sourced from two permissively-licensed projects:

- **CIS Kubernetes Benchmark v1.9.0**: sourced from [`aquasecurity/kube-bench`](https://github.com/aquasecurity/kube-bench) (`cfg/cis-1.9/`, Apache-2.0)
- **CIS Distribution Independent Linux L1**: sourced from [`dev-sec/linux-baseline`](https://github.com/dev-sec/linux-baseline) (Apache-2.0)

**Important sourcing notes**: kube-bench's `cfg/cis-1.9/` files carry no CIS profile-level field, so the 130 Kubernetes controls listed below represent the complete v1.9.0 set rather than a derived Level 1 subset; the Level 1 split is not guessed at. Additionally, `dev-sec/linux-baseline` carries no CIS control-ID tags at all, so the Linux table is keyed on devsec control IDs and maps to CIS numbering in only three cases (os-10, package-09, os-09), which is what "(none in source)" means in the CIS Reference column.

CIS's own benchmark PDF text is not reproduced here. Sourcing details, caveats, and methodology are in the [research notes](https://github.com/kairos-io/kairos-docs/tree/main/docs/security/_research) kept alongside this page in the repository.

## CIS Kubernetes Benchmark v1.9.0

### Overview

Kairos is an OS image builder and does not include a Kubernetes control plane. It installs k3s or k0s from those projects' own installers and applies no Kairos-owned CIS-specific flags. The Kubernetes benchmark is therefore operator territory: hardening is configured where the operator configures the distribution, following k3s's or k0s's own CIS hardening guide.

Kairos itself does not set `protect-kernel-defaults`, `tls-cipher-suites`, `anonymous-auth`, `audit-log`, `secrets-encryption`, or other CIS-relevant flags. Every flag-shaped control is reachable only through the operator's `k3s.args` or `k0s.args` configuration, which Kairos appends verbatim without modification.

### Control Summary by Section

The following table summarizes CIS v1.9.0 coverage by section. Sections 1.x, 2 and 4.x are reachable through the arguments the operator passes to k3s or k0s. Sections 3.x and 5.x are cluster-level policy (RBAC, Pod Security Admission, NetworkPolicy, audit policy) applied after the cluster bootstraps, not flags. The file permission and ownership controls 1.1.9–1.1.12, 1.1.19–1.1.21 and 4.1.3–4.1.10 target paths Kairos persists but never sets a mode or owner on, so those could be addressed in the image and currently are not.

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

## CIS Distribution Independent Linux L1 {#linux}

Kairos applies the Linux controls at image build time, in the `cisHardening` step of `kairos-init`. The step runs on every base image Kairos supports, so the same controls are present on Ubuntu, Debian, openSUSE, Rocky, Alpine and Hadron based images, and they are part of the image itself, so they survive an A/B upgrade and a `kairos-agent reset`.

To build an image without them, skip the step:

```bash
kairos-init --skip-steps cisHardening ...
```

### Controls in place {#linux-controls-in-place}

Grouped the way [kairos-io/kairos#4626](https://github.com/kairos-io/kairos/issues/4626) tracks them.

| Area | What Kairos ships | Status |
|---|---|---|
| Filesystem modules (1.1.1.x) | `/etc/modprobe.d/cis-blocklist.conf` makes cramfs, freevxfs, jffs2, hfs, hfsplus and udf unloadable. squashfs and vfat are required for boot and stay loadable. | In place |
| Mandatory access control (1.6) | SELinux enforcing on RHEL-family images. | Not yet. Needs its own follow-up. |
| Warning banner (1.7) | `/etc/issue.net` carries a generic authorized-use banner with no OS or version details. sshd prints it through `Banner /etc/issue.net`. | In place |
| Network parameters (3.x) | `/etc/sysctl.d/99-kairos-cis.conf`: `kernel.randomize_va_space=2`, `tcp_syncookies=1`, source routing and redirects off, IPv6 router advertisements off, and `rp_filter=2`. | In place (see note) |
| Auditing (4.x) | auditd installed and enabled on every base, baseline rules in `/etc/audit/rules.d/50-kairos.rules` (time changes, identity files, network environment, MAC policy, logins, sessions, permission changes, failed access, mounts, deletions, sudoers, kernel modules; each syscall rule paired for 64-bit and 32-bit), rules locked with `-e 2`. immucore bind-mounts `/var/log/audit` from the persistent partition. | In place |
| cron and at (5.1) | `/etc/crontab` 0600; `cron.hourly`, `cron.daily`, `cron.weekly`, `cron.monthly`, `cron.d` 0700; `cron.allow`, `cron.deny`, `at.allow`, `at.deny` 0640. Only paths the base ships are touched. | In place |
| SSH server (5.2) | One drop-in, `/etc/ssh/sshd_config.d/05-kairos-hardening.conf`, owned by kairos-init on every base. See [SSH server](#linux-ssh). | In place |
| Password quality (5.4.1) | `/etc/security/pwquality.conf`: `minlen 14`, one digit, upper, lower and other character each, `difok 4`. | In place, see [PAM wiring](#linux-pam) for Leap |
| Account lockout (5.4.2) | `/etc/security/faillock.conf`: `deny 5`, `unlock_time 900`, `fail_interval 900`, `even_deny_root`. | In place except openSUSE, see [PAM wiring](#linux-pam) |
| Password aging and umask (5.4.1.x, 5.4.5) | `/etc/login.defs`: `PASS_MAX_DAYS 365`, `PASS_MIN_DAYS 1`, `PASS_WARN_AGE 7`, `UMASK 027`, `ENCRYPT_METHOD SHA512`. Tighten only: a base that already ships a stricter value keeps it (Hadron keeps `PASS_MAX_DAYS 60` and `UMASK 077`). Applies to accounts created after install. | In place |
| Time synchronization | systemd-timesyncd on Ubuntu, Debian, openSUSE and Hadron; chronyd on the RHEL family; ntpd on Alpine. Each uses its distribution's default NTP sources. | In place |
| Account database permissions (6.1) | Modes tightened on `/etc/passwd`, `/etc/group`, `/etc/shadow`, `/etc/gshadow` and their `-` backups. Ownership is left as the base ships it. | In place |

**Reverse path filtering.** The benchmark asks for strict mode (`rp_filter=1`). Kairos ships loose mode (`rp_filter=2`), because strict mode drops return traffic on multi-homed nodes and on the asymmetric paths CNI plugins create, which breaks Kubernetes networking. Loose mode still drops packets whose source is not reachable through any interface.

### PAM wiring per base {#linux-pam}

`pwquality.conf` and `faillock.conf` only take effect when `pam_pwquality.so` and `pam_faillock.so` are in the base image's PAM stack. kairos-init wires them with each distribution's own tool, so a later package update does not overwrite the stack.

| Base | pam_pwquality | pam_faillock |
|---|---|---|
| Hadron | Wired in `system-auth` | Wired in `system-auth` |
| Ubuntu, Debian | Wired through the stock `pwquality` pam-auth-update profile (`libpam-pwquality` is installed) | Wired through the `kairos-faillock` and `kairos-faillock-notify` pam-auth-update profiles kairos-init ships |
| Rocky, AlmaLinux, Fedora | Wired, already part of the authselect profile | Wired with `authselect enable-feature with-faillock`, or `authselect select local` (or `minimal`) `with-faillock` when authselect does not manage the stack yet. Without authselect, kairos-init inserts the faillock lines itself. |
| openSUSE Tumbleweed | Wired through `pam-config` (replaces `pam_cracklib`) | Not wired. `pam-config` has no faillock module, and hand-editing the `common-*` files would be overwritten the next time `pam-config` runs. |
| openSUSE Leap 15.6 | Not changed, keeps the default `pam_cracklib` | Not wired |
| Alpine | Not applicable. Alpine images ship no `/etc/pam.d` and PAM is not in the login path. | Not applicable |

### SSH server {#linux-ssh}

`05-kairos-hardening.conf` is the single sshd hardening drop-in on every base. Base images no longer ship their own. sshd uses the first value it reads for each directive, in file name order, so an operator can override a setting with a lower-numbered drop-in such as `01-local.conf`.

- Post-quantum first key exchange (`mlkem768x25519-sha256`, both `sntrup761x25519-sha512` names), AEAD and CTR ciphers, ETM-first MACs, ed25519, ECDSA and RSA-SHA2 host key algorithms.
- `PermitRootLogin prohibit-password`, `PermitEmptyPasswords no`, `PermitUserEnvironment no`, `IgnoreRhosts yes`, `IgnoreUserKnownHosts yes`, `HostbasedAuthentication no`.
- No X11, TCP, agent or tunnel forwarding, no `GatewayPorts`, `Compression no`, `StrictModes yes`.
- `MaxAuthTries 4`, `MaxSessions 10`, `MaxStartups 10:30:60`, `LoginGraceTime 60`, `ClientAliveInterval 600`, `ClientAliveCountMax 1`, `RekeyLimit 1G 1h`.
- `LogLevel VERBOSE`, `SyslogFacility AUTH`, `Banner /etc/issue.net`.

Password authentication is left on so the default user can log in on first boot. Setting `install.ssh_hardening: true` in the cloud config makes `kairos-agent` add a second drop-in at install time that turns off password and keyboard-interactive authentication and requires a public key.

On FIPS images, Hadron adds `02-hadron-fips.conf`. It sorts before `05-kairos-hardening.conf`, so its FIPS-validated `Ciphers`, `MACs`, `KexAlgorithms` and `HostKeyAlgorithms` win. Every other directive still comes from the kairos-init drop-in.

**DevSec ssh-baseline.** Kairos checks the sshd configuration against the [DevSec ssh-baseline](https://github.com/dev-sec/ssh-baseline) in CI. Where CIS or the STIG and DevSec disagree, Kairos follows CIS and the STIG and waives the DevSec control: the post-quantum cipher, key exchange and MAC lists (sshd-01 to sshd-03), the post-quantum host key (sshd-14), `MaxAuthTries 4` (sshd-19), `ClientAliveInterval 600` and `ClientAliveCountMax 1` (sshd-36, sshd-37) and the banner (sshd-46). Each waiver and its reason is in [`tests/assets/ssh-baseline-waivers.yaml`](https://github.com/kairos-io/kairos/blob/master/tests/assets/ssh-baseline-waivers.yaml).

### Status tally against dev-sec/linux-baseline

The table below keeps the devsec control IDs described at the top of this page.

| Status | Count |
|---|---|
| Implemented | 14 |
| Not Applicable | 4 |
| Open | 41 |

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
| `os-02` | Check owner and permissions for /etc/shadow | (none in source) | Implemented | Mode tightened by `steps_cis_hardening.go` (`/etc/shadow` and `/etc/gshadow` to `u-x,g-wx,o-rwx`; backups owner-only). **Partial**: mode only; ownership deliberately not forced because `unix_chkpwd` needs group read on some bases. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-03` | Check owner and permissions for /etc/passwd | (none in source) | Implemented | Mode tightened by `steps_cis_hardening.go` (`/etc/passwd` and `/etc/group` to `u-x,go-wx`; backups guarded on existence). **Partial**: mode only, not ownership. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-03b` | Check passwords hashes in /etc/passwd | (none in source) | Open | Kairos writes no password hash to `/etc/passwd`: `kairos` user has `passwd: "!"` via yip, root locked with `passwd -l`. De facto satisfied but not checked. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-04` | Dot in PATH variable | (none in source) | Open | `sudo` path is hardened; interactive login `PATH` and `/etc/profile.d` are operator-chosen. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-05` | Check login.defs | (none in source) | Implemented | `/etc/login.defs` pinned for `PASS_MAX_DAYS 365`, `PASS_MIN_DAYS 1`, `PASS_WARN_AGE 7`, `UMASK 027`, `ENCRYPT_METHOD SHA512`, tighten-only: a stricter base value is kept. **Partial**: other keys the devsec check reads are left to the base image. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-05b` | Check login.defs - RedHat specific | (none in source) | Open | General `login.defs` keys are pinned (see `os-05`); the RedHat-specific keys this check reads are left to the base image. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-06` | Check for SUID/ SGID blacklist | (none in source) | Open | No SUID/SGID pruning in Kairos; inherited from base image. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-07` | Unique uid and gid | (none in source) | Open | Kairos adds fixed `admin` (gid 900) and `kairos` users; no validation of base image's existing passwd/group for duplicate IDs. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-09` | Check for .rhosts and .netrc file | CIS Benchmark 9.2.9-10 (older numbering) | Open | **Partial**: `IgnoreRhosts yes` and `HostbasedAuthentication no` set in the sshd drop-in; the files themselves are not pruned. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-10` | CIS: Disable unused filesystems | CIS DIL 1.1.1.x | Implemented | Six of eight filesystems blocklisted in `/etc/modprobe.d/cis-blocklist.conf`: cramfs, freevxfs, jffs2, hfs, hfsplus, udf. **Permanently excluded**: squashfs (required for rootfs), vfat (required for EFI boot). | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-11` | Protect log-directory | (none in source) | Open | `/var/log` persisted but owner/mode never set. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-12` | Detect vulnerabilities in the cpu-vulnerability-directory | (none in source) | Not applicable | CPU microcode and kernel mitigations; not configurable by image builder. |  |
| `os-13` | Protect cron directories and files | (none in source) | Implemented | `/etc/crontab` 0600; `cron.hourly`, `cron.daily`, `cron.weekly`, `cron.monthly`, `cron.d` 0700; `cron.allow`, `cron.deny`, `at.allow`, `at.deny` 0640; all root-owned and guarded on the path existing. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `os-14` | Check mountpoints for noexec mount options | (none in source) | Open | **Partial**: Initramfs and early-boot mounts have `noexec,nosuid,nodev`; immucore's overlay RW paths do not. Several target mountpoints not separate filesystems. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-15` | Check mountpoints for nosuid mount options | (none in source) | Open | **Partial**: Initramfs and early-boot mounts configured; runtime overlay RW paths not separately mounted. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `os-16` | Check mountpoints for nodev mount options | (none in source) | Open | **Partial**: Initramfs and early-boot mounts configured; runtime overlay RW paths not separately mounted. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-01` | Do not run deprecated inetd or xinetd | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-02` | Do not install Telnet server | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-03` | Do not install rsh server | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-05` | Do not install ypserv server (NIS) | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-06` | Do not install tftp server | (none in source) | Open | Never installed; absence not asserted by Kairos. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `package-08` | Install auditd | (none in source) | Implemented | `auditd` (Debian family) or `audit` (RHEL, SUSE, Alpine) installed on every base and enabled; baseline rules in `/etc/audit/rules.d/50-kairos.rules`; `/var/log/audit` bind-mounted from the persistent partition by immucore. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `package-09` | CIS: Additional process hardening | CIS DIL 1.5.4 | Open | Never installed and never explicitly disabled. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-01` | IPv4 Forwarding | (none in source) | Not applicable | Kubernetes nodes must forward; incompatible with Kairos's purpose. |  |
| `sysctl-02` | Reverse path filtering | (none in source) | Implemented | `net.ipv4.conf.all.rp_filter` and `default.rp_filter` set to `2` (loose) in `/etc/sysctl.d/99-kairos-cis.conf`. **Partial**: strict mode (`1`) drops traffic on multi-homed and CNI setups, so loose mode is shipped. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-03` | ICMP ignore bogus error responses | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-04` | ICMP echo ignore broadcasts | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-05` | ICMP ratelimit | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-06` | ICMP ratemask | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-07` | TCP timestamps | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-08` | ARP ignore | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-09` | ARP announce | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-10` | TCP RFC1337 Protect Against TCP Time-Wait | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-11` | Protection against SYN flood attacks | (none in source) | Implemented | `net.ipv4.tcp_syncookies = 1` in `99-kairos-cis.conf`. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-12` | Shared Media IP Architecture | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-13` | Disable Source Routing | (none in source) | Implemented | `net.ipv4.conf.all.accept_source_route = 0` in `99-kairos-cis.conf`. **Partial**: `default` and IPv6 keys not set. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-14` | Disable acceptance of all IPv4 redirected packets | (none in source) | Implemented | `net.ipv4.conf.all.accept_redirects = 0` in `99-kairos-cis.conf`. **Partial**: `default` key not set. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-15` | Disable acceptance of all secure redirected packets | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-16` | Disable sending of redirects packets | (none in source) | Implemented | `net.ipv4.conf.all.send_redirects = 0` in `99-kairos-cis.conf`. **Partial**: `default` key not set. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-17` | Disable log martians | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-19` | IPv6 Forwarding | (none in source) | Not applicable | Kubernetes nodes must forward; incompatible with Kairos's purpose. |  |
| `sysctl-20` | Disable acceptance of all IPv6 redirected packets | (none in source) | Implemented | `net.ipv6.conf.all.accept_redirects = 0` in `99-kairos-cis.conf`. **Partial**: `default` key not set. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-21` | Disable acceptance of IPv6 router solicitations messages | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-22` | Disable Accept Router Preference from router advertisement | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-23` | Disable learning Prefix Information from router advertisement | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-24` | Disable learning Hop limit from router advertisement | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-25` | Disable the system's acceptance of router advertisement | (none in source) | Implemented | `net.ipv6.conf.all.accept_ra = 0` in `99-kairos-cis.conf`. **Partial**: `default` key not set. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-26` | Disable IPv6 autoconfiguration | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-27` | Disable neighbor solicitations to send out per address | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-28` | Assign one global unicast IPv6 addresses to each interface | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-29` | Disable loading kernel modules | (none in source) | Not applicable | Boot loads modules throughout initramfs and CNI stage; incompatible with Kairos. |  |
| `sysctl-30` | Magic SysRq | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-31a` | Secure Core Dumps - dump settings | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-31b` | Secure Core Dumps - dump path | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-32` | kernel.randomize_va_space | (none in source) | Implemented | `kernel.randomize_va_space = 2` in `99-kairos-cis.conf`. | [#4626](https://github.com/kairos-io/kairos/issues/4626) |
| `sysctl-33` | CPU No execution Flag or Kernel ExecShield | (none in source) | Open | CPU/kernel capability; not configurable at image build time. Listed as Open (not Not-applicable) because Kairos could in principle assert it and does not. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-34` | Ensure links are protected | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |
| `sysctl-35` | Restrict ptrace attach to privileged users | (none in source) | Open | Not set by `99-kairos-cis.conf`. | [#4628](https://github.com/kairos-io/kairos/issues/4628) |


---

## Next Steps

- **Kubernetes hardening**: Configure k3s or k0s with CIS-compliant settings at cluster deployment time. Refer to the CIS Kubernetes Benchmark v1.9.0 and your Kubernetes distro's CIS profile documentation.
- **Linux baseline hardening**: The remaining Linux work (SELinux enforcing on RHEL, pam_faillock on openSUSE, and a CI scan that fails on regression) is tracked in [kairos-io/kairos#4626](https://github.com/kairos-io/kairos/issues/4626). The control matrix itself is tracked in [kairos-io/kairos#4628](https://github.com/kairos-io/kairos/issues/4628).
