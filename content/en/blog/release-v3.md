---
title: "Kairos release v3"
date: 2024-03-08
linkTitle: "Kairos release v3"
description: "Kairos release v3"
author: Mauro Morales ([Twitter](https://twitter.com/mauromrls)) ([GitHub](https://github.com/mauromorales))
---
<h1 align="center">
  <br>
     <img width="184" alt="kairos-white-column 5bc2fe34" src="https://user-images.githubusercontent.com/2420543/215073247-96988fd1-7fcf-4877-a28d-7c5802db43ab.png">
    <br>
<br>
</h1>

The team is very excited to announce the next major release of Kairos, Kairos v3! This release marks a major milestone in our [roadmap](https://github.com/orgs/kairos-io/projects/2/views/1) by adding support for Unified Kernel Images (UKI). This will enhance the level of security that you can achieve on your system with the help of Trusted Boot.

## Trusted Boot

At a glance, this feature will enable users of Kairos, to measure and sign with your own keys the Kernel, initrd and boot cmdline, ensuring that only your images can be booted in a given system. An in depth post will follow explaining the technicalities of how we do this. In the meantime you can head to our docs:

- [Trusted Boot Architecture](https://kairos.io/docs/architecture/trustedboot/)
- [Trusted Boot Installation](https://kairos.io/docs/installation/trustedboot/)
- [Trusted Boot Upgrades](https://kairos.io/docs/upgrade/trustedboot/)

## Versioned Docs

Up until now, we only had one source of documentation. We know this can be problematic because you weren't able to tell from the documentation if a certain feature, configuration or else was meant for the nightly release or if it was already included in the Kairos version you're running. We did our best adding "notes" on some of the sections but as you can image this becomes problematic easily. For this reason, we've decided to version our documentation page starting with v3. To access it all you need to do is head to https://kairos.io/docs/ and click on the Releases menu in the navbar, which will list the available versions inclusing "master" which is our nighly release. Please check it out and let us know what you think.

## Known Issues

* 🐛 Raspberry: EFI booting no longer supported on kernels shipped with ubuntu > 22.04 [#2249](https://github.com/kairos-io/kairos/issues/2249)
* 🐛 Filesystem expansion on rpi4 doesn't work with Alpine [#1995](https://github.com/kairos-io/kairos/issues/1995)
* 🐛 cgroup_memory not mounted in Alpine rpi4 [#2002](https://github.com/kairos-io/kairos/issues/2002)
* 🐛 Upgrade on Alpine arm errors [#2135](https://github.com/kairos-io/kairos/issues/2135)
* 🐛 reset from the GRUB menu on Alpine amd64, gets stuck in an endless loop [#2136](https://github.com/kairos-io/kairos/issues/2136)

## Deprecation Warnings

Reading of `/etc/elemental/config.yaml` was broken for a bit but should be fixed in v3, but it will be eventually deprecated in one of the upcoming releases. If you're making use of it, please move this configuration to `/etc/kairos/config.yaml`


## Flavor Updates

* UKI Ubuntu and non-UKI Ubuntu differ a bit. This is because we need to make UKI Ubuntu as slim as possible. We will probably continue working towards this goal
* It is now possible to build Ubuntu 24.04 LTS, but we don't release any artifacts yet, and will only do so when it's officially released.

---

For a comprehensive view of all the changes in this release, please refer to [the full changelog](https://github.com/kairos-io/kairos/releases/tag/v3.0.0) (And be sure to check out the "Known issues" section for any potential hiccups.)

This release marks a significant milestone in the evolution of our project, and we want to extend our heartfelt thanks to everyone who contributed to this release. Whether through code contributions, reviews, bug reports, comments, debugging output. Your support and engagement are invaluable!

