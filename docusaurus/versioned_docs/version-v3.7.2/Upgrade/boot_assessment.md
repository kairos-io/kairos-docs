---
title: "Boot assessment"
sidebar_label: "Boot assessment"
sidebar_position: 7
date: 2024-09-17
description: Learn how Kairos handles failed upgrades
---

Kairos upgrades are atomic in the sense that the new version of the OS fully
replaces the old one or it doesn't replace it at all. This allows users to test
the upgrade in the lab, before they upgrade any of their nodes and be sure that
the upgrade will work the same way in production.

While this is very useful strategy, failed upgrades cannot be completely avoided.
Some difference in hardware, a network hick-up or even a human error, can result
in a failed upgrade. For systems in remote locations, upgrading to a non-bootable
OS is one of the worst scenarios.

For this reason, Kairos is taking various measures to minimize the possibility of
a non-bootable system. This section describes those measure and how they work.

## Automatic reboot in case of a kernel panic

- Simple installations:
  By default, Kairos adds `panic=5` to the kernel cmdline. This instructs the kernel to reboot after 5 seconds if a panic occurs.

- "Trusted boot" installations:
  The same option are included in [the default cmdline](https://github.com/kairos-io/AuroraBoot/blob/5d5bd2742520d654cd1bb865864acc3d37c43e57/pkg/constants/constants.go#L77), when an image is built with aurorabootk([trusted boot docs](/docs/v3.7.2/Installation/trustedboot/)).

## Automatic reboot in case of systemd crash

- Simple installations:
  By default, Kairos adds `rd.shell=0 systemd.crash_reboot=yes` to the kernel cmdline. This makes systemd restart in case it crashes ([Read more](https://www.freedesktop.org/software/systemd/man/249/systemd.html#systemd.crash_reboot))

- "Trusted boot" installations:
  The same options are included in [the default cmdline](https://github.com/kairos-io/AuroraBoot/blob/5d5bd2742520d654cd1bb865864acc3d37c43e57/pkg/constants/constants.go#L77), when an image is built with auroraboot ([trusted boot docs](/docs/v3.7.2/Installation/trustedboot/)).

## Booting to fallback

- Simple installations:
  In the sections above, we described how Kairos configures the system so that it automatically reboots when a failure occurs.
  Additionally, Kairos uses a combination of grub environment variables and sentinel files to detect that the failed boot,
  occurred after an upgrade. In that case, it sets the "fallback" boot entry as the default one.
  In other words, if the system fails to boot after an upgrade, the system will reboot automatically to the previous version
  of Kairos (the one before the upgrade).

- "Trusted boot" installations:
  While [a similar solution exists](https://systemd.io/AUTOMATIC_BOOT_ASSESSMENT/) in systemd to automatically reboot to a fallback entry, it's not yet implemented in Kairos. You can monitor [the tracking issue](https://github.com/kairos-io/kairos/issues/2864) for updates.

## Validating the image signatures (Trusted boot installations)

When Kairos is installed [in trusted boot mode](/docs/v3.7.2/Installation/trustedboot/), the OS image comes as a single signed file. The certificate signing the image has to be enrolled in the system's firmware database otherwise the system won't allow booting it. This is also true when Kairos is being upgraded to a new version (which is a new image). For this reason, when upgrading, the `kairos-agent` will perform a check to see if the certificate that signs the new image is enrolled (and not blacklisted) in the firmware database. If not, the upgrade will be aborted to avoid a situation where booting is not possible.
