---
title: "Image support matrix"
sidebar_label: "Image support matrix"
sidebar_position: 5
date: 2022-11-13
---

Kairos supports multiple Linux distributions and this remains a core feature.

As a small open-source team, we now focus official prebuilt artifacts and docs defaults on Hadron. Other distributions are still supported and validated through automated testing in `kairos-init`.

## Tested distribution matrix

The current list of tested base distributions and releases is maintained in the `kairos-init` CI workflow:

- https://github.com/kairos-io/kairos-init/blob/main/.github/workflows/test.yml#L22-L39

This workflow is the source of truth for what is continuously tested.

## What this means for users

- Hadron is the default fast path for docs and prebuilt artifacts.
- Multi-distribution support is still available and supported for custom builds.
- You can build and publish your own images with [BYOI](/docs/reference/byoi/) and [Kairos Factory](/docs/reference/kairos-factory/).

## Image naming format

Kairos image tags follow this structure:

```text
<registry>/<repository>:<flavor_release>-<variant>-<arch>-<device>-<version>
```

More about naming conventions: [Artifact Naming Convention](/docs/reference/artifacts/).

Notes:

- **Core** images do not include a Kubernetes engine and are suitable as a base for customization.
- **Standard** images include `k3s` and the [kairos provider](https://github.com/kairos-io/provider-kairos), with optional [p2p](/docs/installation/p2p).

:::info Legacy flavor example
Some docs still show concrete flavor/release examples (for example `ubuntu:22.04` or `opensuse:leap-15.6`) to illustrate commands and naming. Those flavor repositories are no longer actively updated by the Kairos release pipeline. Use them as templates and build/publish your own images with [BYOI](/docs/reference/byoi/).
:::

### Building core and standard generic images

You can build unsupported or custom artifacts locally with [git](https://git-scm.com/) and [docker](https://www.docker.com/). Example (AlmaLinux ARM RPI4):

```bash
git clone https://github.com/kairos-io/kairos.git
cd kairos
docker build --platform linux/arm64 --build-arg BASE_IMG=almalinux:9 --build-arg MODEL=rpi4 --build-arg VERSION=1.0.0 -f images/Dockerfile -t mycustomimage:1.0.0 .
```

:::tip Note
See [Kairos Factory](/docs/reference/kairos-factory/) for a production-ready path to automate this in CI.
:::
## Versioning policy

Kairos follows [Semantic Versioning](https://semver.org/) and our releases signal changes to Kairos components, rather than changes to the underlying OS and package versions. Flavors are pinned to specific upstream OS branches (e.g. `opensuse` to `leap 15.4`) and major version bumps will be reflected through new flavors in our build matrix or through specific releases to follow upstream with regard to minor version bumps (e.g. `leap 15.3` and `leap 15.4`).

Here are some key points to note:
- We only support the latest release branch with patch releases.
- Patch releases (e.g. _1.1.x_) follow a weekly release cadence, unless there are exceptions for highly impactful bugs in Kairos itself or at the OS layer (e.g. high-severity CVEs).
- Minor releases follow a monthly cadence and are expected to bring enhancements through planned releases.
- Major releases signal new advanced features or significant changes to the codebase. In-place upgrades from old to new major release branches are not always guaranteed, but we strive for compatibility across versions.

:::info Note
In order to give users more control over the chosen base image (e.g. `openSUSE`, `Ubuntu`, etc.) and reduce reliance on our CI infrastructure, we are actively working on streamlining the creation of Kairos-based distributions directly from upstream base images. You can track the development progress [here](https://github.com/kairos-io/kairos/issues/116).

If you need to further customize images, including changes to the base image, package updates, and CVE hotfixes, check out the [customization docs](/docs/advanced/customizing).
:::
## Release changelog

Our changelog is published as part of the release process and contains all the changes, highlights, and release notes that are relevant to the release. We strongly recommend checking the changelog for each release before upgrading or building a customized version of Kairos.

Release changelogs are available for Kairos core and for each component. Below is a list of the components that are part of a Kairos release and their respective release pages with changelogs.

| **Project**                                  	                                | **Release page**                                       	 |
|-------------------------------------------------------------------------------|----------------------------------------------------------|
| **Kairos core and standard (k3s support)**                                  	 | https://github.com/kairos-io/kairos/releases      	      |
| **Kairos' provider**                                                          | https://github.com/kairos-io/provider-kairos/releases    |
| **Immucore**                                                                  | https://github.com/kairos-io/Immucore/releases           |
| **AuroraBoot**                                                                | https://github.com/kairos-io/AuroraBoot/releases         |
| **OSBuilder**                                                                 | https://github.com/kairos-io/osbuilder/releases          |

## Service Billing Of Materials (SBOM)

  SBOM lists are regularly pushed via the CI as part of the Github releases assets. For instance, 

  ```bash
  https://github.com/kairos-io/kairos/releases/download/{{< KairosVersion  >}}/{{< Image variant="core" suffix="-sbom.spdx.json"  >}}
  ```

 is the SBOM for a core Kairos image release artifact.

## Image verification

Images signatures are pushed regularly for tagged releases. To verify images with `cosign` ([install guide](https://docs.sigstore.dev/cosign/installation/)) for example, you can use the following command:

```bash
cosign verify-attestation \
        --type spdx <your-image-reference> \
        --certificate-identity "https://github.com/kairos-io/kairos/.github/workflows/release.yaml@refs/tags/{{< KairosVersion  >}}" \
        --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
```

To see how to verify image attestation during upgrades with `kyverno`, see the [documentation page](https://kairos.io/docs/upgrade/kubernetes/#verify-images-attestation-during-upgrades).
