---
title: "Check the Signatures"
linkTitle: "Check the Signatures"
weight: 1
description: |
    Verify the integrity of the ISO by checking the signatures.
---

## Check the Signatures

{{% alert title="Optional Step" color="primary" %}}
This is an optional but strongly encouraged step for security reasons.
{{% /alert %}}

Our ISO releases have sha256 files to checksum the validity of the artifacts. At the same time, our sha256 files are signed automatically in the CI during the release workflow to verify that they haven't been tampered with, adding an extra step to the supply chain. 

It is recommended that before starting any installation the whole security chain is validated by verifying our sha256 signature and validating that the checksum matches with the download artifacts.


To validate the whole chain you need:

1. `sha256sum` which is usually installed by default on most linux distributions.
2. `cosign` to verify the signatures of the sha256 file. You can install cosign via their [installation docs](https://docs.sigstore.dev/cosign/installation/)
3. sha256, certificate and signature files that you want to verify
    - {{<imageLink variant="standard" suffix=".iso.sha256">}}  
    - {{<imageLink variant="standard" suffix=".iso.sha256.pem">}}  
    - {{<imageLink variant="standard" suffix=".iso.sha256.sig">}}  

In this example we will use the `{{< kairosVersion >}}` version and {{<flavorCode >}} flavor and {{<flavorReleaseCode >}} flavor release.

First we check that we have all needed files:

```bash
$ ls      
{{<image variant="core" suffix=".iso">}}         {{<image variant="core" suffix=".iso.sha256.pem">}}
{{<image variant="core" suffix=".iso.sha256">}}  {{<image variant="core" suffix=".iso.sha256.sig">}}
```

Then we verify that the sha256 checksums haven't been tampered with:

```bash
$ COSIGN_EXPERIMENTAL=1 cosign verify-blob --cert {{<image variant="core" suffix=".iso.sha256.pem">}} --signature {{<image variant="core" suffix=".iso.sha256.sig">}} {{<image variant="core" suffix=".iso.sha256">}} 
tlog entry verified with uuid: 51ef927a43557386ad7912802607aa421566772524319703a99f8331f0bb778f index: 11977200
Verified OK
```

Once we see that `Verified OK` we can be sure that the file hasn't been tampered with, and we can continue verifying the iso checksum.

For an example of a failure validation see below:

```bash
$ COSIGN_EXPERIMENTAL=1 cosign verify-blob --enforce-sct --cert {{<image variant="core" suffix=".iso.sha256.pem">}} --signature {{<image variant="core" suffix=".iso.sha256.sig">}} {{<image variant="core" suffix=".iso.sha256.modified">}}
Error: verifying blob [{{<image variant="core" suffix=".iso.sha256.modified">}}]: invalid signature when validating ASN.1 encoded signature
main.go:62: error during command execution: verifying blob [{{<image variant="core" suffix=".iso.sha256.modified">}}]: invalid signature when validating ASN.1 encoded signature
```
{{% alert title="Info" color="info" %}}
We use `COSIGN_EXPERIMENTAL=1` to verify the blob using the keyless method. That means that only ephemeral keys are created to sign, and it relays on using
OIDC Identity Tokens to authenticate so not even Kairos developers have access to the private keys and can modify an existing signature. All signatures are done
via the CI with no external access to the signing process. For more information about keyless signing please check the [cosign docs](https://github.com/sigstore/cosign/blob/main/KEYLESS.md)
{{% /alert %}}


Now we can verify that the integrity of the ISO hasnt been compromise:

```bash
$ sha256sum -c {{<image variant="core" suffix=".iso.sha256">}}
{{<image variant="core" suffix=".iso">}}: OK
```

Once we reached this point, we can be sure that from the ISO hasn't been tampered with since it was created by our release workflow.

