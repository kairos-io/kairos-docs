# CIS Kubernetes Benchmark v1.9.0 - control inventory and Kairos status

Raw research material for kairos-io/kairos#4628. Not a published page; see `README.md` in this directory.

## Where the control list comes from

Control IDs and check descriptions are taken from [`aquasecurity/kube-bench`](https://github.com/aquasecurity/kube-bench)
`cfg/cis-1.9/` (Apache-2.0), fetched from `main` on 2026-09-15:

| kube-bench file | `type` | Controls |
|---|---|---|
| `cfg/cis-1.9/master.yaml` | `master` | 59 |
| `cfg/cis-1.9/etcd.yaml` | `etcd` | 7 |
| `cfg/cis-1.9/controlplane.yaml` | `controlplane` | 5 |
| `cfg/cis-1.9/node.yaml` | `node` | 24 |
| `cfg/cis-1.9/policies.yaml` | `policies` | 35 |
| **total** | | **130** |

CIS's own benchmark PDF is not reproduced here. The `Title` column is kube-bench's own
Apache-2.0 `text` field with its trailing `(Automated)`/`(Manual)` marker moved into the
`Check` column - it is kube-bench's wording, not a paraphrase and not CIS's. Whoever
composes the page should reword these in Kairos' voice; they are here as identifiers, so
that a row can be matched back to the source YAML without ambiguity.

## Caveat on the Level 1 / Level 2 split

**kube-bench's `cfg/cis-1.9/` files do not encode the CIS profile level.** Each check
carries `id`, `text`, `audit`, `tests`, `remediation` and `scored`, plus an optional
`type: manual`; there is no `level` field, and `grep -i level` across the five files
returns only prose inside `remediation` blocks. The directory contains no other file
(`config.yaml` is a two-line stub).

So the Level 1 subset is **not derivable from this source**, and this table does not
guess at it. It lists the full v1.9.0 control set, which is a superset of Level 1.
The consequence for the matrix is one-directional and safe: a control that is really
Level 2 may appear here as `Open` when it is out of scope for an L1 claim, but no
Level 1 control is missing and nothing is over-claimed as `Implemented`. The `Profile`
column therefore reads `not encoded in source` throughout.

The one axis the source does give is automated vs. manual (`type: manual`), reproduced
in the `Check` column: 96 automated, 34 manual.

## How Kairos relates to this benchmark at all

Kairos is an OS image builder. It does not ship a Kubernetes control plane: it installs
k3s or k0s from those projects' own installer scripts
(`provider/internal/provider/buildEvent.go:51-94`), and node roles are driven from
`provider/internal/role/p2p/k3s.go`. Greps for `protect-kernel-defaults`,
`tls-cipher-suites`, `anonymous-auth`, `audit-log`, `secrets-encryption` and `kube-bench`
across `upstream/master` return **nothing**: Kairos sets no CIS-relevant Kubernetes flag
of its own. Every flag-shaped control is reachable only through the operator's
`k3s.args` / `k0s.args` list, which Kairos appends to its own args verbatim
(`provider/internal/role/p2p/k3s.go:85-91`).

That is why this table has no `Implemented in X` rows. Marking any of them
`Implemented` would require a citation that does not exist.

## Status tally

| Status | Count |
|---|---|
| Implemented | 0 |
| Not applicable | 16 |
| Open | 114 |

## Controls


### 1.1 Control Plane Node Configuration Files

Source: `cfg/cis-1.9/master.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 1.1.1 | Ensure that the API server pod specification file permissions are set to 600 or more restrictive | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.2 | Ensure that the API server pod specification file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.3 | Ensure that the controller manager pod specification file permissions are set to 600 or more restrictive | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.4 | Ensure that the controller manager pod specification file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.5 | Ensure that the scheduler pod specification file permissions are set to 600 or more restrictive | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.6 | Ensure that the scheduler pod specification file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.7 | Ensure that the etcd pod specification file permissions are set to 600 or more restrictive | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.8 | Ensure that the etcd pod specification file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s and k0s do not create kubeadm static pod manifests; there is no `/etc/kubernetes/manifests` on a Kairos node. Kairos installs the distro through its upstream installer (`provider/internal/provider/buildEvent.go:51-94`) and adds no control-plane manifests. |
| 1.1.9 | Ensure that the Container Network Interface file permissions are set to 600 or more restrictive | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 1.1.10 | Ensure that the Container Network Interface file ownership is set to root:root | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 1.1.11 | Ensure that the etcd data directory permissions are set to 700 or more restrictive | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 1.1.12 | Ensure that the etcd data directory ownership is set to etcd:etcd | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 1.1.13 | Ensure that the default administrative credential file permissions are set to 600 | automated | not encoded in source | Not applicable | k3s/k0s generate no kubeadm `*.conf` kubeconfigs; the k3s equivalent is `/etc/rancher/k3s/k3s.yaml` (`provider/internal/role/p2p/k3s.go:173`, `kairos-init/pkg/bundled/cloudconfigs/32_profile.yaml:12`), which this control ID does not name. |
| 1.1.14 | Ensure that the default administrative credential file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s/k0s generate no kubeadm `*.conf` kubeconfigs; the k3s equivalent is `/etc/rancher/k3s/k3s.yaml` (`provider/internal/role/p2p/k3s.go:173`, `kairos-init/pkg/bundled/cloudconfigs/32_profile.yaml:12`), which this control ID does not name. |
| 1.1.15 | Ensure that the scheduler.conf file permissions are set to 600 or more restrictive | automated | not encoded in source | Not applicable | k3s/k0s generate no kubeadm `*.conf` kubeconfigs; the k3s equivalent is `/etc/rancher/k3s/k3s.yaml` (`provider/internal/role/p2p/k3s.go:173`, `kairos-init/pkg/bundled/cloudconfigs/32_profile.yaml:12`), which this control ID does not name. |
| 1.1.16 | Ensure that the scheduler.conf file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s/k0s generate no kubeadm `*.conf` kubeconfigs; the k3s equivalent is `/etc/rancher/k3s/k3s.yaml` (`provider/internal/role/p2p/k3s.go:173`, `kairos-init/pkg/bundled/cloudconfigs/32_profile.yaml:12`), which this control ID does not name. |
| 1.1.17 | Ensure that the controller-manager.conf file permissions are set to 600 or more restrictive | automated | not encoded in source | Not applicable | k3s/k0s generate no kubeadm `*.conf` kubeconfigs; the k3s equivalent is `/etc/rancher/k3s/k3s.yaml` (`provider/internal/role/p2p/k3s.go:173`, `kairos-init/pkg/bundled/cloudconfigs/32_profile.yaml:12`), which this control ID does not name. |
| 1.1.18 | Ensure that the controller-manager.conf file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s/k0s generate no kubeadm `*.conf` kubeconfigs; the k3s equivalent is `/etc/rancher/k3s/k3s.yaml` (`provider/internal/role/p2p/k3s.go:173`, `kairos-init/pkg/bundled/cloudconfigs/32_profile.yaml:12`), which this control ID does not name. |
| 1.1.19 | Ensure that the Kubernetes PKI directory and file ownership is set to root:root | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 1.1.20 | Ensure that the Kubernetes PKI certificate file permissions are set to 600 or more restrictive | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 1.1.21 | Ensure that the Kubernetes PKI key file permissions are set to 600 | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |

### 1.2 API Server

Source: `cfg/cis-1.9/master.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 1.2.1 | Ensure that the --anonymous-auth argument is set to false | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.2 | Ensure that the --token-auth-file parameter is not set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.3 | Ensure that the --DenyServiceExternalIPs is set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.4 | Ensure that the --kubelet-client-certificate and --kubelet-client-key arguments are set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.5 | Ensure that the --kubelet-certificate-authority argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.6 | Ensure that the --authorization-mode argument is not set to AlwaysAllow | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.7 | Ensure that the --authorization-mode argument includes Node | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.8 | Ensure that the --authorization-mode argument includes RBAC | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.9 | Ensure that the admission control plugin EventRateLimit is set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.10 | Ensure that the admission control plugin AlwaysAdmit is not set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.11 | Ensure that the admission control plugin AlwaysPullImages is set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.12 | Ensure that the admission control plugin ServiceAccount is set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.13 | Ensure that the admission control plugin NamespaceLifecycle is set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.14 | Ensure that the admission control plugin NodeRestriction is set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.15 | Ensure that the --profiling argument is set to false | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.16 | Ensure that the --audit-log-path argument is set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.17 | Ensure that the --audit-log-maxage argument is set to 30 or as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.18 | Ensure that the --audit-log-maxbackup argument is set to 10 or as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.19 | Ensure that the --audit-log-maxsize argument is set to 100 or as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.20 | Ensure that the --request-timeout argument is set as appropriate | manual | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.21 | Ensure that the --service-account-lookup argument is set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.22 | Ensure that the --service-account-key-file argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.23 | Ensure that the --etcd-certfile and --etcd-keyfile arguments are set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.24 | Ensure that the --tls-cert-file and --tls-private-key-file arguments are set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.25 | Ensure that the --client-ca-file argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.26 | Ensure that the --etcd-cafile argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.27 | Ensure that the --encryption-provider-config argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.28 | Ensure that encryption providers are appropriately configured | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.2.29 | Ensure that the API Server only makes use of Strong Cryptographic Ciphers | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 1.3 Controller Manager

Source: `cfg/cis-1.9/master.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 1.3.1 | Ensure that the --terminated-pod-gc-threshold argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.3.2 | Ensure that the --profiling argument is set to false | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.3.3 | Ensure that the --use-service-account-credentials argument is set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.3.4 | Ensure that the --service-account-private-key-file argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.3.5 | Ensure that the --root-ca-file argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.3.6 | Ensure that the RotateKubeletServerCertificate argument is set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.3.7 | Ensure that the --bind-address argument is set to 127.0.0.1 | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 1.4 Scheduler

Source: `cfg/cis-1.9/master.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 1.4.1 | Ensure that the --profiling argument is set to false | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 1.4.2 | Ensure that the --bind-address argument is set to 127.0.0.1 | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 2 Etcd Node Configuration

Source: `cfg/cis-1.9/etcd.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 2.1 | Ensure that the --cert-file and --key-file arguments are set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 2.2 | Ensure that the --client-cert-auth argument is set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 2.3 | Ensure that the --auto-tls argument is not set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 2.4 | Ensure that the --peer-cert-file and --peer-key-file arguments are set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 2.5 | Ensure that the --peer-client-cert-auth argument is set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 2.6 | Ensure that the --peer-auto-tls argument is not set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 2.7 | Ensure that a unique Certificate Authority is used for etcd | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 3.1 Authentication and Authorization

Source: `cfg/cis-1.9/controlplane.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 3.1.1 | Client certificate authentication should not be used for users | manual | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 3.1.2 | Service account token authentication should not be used for users | manual | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 3.1.3 | Bootstrap token authentication should not be used for users | manual | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 3.2 Logging

Source: `cfg/cis-1.9/controlplane.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 3.2.1 | Ensure that a minimal audit policy is created | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 3.2.2 | Ensure that the audit policy covers key security concerns | manual | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 4.1 Worker Node Configuration Files

Source: `cfg/cis-1.9/node.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 4.1.1 | Ensure that the kubelet service file permissions are set to 600 or more restrictive | automated | not encoded in source | Not applicable | k3s and k0s run the kubelet in-process from the server/agent supervisor; there is no standalone kubelet systemd unit or drop-in for this control to inspect. |
| 4.1.2 | Ensure that the kubelet service file ownership is set to root:root | automated | not encoded in source | Not applicable | k3s and k0s run the kubelet in-process from the server/agent supervisor; there is no standalone kubelet systemd unit or drop-in for this control to inspect. |
| 4.1.3 | If proxy kubeconfig file exists ensure permissions are set to 600 or more restrictive | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 4.1.4 | If proxy kubeconfig file exists ensure ownership is set to root:root | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 4.1.5 | Ensure that the --kubeconfig kubelet.conf file permissions are set to 600 or more restrictive | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 4.1.6 | Ensure that the --kubeconfig kubelet.conf file ownership is set to root:root | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 4.1.7 | Ensure that the certificate authorities file permissions are set to 600 or more restrictive | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 4.1.8 | Ensure that the client certificate authorities file ownership is set to root:root | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 4.1.9 | If the kubelet config.yaml configuration file is being used validate permissions set to 600 or more restrictive | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |
| 4.1.10 | If the kubelet config.yaml configuration file is being used validate file ownership is set to root:root | automated | not encoded in source | Open | Kairos persists the directory (`kairos-init/pkg/bundled/cloudconfigs/00_rootfs.yaml:28-56`, `PERSISTENT_STATE_PATHS`) but sets no mode or ownership on it. Nothing in the repo asserts this control. |

### 4.2 Kubelet

Source: `cfg/cis-1.9/node.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 4.2.1 | Ensure that the --anonymous-auth argument is set to false | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.2 | Ensure that the --authorization-mode argument is not set to AlwaysAllow | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.3 | Ensure that the --client-ca-file argument is set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.4 | Verify that the --read-only-port argument is set to 0 | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.5 | Ensure that the --streaming-connection-idle-timeout argument is not set to 0 | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.6 | Ensure that the --make-iptables-util-chains argument is set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.7 | Ensure that the --hostname-override argument is not set | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.8 | Ensure that the eventRecordQPS argument is set to a level which ensures appropriate event capture | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.9 | Ensure that the --tls-cert-file and --tls-private-key-file arguments are set as appropriate | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.10 | Ensure that the --rotate-certificates argument is not set to false | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.11 | Verify that the RotateKubeletServerCertificate argument is set to true | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.12 | Ensure that the Kubelet only makes use of Strong Cryptographic Ciphers | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |
| 4.2.13 | Ensure that a limit is set on pod PIDs | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 4.3 kube-proxy

Source: `cfg/cis-1.9/node.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 4.3.1 | Ensure that the kube-proxy metrics service is bound to localhost | automated | not encoded in source | Open | Operator-supplied, via the `k3s`/`k0s` `args` passthrough - `provider/internal/role/p2p/k3s.go:85-91` (`AppendArgs`), config shape in `provider/internal/provider/config/config.go:97-107`. Kairos sets no value of its own. |

### 5.1 RBAC and Service Accounts

Source: `cfg/cis-1.9/policies.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 5.1.1 | Ensure that the cluster-admin role is only used where required | automated | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.2 | Minimize access to secrets | automated | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.3 | Minimize wildcard use in Roles and ClusterRoles | automated | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.4 | Minimize access to create pods | automated | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.5 | Ensure that default service accounts are not actively used | automated | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.6 | Ensure that Service Account Tokens are only mounted where necessary | automated | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.7 | Avoid use of system:masters group | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.8 | Limit use of the Bind, Impersonate and Escalate permissions in the Kubernetes cluster | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.9 | Minimize access to create persistent volumes | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.10 | Minimize access to the proxy sub-resource of nodes | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.11 | Minimize access to the approval sub-resource of certificatesigningrequests objects | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.12 | Minimize access to webhook configuration objects | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.1.13 | Minimize access to the service account token creation | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |

### 5.2 Pod Security Standards

Source: `cfg/cis-1.9/policies.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 5.2.1 | Ensure that the cluster has at least one active policy control mechanism in place | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.2 | Minimize the admission of privileged containers | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.3 | Minimize the admission of containers wishing to share the host process ID namespace | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.4 | Minimize the admission of containers wishing to share the host IPC namespace | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.5 | Minimize the admission of containers wishing to share the host network namespace | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.6 | Minimize the admission of containers with allowPrivilegeEscalation | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.7 | Minimize the admission of root containers | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.8 | Minimize the admission of containers with the NET_RAW capability | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.9 | Minimize the admission of containers with added capabilities | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.10 | Minimize the admission of containers with capabilities assigned | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.11 | Minimize the admission of Windows HostProcess containers | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.12 | Minimize the admission of HostPath volumes | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.2.13 | Minimize the admission of containers which use HostPorts | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |

### 5.3 Network Policies and CNI

Source: `cfg/cis-1.9/policies.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 5.3.1 | Ensure that the CNI in use supports NetworkPolicies | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.3.2 | Ensure that all Namespaces have NetworkPolicies defined | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |

### 5.4 Secrets Management

Source: `cfg/cis-1.9/policies.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 5.4.1 | Prefer using Secrets as files over Secrets as environment variables | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.4.2 | Consider external secret storage | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |

### 5.5 Extensible Admission Control

Source: `cfg/cis-1.9/policies.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 5.5.1 | Configure Image Provenance using ImagePolicyWebhook admission controller | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |

### 5.7 General Policies

Source: `cfg/cis-1.9/policies.yaml`

| ID | Title | Check | Profile | Status | Evidence / justification |
|---|---|---|---|---|---|
| 5.7.1 | Create administrative boundaries between resources using namespaces | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.7.2 | Ensure that the seccomp profile is set to docker/default in your Pod definitions | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.7.3 | Apply SecurityContext to your Pods and Containers | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |
| 5.7.4 | The default namespace should not be used | manual | not encoded in source | Open | Cluster-level policy applied after bootstrap. Kairos ships no default RBAC, Pod Security Admission, NetworkPolicy or admission-webhook manifests (the only bundled manifest is `provider/internal/assets/static/kube_vip_rbac.yaml`, which is kube-vip's own RBAC, unrelated to this control). |

