
---
title: "Known Issues"
linkTitle: "known-issues"
weight: 20
menu:
  main:
    weight: 20
---

  🐛 Raspberry: EFI booting no longer supported on kernels shipped with ubuntu > 22.04 https://github.com/kairos-io/kairos/issues/2249

We haven't been able to address the following issues on Alpine:
  🐛 It's not possible to login on an Alpine 3.18 RPi https://github.com/kairos-io/kairos/issues/2439
  🐛 Filesystem expansion on rpi4 doesn't work with Alpine https://github.com/kairos-io/kairos/issues/1995
  🐛 cgroup_memory not mounted in Alpine rpi4 https://github.com/kairos-io/kairos/issues/2002
  🐛 Upgrade on alpine arm errors https://github.com/kairos-io/kairos/issues/2135
  🐛 reset from the GRUB menu on alpine, gets stuck in an endless loop https://github.com/kairos-io/kairos/issues/2136
  
- Filesystem expansion on rpi4 doesn't work with Alpine [#1995](https://github.com/kairos-io/kairos/issues/1995)
- `cgroup_memory` not mounted in Alpine rpi4 [#2002](https://github.com/kairos-io/kairos/issues/2002)
- Upgrade on Alpine arm64 errors [#2135](https://github.com/kairos-io/kairos/issues/2135)
- Reset from the GRUB menu on Alpine gets stuck in an endless loop [#2136](https://github.com/kairos-io/kairos/issues/2136)
- EFI Booting no longer supported on Kernels shipped in Ubuntu 23.10 [#2240](https://github.com/kairos-io/kairos/issues/2249)

Deprecation warnings:

Reading of `/etc/elemental/config.yaml` is working again but will be deprecated in favor of `/etc/kairos/config.yaml`

If you found a different issue that hasn't been mentioned before, please [open a report on our main repo](https://github.com/kairos-io/kairos/issues/new).