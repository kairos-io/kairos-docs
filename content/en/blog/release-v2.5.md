---
title: "Kairos release v2.5"
date: 2024-01-11
linkTitle: "Kairos release v2.5"
description: "Kairos release v2.5"
author: Mauro Morales ([X](https://x.com/mauromrls)) ([GitHub](https://github.com/mauromorales))
---
<h1 align="center">
  <br>
     <img width="184" alt="kairos-white-column 5bc2fe34" src="https://user-images.githubusercontent.com/2420543/215073247-96988fd1-7fcf-4877-a28d-7c5802db43ab.png">
    <br>
<br>
</h1>


Happy new year to all of you in the Kairos community! This 2024, we have many great plans that we want to achieve. You can find more about them in our [roadmap](https://github.com/orgs/kairos-io/projects/2/views/1).

We start the year with the release of Kairos v2.5.0. This time, we focused on the ground work for two major features that will land later in the year

1. **Improving the Kairos Factory user experience**: On previous releases we shared how our artifact names have changed to make it easier to distinguish between them. In this release we worked on Versioneer, a component that helps build such names in more sofisticated ways than the original script did. This has been aggregated to the `kairos-agent upgrade` command to help you filter through upgradable versions.
2. **Adding support for UKI (Unified Kernel Images)**: This is still a WIP but we already have a proof of concept, meaning that Kairos will increase its security level by validating signatures using the EFI bootloader.

## Known Issues

We haven't been able to address the following issues on Alpine:

* 🐛 Filesystem expansion on rpi4 doesn't work with Alpine [#1995](https://github.com/kairos-io/kairos/issues/1995)
* 🐛 cgroup_memory not mounted in Alpine rpi4 [#2002](https://github.com/kairos-io/kairos/issues/2002)
* 🐛 Upgrade on Alpine arm errors [#2135](https://github.com/kairos-io/kairos/issues/2135)
* 🐛 reset from the GRUB menu on Alpine amd64, gets stuck in an endless loop [#2136](https://github.com/kairos-io/kairos/issues/2136)

## Flavor Updates

* Ubuntu 23.04 got updated to 23.10
* Alpine 3.18 got updated to 3.19
* We know produce Raspberry Pi 3 Artifacts thanks to the contribution to our community member [Ludea](https://github.com/Ludea) [#1966](https://github.com/kairos-io/kairos/pull/1966)

For a comprehensive view of all the changes in this release, please refer to [the full changelog](https://github.com/kairos-io/kairos/releases/tag/v2.5.0) (And be sure to check out the "Known issues" section for any potential hiccups.)

This release marks a significant milestone in the evolution of our project, and we want to extend our heartfelt thanks to everyone who contributed to this release. Whether through code contributions, reviews, bug reports, comments, debugging output, or simply joining [our meetings](https://calendar.google.com/calendar/u/0/embed?src=c_6d65f26502a5a67c9570bb4c16b622e38d609430bce6ce7fc1d8064f2df09c11@group.calendar.google.com&ctz=Europe/Rome), your support and engagement are invaluable.

