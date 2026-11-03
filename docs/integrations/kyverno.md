---
title: "Kyverno"
sidebar_label: "Kyverno"
description: Verify Kairos image signatures with Kyverno before upgrading nodes
---

Set up image verification by following the upstream guide:
[Kyverno verify images](https://kyverno.io/docs/writing-policies/verify-images/).

The rest of this page covers how Kairos images are signed and how to install Kyverno on Kairos nodes.

## Verify images attestation during upgrades

Container images can be signed during the build phase of a CI/CD pipeline using [Cosign](https://github.com/sigstore/cosign), Kairos signs every artifact as part of the release process.

To ensure that the images used during upgrades match the expected signatures, [Kyverno](https://kyverno.io/) can be used to set up policies. This is done by checking if the signature is present in the OCI registry and if the image was signed using the specified key. The policy rule check fails if either of these conditions is not met.

To learn more about this specific Kyverno feature, you can refer to the [documentation](https://kyverno.io/docs/writing-policies/verify-images/). This allows for the verification of image authenticity directly at the node level prior to upgrading.

A Kyverno policy for standard images might look like the following:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: check-image
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  failurePolicy: Fail
  rules:
    - name: check-image
      match:
        any:
        - resources:
            kinds:
              - Pod
      verifyImages:
      - imageReferences:
        - "quay.io/kairos/{{< FlavorCode  >}}*"
        attestors:
        - entries:
          # See: https://kyverno.io/docs/writing-policies/verify-images/#keyless-signing-and-verification
          - keyless:
              subject: "https://github.com/kairos-io/provider-kairos/.github/workflows/release.yaml@refs/tags/*"
              issuer: "https://token.actions.githubusercontent.com"
              rekor:
                url: https://rekor.sigstore.dev
```

To install Kyverno in a Kairos cluster, you can simply use the community [bundles](/docs/advanced/bundles). For example, you can use the following installation cloud config file:

```yaml
#cloud-config

hostname: kyverno-{{ trunc 4 .MachineID }}

# Specify the bundle to use
bundles:
- targets:
  - run://quay.io/kairos/community-bundles:cert-manager_latest
  - run://quay.io/kairos/community-bundles:kyverno_latest

users:
- name: kairos
  passwd: kairos
  groups:
  - admin

k3s:
 enabled: true
```

This configuration file prepares the system with the `cert-manager` and `kyverno` bundles, enabling `k3s`. The Kairos operator can be deployed separately using the instructions in the [Kairos Operator documentation](/operator-docs/installation/).
