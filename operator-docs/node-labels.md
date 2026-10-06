---
title: "Node labels and annotations"
linkTitle: "Node labels and annotations"
weight: 7
description: The labels and annotations the operator writes on every Kairos node, and how to select on them.
---

The operator runs a node-labeler on every node in the cluster. On a Kairos
node it reads `/etc/kairos-release` and `/proc/cmdline` and writes the result
as node labels and node annotations, all under the `kairos.io/` prefix.

These are the labels you select on in the `nodeSelector` of a
[NodeOp](nodeop) or a [NodeOpUpgrade](nodeop-upgrade). Read them from a
running cluster with:

```bash
kubectl get nodes -o json | jq '.items[].metadata.labels | with_entries(select(.key | startswith("kairos.io/")))'
```

## Labels

`kairos.io/managed` is always `"true"` on a Kairos node. Every other label is
written only when the matching key in `/etc/kairos-release` has a value, so a
selector must tolerate an absent label rather than assume one.

| Label | Source key | Example value | What it is |
|---|---|---|---|
| `kairos.io/managed` | none | `true` | The node is a Kairos node. Set on every labeled node. |
| `kairos.io/id` | `KAIROS_ID` | `kairos` | Always `kairos` on an image built by kairos-init. |
| `kairos.io/family` | `KAIROS_FAMILY` | `debian`, `redhat`, `alpine` | The distribution family of the base image. |
| `kairos.io/flavor` | `KAIROS_FLAVOR` | `ubuntu`, `fedora` | The base distribution. |
| `kairos.io/flavor-release` | `KAIROS_FLAVOR_RELEASE` | `24.04`, `42` | The version of that distribution. |
| `kairos.io/variant` | `KAIROS_VARIANT` | `core`, `standard` | `standard` carries a Kubernetes distribution, `core` does not. |
| `kairos.io/release` | `KAIROS_RELEASE` | `v3.5.2` | The Kairos version, with a leading `v`. |
| `kairos.io/model` | `KAIROS_MODEL` | `generic`, `rpi4` | The hardware model the image was built for. |
| `kairos.io/arch` | `KAIROS_ARCH` | `amd64`, `arm64` | The image architecture. |
| `kairos.io/trusted-boot` | `KAIROS_TRUSTED_BOOT` | `true`, `false` | Whether the image was built for Trusted Boot. |
| `kairos.io/fips` | `KAIROS_FIPS` | `true`, `false` | Whether the image was built with FIPS support. |
| `kairos.io/software-version-prefix` | `KAIROS_SOFTWARE_VERSION_PREFIX` | `k3s`, `k0s` | The Kubernetes distribution in the image. Absent on a `core` image. |
| `kairos.io/software-version` | `KAIROS_SOFTWARE_VERSION` | `v1.32.1-k3s1` | The version of that distribution. Absent on a `core` image. |

### Boot state

`kairos.io/boot-state` does not come from `/etc/kairos-release`. The labeler
reads `/proc/cmdline` and reports which image the node booted:

| Value | The node booted |
|---|---|
| `active` | The active image, which is the normal case. |
| `passive` | The passive image, which is the previous active image after an upgrade. |
| `recovery` | The recovery image. |
| `livecd` | Live media, an ISO or a netboot, so there is no installed system in use. |
| `unknown` | Something the labeler could not classify. |

A node showing `passive` has fallen back, so it is running the image it ran
before its last upgrade. A node showing `recovery` or `livecd` is not running
an installed system, and an upgrade targeted at it does not do what you mean.

## Annotations

Values that are too long, or that hold characters a Kubernetes label value
cannot carry, are written as annotations instead. You cannot select on an
annotation.

| Annotation | Source key | Example value |
|---|---|---|
| `kairos.io/name` | `KAIROS_NAME` | `debian` |
| `kairos.io/id-like` | `KAIROS_ID_LIKE` | `debian` |
| `kairos.io/version` | `KAIROS_VERSION` | `v3.5.2` |
| `kairos.io/init-version` | `KAIROS_INIT_VERSION` | `v0.5.17` |
| `kairos.io/bug-report-url` | `KAIROS_BUG_REPORT_URL` | `https://github.com/kairos-io/kairos/issues` |
| `kairos.io/home-url` | `KAIROS_HOME_URL` | `https://github.com/kairos-io/kairos` |

## Three behaviours to know before you write a selector

**Label values are sanitized, so the value is not always the value in
`/etc/kairos-release`.** A Kubernetes label value accepts only
`[a-zA-Z0-9-_.]`. The labeler replaces every other character with `-`, trims
leading and trailing `-`, `_` and `.`, and truncates to 63 characters. A
flavour recorded as `quay.io/centos/centos:stream9` becomes
`quay.io-centos-centos-stream9`. Annotations are written unchanged. When a
selector does not match, compare it against the label on the node, not
against the release file.

**Stale keys are removed.** Each run replaces the whole `kairos.io/` set: any
`kairos.io/` label or annotation on the node that the current read does not
produce is deleted. A label does not survive an upgrade to an image that no
longer sets it, and you cannot add your own label under the `kairos.io/`
prefix, because the next run deletes it. Use a prefix of your own.

**A non-Kairos node is left alone.** If the node has no
`/etc/kairos-release`, and its `/etc/os-release` `ID` does not contain
`kairos`, the labeler writes nothing at all, not even `kairos.io/managed`.
That is what makes `kairos.io/managed: "true"` mean "Kairos nodes only" in
the examples on the other pages.

## Selector examples

Every Kairos node, which is the selector used throughout these docs:

```yaml
nodeSelector:
  matchLabels:
    kairos.io/managed: "true"
```

Only the FIPS nodes on arm64:

```yaml
nodeSelector:
  matchLabels:
    kairos.io/fips: "true"
    kairos.io/arch: "arm64"
```

Every Kairos node that booted its active image, which skips the nodes sitting
in recovery or on live media:

```yaml
nodeSelector:
  matchLabels:
    kairos.io/managed: "true"
    kairos.io/boot-state: "active"
```

Every node that runs a Kubernetes distribution, whichever one it is:

```yaml
nodeSelector:
  matchExpressions:
  - key: kairos.io/software-version-prefix
    operator: Exists
```

Every Kairos node except the Trusted Boot ones:

```yaml
nodeSelector:
  matchExpressions:
  - key: kairos.io/managed
    operator: In
    values: ["true"]
  - key: kairos.io/trusted-boot
    operator: NotIn
    values: ["true"]
```
