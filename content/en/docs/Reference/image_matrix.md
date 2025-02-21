---
title: "Image support matrix"
linkTitle: "Image support matrix"
weight: 5
date: 2022-11-13
---

Kairos offers several pre-built images for user convenience based on popular Linux distributions such as openSUSE, Alpine Linux, and Ubuntu. The Kairos core team does its best to test these images, but those that are based on systemd (e.g. openSUSE, Ubuntu) are more thoroughly tested due to their homogenous settings. Support for other non-systemd based flavors (e.g. Alpine) may be limited due to team bandwidth. However, as Kairos is an open source community-driven project, we welcome any contributions, bug reports, and bug fixes. Check out our [Contribution guidelines](https://github.com/kairos-io/kairos/contribute) for more information.

In addition, tighter integration with systemd allows for several features that are only available with it, such as live layering.

These images are pushed to quay.io and are available for installation and upgrading. The installable mediums included in the releases are generated using the methods described in the [automated installation reference]({{< relref "../installation/automated#iso-remastering" >}}), and the images can be used for upgrades as well.

## Image flavors

Kairos release processes generates images based on official container images from popular Linux distributions. If you don't see your preferred distribution, check if [we are already planning](https://github.com/kairos-io/kairos/issues?q=is%3Aopen+is%3Aissue+label%3Aarea%2Fflavor) support for it or create a new issue.

{{% alert title="Note" color="success" %}}
You can also download ISOs and other artifacts from the [releases page](https://github.com/kairos-io/kairos/releases).
{{% /alert %}}

Below is a list of the container repositories for each flavor:

| **Flavor**      | repository |
|-----------------|------------|
| **Alpine**      | {{< container-repo-link flavor="alpine" >}}     |
| **Debian**      | {{< container-repo-link flavor="debian" >}}     |
| **Fedora**      | {{< container-repo-link flavor="fedora" >}}     |
| **openSUSE**    | {{< container-repo-link flavor="opensuse" >}}   |
| **Ubuntu**      | {{< container-repo-link flavor="ubuntu" >}}     |
| **Rocky Linux** | {{< container-repo-link flavor="rockylinux" >}} |

The various images are available with different tags in the form of:

```
quay.io/kairos/<flavor>:<flavor_release>-<variant>-<arch>-<device>-<version>
```

For example: {{<ociCode variant="standard">}}. More about Kairos naming conventions [here]({{< relref "./artifacts" >}}).

Notes:

- The **Core** images do not include any Kubernetes engine and can be used as a base for customizations.
- The **Standard** images include `k3s` and the [kairos provider](https://github.com/kairos-io/provider-kairos), which enables Kubernetes deployments and optionally enables [p2p]({{< relref "../installation/p2p" >}}).
- The **-img** repositories contain an img file which can be directly written to an SD card or USB drive for use with ARM devices.

{{% alert title="Note" color="info" %}}
The pipelines do not publish `img` artifacts for the arm architecture because the files are too large for GitHub Actions (they exceed the artifact size limit). These artifacts can be extracted from the published docker images using the following command:

```bash {class="only-flavors=openSUSE+Leap-15.6,openSUSE+Tumbleweed,Ubuntu+20.04,Ubuntu+22.04,Alpine+3.19"}
export IMAGE={{<oci variant="core" arch="arm64" model="rpi4" suffix="img">}}
docker run -ti --rm -v $PWD:/image quay.io/luet/base util unpack "$IMAGE" /image
```

(replace `$IMAGE` with the proper image)

The artifacts can be found in the `build` directory.

{{% /alert %}}

### Building core and standard generic images

Unfortunately we don't have the resources and capacity to build every possible artifact in our matrix. Thankfully, you can still build those images manually on your local machine, all you need is [git](https://git-scm.com/), [docker](https://www.docker.com/) and [earthly](https://earthly.dev/). Here's an example how to build an Almalinux ARM generic image

```bash
git checkout https://github.com/kairos-io/kairos.git
cd kairos
earthly +all-arm-generic --FAMILY=@family --FLAVOR=@flavor --FLAVOR_RELEASE=@flavorRelease --BASE_IMAGE=@baseImage --VARIANT=core
```

## Framework images

Kairos releases contains also the __framework__ assets that can be used to [build Kairos images from Scratch]({{< relref "../reference/build-from-scratch" >}}).

Framework images can be found in quay at: https://quay.io/repository/kairos/framework.

Each tag follow the convention: `<version>[-fips]`.

## Versioning policy

Kairos follows [Semantic Versioning](https://semver.org/) and our releases signal changes to Kairos components, rather than changes to the underlying OS and package versions. Flavors are pinned to specific upstream OS branches (e.g. `opensuse` to `leap 15.4`) and major version bumps will be reflected through new flavors in our build matrix or through specific releases to follow upstream with regard to minor version bumps (e.g. `leap 15.3` and `leap 15.4`).

Here are some key points to note:
- We only support the latest release branch with patch releases.
- Patch releases (e.g. _1.1.x_) follow a weekly release cadence, unless there are exceptions for highly impactful bugs in Kairos itself or at the OS layer (e.g. high-severity CVEs).
- Minor releases follow a monthly cadence and are expected to bring enhancements through planned releases.
- Major releases signal new advanced features or significant changes to the codebase. In-place upgrades from old to new major release branches are not always guaranteed, but we strive for compatibility across versions.

{{% alert title="Note" color="info" %}}
In order to give users more control over the chosen base image (e.g. `openSUSE`, `Ubuntu`, etc.) and reduce reliance on our CI infrastructure, we are actively working on streamlining the creation of Kairos-based distributions directly from upstream base images. You can track the development progress [here](https://github.com/kairos-io/kairos/issues/116).

If you need to further customize images, including changes to the base image, package updates, and CVE hotfixes, check out the [customization docs]({{< relref "../advanced/customizing" >}}).
{{% /alert %}}


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
  https://github.com/kairos-io/kairos/releases/download/{{< kairosVersion >}}/{{<image variant="core" suffix="-sbom.spdx.json" >}}
  ```

 is the SBOM for the core {{<flavorCode >}} image.

## Image verification

Images signatures are pushed regularly for tagged releases. To verify images with `cosign` ([install guide](https://docs.sigstore.dev/cosign/installation/)) for example, you can use the following command:

```bash
cosign verify-attestation \
        --type spdx {{<oci variant="core">}} \
        --certificate-identity "https://github.com/kairos-io/kairos/.github/workflows/release.yaml@refs/tags/{{< kairosVersion >}}" \
        --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
```

To see how to verify image attestation during upgrades with `kyverno`, see the [documentation page](https://kairos.io/docs/upgrade/kubernetes/#verify-images-attestation-during-upgrades).
