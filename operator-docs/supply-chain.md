---
title: "Supply-chain security"
linkTitle: "Supply-chain security"
weight: 6
date: 2026-07-03
description: Verify Kairos upgrade images and constrain NodeOpUpgrade image sources at admission time
---

The Kairos operator pulls container images that run **as root on the host** and write directly to the node's A/B partition during an upgrade. A tampered or attacker-controlled image lands where a rootkit would want to land. Two admission-time gates make this materially harder:

1. **Image origin restriction** — enforce that `NodeOpUpgrade.spec.image` may only reference an allow-listed registry / repository. Blocks a compromised or misconfigured CR from redirecting an upgrade to an arbitrary image.
2. **Signature verification** — verify that every pulled upgrade image is cosign-signed by the upstream Kairos release CI before the pod is admitted. Blocks a valid registry path serving a tampered image.

Both are Kyverno `ClusterPolicy` resources. They are additive: the first stops an attacker who can create a `NodeOpUpgrade` but not push to the trusted registry; the second stops an attacker who can push to a look-alike path in the trusted registry but not sign as the upstream CI.

Neither policy is shipped by the operator itself. This page documents the recipe.

## Prerequisites

- A Kubernetes cluster with the [Kairos operator](../installation) installed.
- [Kyverno](https://kyverno.io/) installed, with the `verifyImages` webhook enabled (default in recent releases).
- Access to the [Sigstore public infrastructure](https://docs.sigstore.dev/) (`fulcio.sigstore.dev`, `rekor.sigstore.dev`) from within the cluster, OR a local Sigstore stack if you run air-gapped.

## Policy 1 — restrict NodeOpUpgrade image source

The following `ClusterPolicy` refuses any `NodeOpUpgrade` whose `spec.image` does not match the trusted upstream Hadron path.

```yaml
apiVersion: kyverno.io/v2beta1
kind: ClusterPolicy
metadata:
  name: restrict-nodeopupgrade-image
  annotations:
    argocd.argoproj.io/sync-options: SkipDryRunOnMissingResource=true
    policies.kyverno.io/title: Restrict NodeOpUpgrade Image Source
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/subject: NodeOpUpgrade
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: restrict-image-to-hadron
      match:
        any:
          - resources:
              kinds:
                - NodeOpUpgrade
              operations:
                - CREATE
                - UPDATE
      validate:
        message: >-
          NodeOpUpgrade spec.image must reference quay.io/kairos/hadron:*.
          Got: {{ request.object.spec.image }}
        pattern:
          spec:
            image: "quay.io/kairos/hadron:*"
```

- `SkipDryRunOnMissingResource=true` is only needed if you deploy this policy alongside the operator via ArgoCD before its CRDs are registered — see the [CRD race condition note](../installation#crd-race-condition-when-applying-downstream-crs) in the installation page.
- Adapt the allow-listed path to the image family you actually rely on. If you build your own upgrade image via [BYOI](/docs/reference/byoi/) or [Kairos Factory](/docs/reference/kairos-factory/), point the pattern at your own registry path instead.
- Because Kyverno cannot re-evaluate `spec.image` under a `generateName` create (the CR does not yet have a fully-qualified name), match on `CREATE` and `UPDATE` as above.

## Policy 2 — verify cosign signature at pod admission

Upstream Kairos images ([Hadron](https://github.com/kairos-io/hadron)) are cosign-signed at release time by the [Hadron CI](https://github.com/kairos-io/hadron/actions) using a GitHub Actions OIDC identity. The signature is issued by [Sigstore Fulcio](https://docs.sigstore.dev/certificate_authority/overview/) as a short-lived certificate and logged in [Rekor](https://docs.sigstore.dev/logging/overview/). There is no long-lived key material; the trust anchor is the OIDC issuer + subject pair.

The Kyverno policy below reproduces that trust chain at pod admission time and blocks any `quay.io/kairos/hadron:*` pod whose image is unsigned or whose signature does not chain to the Hadron CI identity.

```yaml
apiVersion: kyverno.io/v2beta1
kind: ClusterPolicy
metadata:
  name: verify-hadron-cosign-signature
  annotations:
    argocd.argoproj.io/sync-options: SkipDryRunOnMissingResource=true
    policies.kyverno.io/title: Verify Hadron Cosign Signature
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  failurePolicy: Fail
  rules:
    - name: verify-quay-hadron-cosign-keyless
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "quay.io/kairos/hadron:*"
          required: true
          mutateDigest: true
          verifyDigest: true
          attestors:
            - count: 1
              entries:
                - keyless:
                    issuer: "https://token.actions.githubusercontent.com"
                    subject: "https://github.com/kairos-io/hadron/.github/workflows/build-multiarch-images.yml@refs/tags/*"
                    rekor:
                      url: https://rekor.sigstore.dev
```

A few subtleties:

- `mutateDigest: true` rewrites the pod's `image: quay.io/kairos/hadron:vX` reference to its resolved digest at admission. This prevents a tag-swap attack after the signature check runs.
- `webhookTimeoutSeconds: 30` and `failurePolicy: Fail` mean a Sigstore outage will block hadron pod admission. On air-gapped clusters point `rekor.url` at your local Rekor instance and drop `attestors.entries.keyless.rekor` to the private CA equivalent.
- If the upstream Hadron CI moves its workflow file or renames the repo, the `subject` regex must move with it. Track upstream at [github.com/kairos-io/hadron](https://github.com/kairos-io/hadron/tree/main/.github/workflows).

You can also verify manually from a laptop before signing off on an upgrade:

```bash
cosign verify \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --certificate-identity-regexp='^https://github.com/kairos-io/hadron/' \
  quay.io/kairos/hadron:<tag>
```

## Bootstrap ordering with ArgoCD

If you install Kyverno and the operator from the same GitOps root, wave-order Kyverno first so that policies are evaluating admission by the time the operator (and the first `NodeOpUpgrade`) attempts to run:

| Wave | Resource |
|---|---|
| `-20` | `Application/kyverno` (chart + these `ClusterPolicy` resources) |
| `-10` | `Application/kairos-operator` |
| `0` (default) | `NodeOpUpgrade` CRs |

Without this ordering there is a window during first bootstrap in which the operator can be admitted but the policies are not yet enforcing, so an unsigned hadron image would slip through. Re-verify wave ordering after any chart upgrade.

## Threat model — what this gates and what it doesn't

**Gated:**

- Attacker with cluster-admin who tries to point `NodeOpUpgrade.spec.image` at their own registry — blocked by Policy 1.
- Attacker who takes over `quay.io/kairos/hadron` at the registry layer and pushes a tampered image with the correct tag — blocked by Policy 2 (no valid Sigstore signature).
- Tag-swap after signature check — blocked by `mutateDigest: true`.

**Not gated:**

- Attacker who compromises the Hadron CI itself (they can produce signatures with the expected OIDC subject). Defense: watch for anomalous release cadence, verify SBOMs, and pin `subject` to specific tag patterns rather than `refs/tags/*` when your risk tolerance requires it.
- Attacker with node-level root (the upgrade image runs as root by design; if the attacker is already there, the operator is not the weakest link).
- Attacker who compromises the Sigstore infrastructure. Defense: run a private Sigstore stack for air-gapped or high-assurance deployments.

## See also

- [NodeOpUpgrade — GitOps static-name-bump pattern](../nodeop-upgrade#gitops-alternative-static-name-bump-with-a-versioned-suffix) — pairs well with Policy 2, because Renovate PRs re-verify the tag signature before merge.
- [Using Private Registries](../private-registries) — for authenticated registries in front of the trusted image path.
- [Kyverno verifyImages documentation](https://kyverno.io/docs/writing-policies/verify-images/)
