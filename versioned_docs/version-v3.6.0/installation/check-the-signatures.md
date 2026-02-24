---
title: "Check the Signatures"
sidebar_label: "Check the Signatures"
sidebar_position: 1
description: |
    Verify the integrity of the ISO by checking the signatures.
---

:::note Optional Step
This is an optional but strongly encouraged step for security reasons.
:::

Our ISO releases have sha256 files to checksum the validity of the artifacts. At the same time, our sha256 files are signed automatically in the CI during the release workflow to verify that they haven't been tampered with, adding an extra step to the supply chain. 

It is recommended that before starting any installation the whole security chain is validated by verifying our sha256 signature and validating that the checksum matches with the download artifacts.


To validate the whole chain you need:

1. `sha256sum` which is usually installed by default on most linux distributions.
2. `cosign` to verify the signatures of the sha256 file. You can install cosign via their [installation docs](https://docs.sigstore.dev/cosign/installation/)
3. sha256, certificate and signature files that you want to verify
    - <ImageLink variant="standard" suffix=".iso.sha256" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" />  
    - <ImageLink variant="standard" suffix=".iso.sha256.pem" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" />  
    - <ImageLink variant="standard" suffix=".iso.sha256.sig" kairosVersion="v3.6.0" k3sVersion="v1.33.5+k3s1" />  

In this example we will use the `v3.6.0` version and <FlavorCode /> flavor and <FlavorReleaseCode /> flavor release.

First we check that we have all needed files:

```bash
$ ls      
{{< Image variant="core" suffix=".iso" kairosVersion="v3.6.0"  >}}         {{< Image variant="core" suffix=".iso.sha256.pem" kairosVersion="v3.6.0"  >}}
{{< Image variant="core" suffix=".iso.sha256" kairosVersion="v3.6.0"  >}}  {{< Image variant="core" suffix=".iso.sha256.sig" kairosVersion="v3.6.0"  >}}
```

:::note Cosign version Step
We recommend using the latest cosign version, at the time of writing, 2.5.0
:::


Then we verify that the sha256 checksums haven't been tampered with (substitute $VERSION with the exact Kairos version you are verifying as the certificate identity is the release job that signs it):

```bash
$ cosign verify-blob --cert {{< Image variant="core" suffix=".iso.sha256.pem" kairosVersion="v3.6.0"  >}} --signature {{< Image variant="core" suffix=".iso.sha256.sig" kairosVersion="v3.6.0"  >}} --certificate-identity https://github.com/kairos-io/kairos/.github/workflows/reusable-release.yaml@refs/tags/$VERSION --certificate-oidc-issuer https://token.actions.githubusercontent.com {{< Image variant="core" suffix=".iso.sha256" kairosVersion="v3.6.0"  >}} 
Verified OK
```

Once we see that `Verified OK` we can be sure that the file hasn't been tampered with, and we can continue verifying the iso checksum.

For an example of a failure validation see below:

```bash
$ cosign verify-blob --cert {{< Image variant="core" suffix=".iso.sha256.pem" kairosVersion="v3.6.0"  >}} --signature {{< Image variant="core" suffix=".iso.sha256.sig" kairosVersion="v3.6.0"  >}} --certificate-identity https://github.com/kairos-io/kairos/.github/workflows/reusable-release.yaml@refs/tags/$VERSION --certificate-oidc-issuer https://token.actions.githubusercontent.com {{< Image variant="core" suffix=".iso.sha256.modified" kairosVersion="v3.6.0"  >}} 
Error: verifying blob [{{< Image variant="core" suffix=".iso.sha256.modified" kairosVersion="v3.6.0"  >}}]: invalid signature when validating ASN.1 encoded signature
main.go:62: error during command execution: verifying blob [{{< Image variant="core" suffix=".iso.sha256.modified" kairosVersion="v3.6.0"  >}}]: invalid signature when validating ASN.1 encoded signature
```

Now we can verify that the integrity of the ISO hasnt been compromise:

```bash
$ sha256sum -c {{< Image variant="core" suffix=".iso.sha256" kairosVersion="v3.6.0"  >}}
{{< Image variant="core" suffix=".iso" kairosVersion="v3.6.0"  >}}: OK
```

Once we reached this point, we can be sure that from the ISO hasn't been tampered with since it was created by our release workflow.
