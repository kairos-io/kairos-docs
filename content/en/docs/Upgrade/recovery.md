---
title: "Recovery"
linkTitle: "Recovery"
weight: 2
date: 2023-08-07
description: >
---


## Upgrading recovery

As the recovery its an important piece of the Kairos system, we don't allow upgrading the active system and recovery at the same time as 
it could lead to a broken active plus a broken recovery, limiting how we can recover the system

Due to this, the upgrade command provides an extra flag that will upgrade the recovery only. It uses the same system and and flags as the normal upgrade

```bash
sudo kairos-agent upgrade --recovery
```


We recommend that on upgrades, the next step after restarting to the new system and checking that everythig is working as expected, that the recovery is immediately upgraded to the latest version.

All the information about the [manual upgrade docs]({{< relref "manual" >}}) is valid in the recovery case as well.
