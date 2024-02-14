
---
title: "Known Issues"
linkTitle: "known-issues"
weight: 20
menu:
  main:
    weight: 20
---

{{% alert color="warning" %}}
The following issues are specific to v3.0.0
{{% /alert %}}

- Filesystem expansion on rpi4 doesn't work with Alpine (#1995)[https://github.com/kairos-io/kairos/issues/1995]
- cgroup_memory not mounted in Alpine rpi4 (#2002)[https://github.com/kairos-io/kairos/issues/2002]
- Upgrade on alpine arm errors (#2135)[https://github.com/kairos-io/kairos/issues/2135]
- reset from the GRUB menu on alpine, gets stuck in an endless loop (#2136)[https://github.com/kairos-io/kairos/issues/2136]


If you found a different issue that hasn't been mentioned before, please [open a report on our main repo](https://github.com/kairos-io/kairos/issues/new).