---
title: "Boot assessment"
linkTitle: "Boot assessment"
weight: 7
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

- Non-UKI installations:
  By default, Kairos adds `panic=5` to the kernel cmdline. This instructs the kernel to reboot after 5 seconds if a panic occurs.
- UKI installations:
  The cmdline option has to be added manually when creating the `.efi` artifacts ([Read how]({{ <relref "../Installation/trustedboot.md#additional-efi-entries" }})).
