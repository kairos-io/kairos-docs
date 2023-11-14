---
title: "Kairos release v2.4.2"
date: 2023-11-14
linkTitle: "Kairos release v2.4.2"
description: "A patch release that looks bigger than it is"
author: Dimitris Karakasilis ([LinkedIn](https://www.linkedin.com/in/jimmykarily/)) ([GitHub](https://github.com/jimmykarily)), Itxaka Serrano Garcia ([GitHub](https://github.com/Itxaka))

---
<h1 align="center">
  <br>
     <img width="184" alt="kairos-white-column 5bc2fe34" src="https://user-images.githubusercontent.com/2420543/215073247-96988fd1-7fcf-4877-a28d-7c5802db43ab.png">
    <br>
<br>
</h1>

Did you ever look at a release and couldn't decide if it should be a patch release, a minor or a major version bump? It has happened to everybody (if not, let me know).
This Kairos release was a similar case. We didn't introduce any breaking changes and it was just bug fixes, which makes it a patch release.  At least that's the story for user facing changes. Because, behind the scenes, we made some heavy changes on the way we produce the Kairos artifacts and how we name them.

The detailed list of changes can be found in the [release notes](https://github.com/kairos-io/kairos/releases/tag/v2.4.2) but the important things to notice are:

- The artifacts (including container images) have consistent names which include all the information about the image. For example, the "standard" image (with k3s)
  for the Opensuse leap 15.5, targeting amd64 generic devices, in Kairos version 2.4.0, was called:

  ```
  quay.io/kairos/kairos-opensuse-leap:v2.4.0-k3sv1.27.3-k3s1
  ```

  In version 2.4.2 it's called:

  ```
  quay.io/kairos/opensuse:leap-15.5-standard-amd64-generic-v2.4.2-k3sv1.27.6-k3s1
  ```

  First of all the beginning of the image name reads naturally like the distro is usually named, including the version of the upstream distribution (15.5). Then, there is the information about:
  - the variant (core or standard)
  - the architecture (amd64, arm64 etc)
  - the model (generic, rpi4 etc)
  - the Kairos version (v2.4.2) including the k3s version if it's a standard image

  And the same information is there in the bootable artifact name in the same order:

  [kairos-opensuse-leap-15.5-standard-amd64-generic-v2.4.2-k3sv1.27.6+k3s1.iso](https://github.com/kairos-io/kairos/releases/download/v2.4.2/kairos-opensuse-leap-15.5-standard-amd64-generic-v2.4.2-k3sv1.27.6+k3s1.iso)

- Much of the logic from [Earthly](https://github.com/kairos-io/kairos/blob/a658a3fa5f294b14377631dedfa0031d3551f2b2/Earthfile#L317) has been moved to [the Dockerfiles](https://github.com/kairos-io/kairos/tree/master/imageshttps://github.com/kairos-io/kairos/tree/master/images). And while this seems like an internal technical detail, it does take us close to a simpler build process which everyone can replicate in their own CI to build custom Kairos images. The input to the dockerfiles is the information you see in the artifact names (see above) and comes directly from the [flavors.json file](https://github.com/kairos-io/kairos/blob/a658a3fa5f294b14377631dedfa0031d3551f2b2/.github/flavors.json#L1). If all this sounds complicated, just keep this:
  In one of the next releases, is will be possible to build a full Kairos image (standard or core) using only one of the dockerfiles (no Earthly) and a block of information like:

  ```
    "family": "opensuse",
    "flavor": "opensuse",
    "flavorRelease": "leap-15.5",
    "variant": "standard",
    "model": "generic",
    "baseImage": "opensuse/leap:15.5",
    "arch": "amd64",
  ```

  This allows one to use a derivative of `opensuse/leap:15.5`, with some modifications on top (e.g. additional packages installed) simply by changing the `baseImage` to the custom one.

- Transition to Alpine: A Leap Forward for Kairos

In our latest release of Kairos, we've made a significant shift in the architecture of our Alpine flavor. We've transitioned from using the initramfs and kernel from both openSUSE and Ubuntu to a full-fledged Alpine kernel and initramfs system. This change marks a significant milestone in our journey to provide a more robust and efficient system for our users.

## The Old System

Previously, our Alpine flavor of Kairos was built on two different systems. One used the initramfs and kernel from openSUSE, and the other used the initramfs and kernel from Ubuntu. Both systems used the Alpine root file system. While these setups served us well, they had their limitations. The most notable one was the use of systemd during the initramfs and openrc during system boot. This dual system added complexity and potential points of failure to our boot process.

## The New System

In our new release, we've written our own implementation of the initramfs script for our Alpine flavor. This script sets up the system, creating a more streamlined and efficient boot process.

The switch to the Alpine kernel and initramfs system brings several benefits:

1. **Simplicity**: Alpine Linux is designed to be simple, which makes it easier to maintain and less prone to errors.
2. **Security**: Alpine Linux uses musl libc and busybox to provide a small binary size with significant security benefits.
3. **Efficiency**: The Alpine kernel and initramfs system are lightweight, which means Kairos now requires fewer resources to run.


## Conclusion

This transition to a full Alpine kernel and initramfs system is a significant step forward for our Alpine flavor of Kairos. It simplifies our architecture, improves security, and increases efficiency.
The changes in the build process make Kairos more friendly to customizations. The naming changes, put some order to the numerous artifacts we generate with every release, making it easier to choose the right one.
Finally the various bug fixes and smaller improvements should make it a more stable release for everyone.
We're excited about these changes and look forward to seeing how they benefit our users.


Reach out to us with your comments!
