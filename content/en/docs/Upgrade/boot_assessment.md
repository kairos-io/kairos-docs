---
title: "Boot assessment"
linkTitle: "Boot assessment"
weight: 7
date: 2024-09-17
description: Learn how Kairos handles failed upgrades
---

Kairos upgrades are atomic in the sense that the new version of the OS fully
replaces the old one or it doesn't replace it at all. This allows users to test
the upgrade in the lab they upgrade any of their nodes and be sure that the upgrade
will look exactly the same in production.

While this is very useful strategy, failed upgrades cannot be completely avoided.
Some different in hardware or a network hick-up, or even a human error, can result
in a failed upgrade. For systems in remote locations, upgrading to a non-bootable
OS is one of the worst scenarios.

For this reason, Kairos is taking various measures to minimize the possibility of
an non bootable system. This section describes those measure and how they work.


## 
