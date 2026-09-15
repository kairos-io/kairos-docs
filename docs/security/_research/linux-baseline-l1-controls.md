# CIS Distribution Independent Linux L1 - control inventory and Kairos status

Raw research material for kairos-io/kairos#4628. Not a published page; see `README.md` in this directory.

## Where the control list comes from

[`dev-sec/linux-baseline`](https://github.com/dev-sec/linux-baseline) (Apache-2.0), branch
`master`, fetched 2026-09-15. It is an InSpec profile, so each control has an `id`, a
`title`, a `desc` and an `impact`.

| File | Controls |
|---|---|
| `controls/os_spec.rb` | 17 |
| `controls/package_spec.rb` | 7 |
| `controls/sysctl_spec.rb` | 35 |
| **total** | **59** |

CIS's own benchmark PDF is not reproduced here. The `Intent` column is devsec's own
Apache-2.0 `title` verbatim, kept as a stable identifier back to the source `.rb` file; the
longer `desc` fed the status reasoning rather than the table. As with the Kubernetes table,
whoever composes the page should reword these in Kairos' voice.

## Caveat on control IDs - read this before trusting any mapping

**dev-sec/linux-baseline contains no CIS control-ID tags.** `grep -n tag controls/*.rb`
across all three files returns nothing: not one control carries InSpec `tag` metadata, let
alone a CIS reference. The task brief anticipated partial tagging; the reality is that
there is none.

Three of the 59 controls mention a CIS number inside their free-text `desc`, and that is
the entire set of derivable mappings:

| devsec control | CIS reference in `desc` |
|---|---|
| `os-10` | `1.1.1 Ensure mounting of cramfs, freevxfs, jffs2, hfs, hfsplus, squashfs, udf, FAT` |
| `package-09` | `1.5.4 Ensure prelink is disabled` |
| `os-09` | `CIS Benchmark 9.2.9-10` - older CIS numbering, no clean v2.0.0 equivalent |

The only two controls whose *title* carries a `CIS:` prefix are `os-10` and `package-09`,
i.e. the same ones - there is no fourth mapping hiding in the titles.

So this table is **keyed on dev-sec control IDs, not on CIS control IDs**, and it does not
invent the latter. Per the brief, an honestly-sourced short list beats a padded guessed one.

All 59 controls carry `impact 1.0` in the profile. That is InSpec severity, **not** a CIS
profile level, and must not be presented as one. It does mean the profile offers no
internal axis on which to narrow to Level 1, so the whole profile is listed.

## The authoritative CIS DIL sections Kairos actually names

Separately from the devsec list, three CIS DIL v2.0.0 L1 sections are cited *by the Kairos
code itself*, which makes them the only rows in this research where the CIS ID is
first-party rather than inferred:

| CIS DIL v2.0.0 L1 | What Kairos does | Citation |
|---|---|---|
| 1.1.1.1 - 1.1.1.6 (filesystem modules unavailable) | `install <mod> /bin/false` drop-in at `/etc/modprobe.d/cis-blocklist.conf` for cramfs, freevxfs, jffs2, hfs, hfsplus, udf | `kairos-init/pkg/bundled/cis.go:8-32`, wired at `kairos-init/pkg/stages/steps_cis_hardening.go:64-74` |
| 1.7 (remote login warning banner) | Generic `/etc/issue.net` that names no distro, release or kernel, overwriting the base's | `kairos-init/pkg/bundled/cis.go:36-65`, wired at `steps_cis_hardening.go:79-89` |
| 6.1 (system file permissions) | Symbolic chmod on the eight account databases and their backups | `kairos-init/pkg/stages/steps_cis_hardening.go:35-44` and `:93-103` |

### These three are not on `master` yet

The brief described the kairos-init CIS L1 work (issue #4626 / PR #4650) as *already
merged*. It is not. On the local clone:

```
$ git merge-base --is-ancestor 9d0b3b8e upstream/master && echo MERGED || echo NOT-MERGED
NOT-MERGED
$ git branch -a --contains 9d0b3b8e
  triage/4626-cis-l1-initial-setup
  remotes/origin/triage/4626-cis-l1-initial-setup
```

`kairos-init/pkg/bundled/cis.go` and `steps_cis_hardening.go` do not exist on
`upstream/master` (`git grep -il cis upstream/master -- 'kairos-init/*'` matches only
`jetson_qspi.go`). The five commits are `21d84612`, `eb8f527d`, `e571415f`, `6ce545c1`,
`9d0b3b8e`, touching six files.

Every row below marked `Implemented (unmerged - PR #4650)` therefore describes code that
exists and was read, but that no released Kairos image contains. **The published page must
not claim these as shipped until #4650 lands**, or must gate them behind a version note.
This is the single most important thing for a reviewer to re-check before publication.

### 1.1.1.x is permanently partial: squashfs and FAT

devsec's `os-10` and CIS DIL 1.1.1.x list eight filesystems. Kairos blocklists six. The
remaining two cannot be blocklisted, now or later, and this should be stated on the page
as a standing exception rather than left to look like an oversight:

- **squashfs** is how Kairos ships a rootfs. `rootfs.squashfs` is loop-mounted by the
  initramfs (`kairos-init/pkg/bundled/alpineInit/initramfs-init:13`, `:399-400`,
  `:426-427`), `recovery.squashfs` by GRUB (`kairos-init/pkg/bundled/bundled.go:377`), and
  `squashfs` is in the mkinitfs feature list (`alpineInit/mkinitfs.conf:1`). Blocklisting it
  makes the system unbootable.
- **FAT/vfat** is the EFI system partition's filesystem: `EfiFs = "vfat"`
  (`sdk/constants/constants.go:36`), also `immucore/internal/constants/constants.go:72`
  and `UkiDefaultEfiimgFsType` at `:162`. Blocklisting it breaks EFI boot and UKI.

## Status tally

| Status | Count |
|---|---|
| Implemented (unmerged - PR #4650) | 3 |
| Not applicable | 4 |
| Open | 52 |

No control is `Implemented` on `upstream/master` alone. The sshd drop-in
(`kairos-init/pkg/bundled/ssh_hardening.go`) *is* on master and is cited as partial
evidence under os-01 and os-09, but it derives from dev-sec/ssh-baseline rather than from
this benchmark, so it does not carry a row of its own here.

## Controls


### `controls/os_spec.rb`

| devsec ID | Intent | CIS ID in source | Status | Evidence / justification |
|---|---|---|---|---|
| `os-01` | Trusted hosts login | *none in source* | Open | `/etc/hosts.equiv` is never created or removed by Kairos - `git grep -i hosts.equiv` on `upstream/master` returns nothing. The sshd half is covered (`IgnoreRhosts yes`, `kairos-init/pkg/bundled/ssh_hardening.go:36`) but the file itself is not asserted. The base image is operator-chosen (`kairos-init --model`/base container), so anything Kairos does not itself write is whatever the base ships. |
| `os-02` | Check owner and permissions for /etc/shadow | *none in source* | Implemented (unmerged - PR #4650) | Mode tightened: `kairos-init/pkg/stages/steps_cis_hardening.go:39` (`/etc/shadow` -> `u-x,g-wx,o-rwx`) and `:40` (`/etc/gshadow`), applied by `GetCISHardeningStage` (`:56`). **Partial**: the mode half only. Ownership is deliberately not forced - see the comment at `steps_cis_hardening.go:21-33` on why the modes are symbolic (root:shadow 0640 on Debian/Alpine vs root:root 0000 on RedHat-family, and setgid `unix_chkpwd` needs the group read on the former). |
| `os-03` | Check owner and permissions for /etc/passwd | *none in source* | Implemented (unmerged - PR #4650) | `kairos-init/pkg/stages/steps_cis_hardening.go:37` (`/etc/passwd` -> `u-x,go-wx`) and `:38` (`/etc/group`). Backups `/etc/passwd-` and `/etc/group-` at `:41`/`:42`, guarded on existence (`If: test -f ...`, `:97`) so a missing backup is not created as an empty account database. **Partial**: mode only, not ownership. |
| `os-03b` | Check passwords hashes in /etc/passwd | *none in source* | Open | Not asserted. Kairos writes no password hash into `/etc/passwd`: the `kairos` user is created with `passwd: "!"` through yip's `users` (`kairos-init/pkg/bundled/cloudconfigs/10_accounting.yaml:19`) and root is locked with `passwd -l root` (`:42`), both of which land in `/etc/shadow`. De facto satisfied, but nothing in the repo checks it. |
| `os-04` | Dot in PATH variable | *none in source* | Open | **Partial.** `sudo` is covered: `Defaults secure_path="/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/bin:/usr/local/sbin"` with `Defaults env_reset` (`kairos-init/pkg/bundled/cloudconfigs/10_accounting.yaml:34-35`) - no `.`, no empty element. The interactive login `PATH` is not: `ENV_PATH`/`ENV_SUPATH` in `/etc/login.defs` are untouched (see os-05), and the only `/etc/profile.d` drop-in Kairos installs sets `KUBECONFIG` and nothing else (`32_profile.yaml:6-15`). |
| `os-05` | Check login.defs | *none in source* | Open | `/etc/login.defs` is never touched - `git grep -i login.defs` on `upstream/master` returns nothing. Owner, mode, `ENV_PATH`, `ENV_SUPATH` and `UMASK` are all whatever the base ships. The base image is operator-chosen (`kairos-init --model`/base container), so anything Kairos does not itself write is whatever the base ships. |
| `os-05b` | Check login.defs - RedHat specific | *none in source* | Open | Same as os-05; the RedHat-family variant of the same check. No `/etc/login.defs` handling exists. |
| `os-06` | Check for SUID/ SGID blacklist | *none in source* | Open | No SUID/SGID inventory or stripping anywhere in the repo. Kairos does not enumerate or prune setuid binaries from the base image. |
| `os-07` | Unique uid and gid | *none in source* | Open | Not asserted. Kairos adds exactly one group and one user - `admin` at a fixed `gid: 900` and `kairos` (`kairos-init/pkg/bundled/cloudconfigs/10_accounting.yaml:9-20`) - and relies on yip's `ensure_entities`/`users` to not collide. Nothing checks the base image's existing passwd/group databases for duplicate ids. |
| `os-09` | Check for .rhosts and .netrc file | `CIS Benchmark 9.2.9-10` (from desc; **older CIS numbering**, does not map cleanly to v2.0.0) | Open | **Partial.** `IgnoreRhosts yes` and `HostbasedAuthentication no` in the sshd drop-in (`kairos-init/pkg/bundled/ssh_hardening.go:36-37`) make sshd ignore them. The files themselves are not searched for or removed, and `~/.netrc` is not addressed at all. |
| `os-10` | CIS: Disable unused filesystems | CIS DIL 1.1.1.x (from desc: `1.1.1 Ensure mounting of ...`) | Implemented (unmerged - PR #4650) | `kairos-init/pkg/bundled/cis.go:25-30` writes `install <mod> /bin/false` lines to `/etc/modprobe.d/cis-blocklist.conf` (`cis.go:10`) for **cramfs, freevxfs, jffs2, hfs, hfsplus, udf**, installed by `steps_cis_hardening.go:64-74`. Kept separate from `blacklist_bpfilter.conf` (`cloudconfigs/29_blacklist.yaml:6`) so the two revert independently. Applied unconditionally, so a later kernel bump that starts shipping one of these as a module cannot silently reopen the hole (`cis.go:12-20`). **Two of the eight filesystems devsec lists are deliberately excluded and can never be implemented** (see the `squashfs`/FAT note below). |
| `os-11` | Protect log-directory | *none in source* | Open | `/var/log` is persisted across boots (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:56`, in `PERSISTENT_STATE_PATHS`) but its owner and mode are never set. Contrast `01_ssl_private_perms.yaml`, where Kairos does exactly this for `/etc/ssl/private` - the same reasoning (immucore rsyncs the image's mode into the persistent backing directory, so a loose mode survives every later boot) applies to `/var/log` and is not acted on. |
| `os-12` | Detect vulnerabilities in the cpu-vulnerability-directory | *none in source* | Not applicable | A property of the host CPU's microcode and the base image's kernel mitigations, read out of `/sys/devices/system/cpu/vulnerabilities/`. Kairos neither selects the kernel nor ships microcode; there is nothing for an image builder to configure. Worth restating as guidance (pick a base with current microcode) rather than as a control Kairos can own. |
| `os-13` | Protect cron directories and files | *none in source* | Open | Kairos installs `cron` on Debian-family bases (`kairos-init/pkg/values/packagemaps.go:86`) but never sets owner or mode on `/etc/cron*` or `/etc/crontab`, and installs no `cron.allow`/`at.allow`. |
| `os-14` | Check mountpoints for noexec mount options | *none in source* | Open | **Partial, and partly not applicable.** The Alpine initramfs mounts `/sys`, `/proc`, `/dev/shm` and `/run` `noexec,nosuid,nodev` (`kairos-init/pkg/bundled/alpineInit/initramfs-init:297-323`) and `/sys/fs/bpf` likewise (`cloudconfigs/00_rootfs.yaml:161`), but those are initramfs/early-boot mounts, not the booted rootfs layout. The booted layout is immucore's: `OVERLAY: tmpfs:25%` with `RW_PATHS: /var /etc /srv` (`00_rootfs.yaml:16-18`), and none of those overlays carry `noexec`. Several of devsec's target mountpoints (`/boot`, `/var/tmp`, `/var/log/audit`) are not separate filesystems in the Kairos layout at all, so the control has no mount entry to inspect for them. |
| `os-15` | Check mountpoints for nosuid mount options | *none in source* | Open | Same evidence and same split as os-14, for `nosuid`. |
| `os-16` | Check mountpoints for nodev mount options | *none in source* | Open | Same evidence and same split as os-14, for `nodev`. |

### `controls/package_spec.rb`

| devsec ID | Intent | CIS ID in source | Status | Evidence / justification |
|---|---|---|---|---|
| `package-01` | Do not run deprecated inetd or xinetd | *none in source* | Open | Kairos never installs `inetd`/`xinetd` - no reference in `kairos-init/pkg/values/packagemaps.go`. But their absence is not asserted, and the base image is operator-chosen (`kairos-init --model`/base container), so anything kairos does not itself write is whatever the base ships. |
| `package-02` | Do not install Telnet server | *none in source* | Open | Kairos never installs a telnet server - `git grep -i telnet` on `upstream/master` returns nothing. Absence not asserted; base-image dependent. |
| `package-03` | Do not install rsh server | *none in source* | Open | Kairos never installs an rsh server - no `rsh-server` in `packagemaps.go`. Absence not asserted; base-image dependent. |
| `package-05` | Do not install ypserv server (NIS) | *none in source* | Open | Kairos never installs `ypserv` - `git grep -i ypserv` returns nothing. Absence not asserted; base-image dependent. |
| `package-06` | Do not install tftp server | *none in source* | Open | Kairos never installs a tftp server - `git grep -i tftp` returns nothing. Absence not asserted; base-image dependent. |
| `package-08` | Install auditd | *none in source* | Open | **Partial, and uneven across bases.** The `audit` package is in the RedHat-family list only, with a standing question mark on it: `packagemaps.go:665` reads `"audit", // For audit support, check if needed?`. Debian-family, SUSE and Alpine lists have no auditd. Nothing enables `auditd`, ships audit rules, or sets `audit=1` on the kernel cmdline (`bundled.go:501-514` builds the cmdline and does not). |
| `package-09` | CIS: Additional process hardening | CIS DIL 1.5.4 (from desc: `1.5.4 Ensure prelink is disabled`) | Open | `prelink` is never installed and never explicitly disabled; `git grep -i prelink` on `upstream/master` returns nothing. |

### `controls/sysctl_spec.rb`

| devsec ID | Intent | CIS ID in source | Status | Evidence / justification |
|---|---|---|---|---|
| `sysctl-01` | IPv4 Forwarding | *none in source* | Not applicable | Requires `net.ipv4.ip_forward=0`, which is incompatible with Kairos' purpose. A Kubernetes node forwards pod traffic: k3s/flannel sets `ip_forward=1` when it starts (Kairos installs k3s from its own installer, `provider/internal/provider/buildEvent.go:89-94`, and passes `--flannel-iface` in p2p mode, `provider/internal/role/p2p/k3s.go:55`). Kairos does not set the sysctl either way - `git grep ip_forward` returns nothing - but it cannot be set to 0 on a node that is meant to join a cluster. |
| `sysctl-02` | Reverse path filtering | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-03` | ICMP ignore bogus error responses | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-04` | ICMP echo ignore broadcasts | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-05` | ICMP ratelimit | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-06` | ICMP ratemask | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-07` | TCP timestamps | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-08` | ARP ignore | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-09` | ARP announce | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-10` | TCP RFC1337 Protect Against TCP Time-Wait | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-11` | Protection against SYN flood attacks | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-12` | Shared Media IP Architecture | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-13` | Disable Source Routing | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-14` | Disable acceptance of all IPv4 redirected packets | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-15` | Disable acceptance of all secure redirected packets | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-16` | Disable sending of redirects packets | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-17` | Disable log martians | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-19` | IPv6 Forwarding | *none in source* | Not applicable | Same as sysctl-01 for IPv6: forwarding is required on a node running a dual-stack or IPv6 CNI. Not settable to 0 for Kairos' intended use. |
| `sysctl-20` | Disable acceptance of all IPv6 redirected packets | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-21` | Disable acceptance of IPv6 router solicitations messages | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-22` | Disable Accept Router Preference from router advertisement | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-23` | Disable learning Prefix Information from router advertisement | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-24` | Disable learning Hop limit from router advertisement | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-25` | Disable the system's acceptance of router advertisement | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-26` | Disable IPv6 autoconfiguration | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-27` | Disable neighbor solicitations to send out per address | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-28` | Assign one global unicast IPv6 addresses to each interface | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-29` | Disable loading kernel modules | *none in source* | Not applicable | Requires `kernel.modules_disabled=1`, which would break boot. Kairos loads kernel modules well past early userspace: the initramfs modprobes storage, virtio, squashfs, `tpm`, `dm_mod` and `dm_crypt` (`kairos-init/pkg/bundled/alpineInit/initramfs-init:343-352`), kcrypt needs `dm_crypt` at unlock time, and the CNI loads its own modules after the cluster comes up. Latching module loading off is not compatible with an immutable-image OS that assembles its rootfs at runtime. |
| `sysctl-30` | Magic SysRq | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-31a` | Secure Core Dumps - dump settings | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-31b` | Secure Core Dumps - dump path | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-32` | kernel.randomize_va_space | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-33` | CPU No execution Flag or Kernel ExecShield | *none in source* | Open | A CPU/kernel capability check (NX flag, ExecShield) rather than a setting Kairos writes; it is satisfied or not by the base image's kernel on the given hardware. Listed as Open rather than Not applicable because Kairos could in principle assert it at build time, and does not. |
| `sysctl-34` | Ensure links are protected | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |
| `sysctl-35` | Restrict ptrace attach to privileged users | *none in source* | Open | No sysctl hardening exists. Kairos sets exactly four sysctls, none of them from this baseline: `net.core.rmem_max`, `vm.max_map_count`, `fs.inotify.max_user_instances`, `fs.inotify.max_user_watches` (`kairos-init/pkg/bundled/cloudconfigs/09_systemd_services.yaml:8-16`), all for throughput and watch limits rather than hardening. Whatever the base image's `/etc/sysctl.d` ships is what the node gets. |

