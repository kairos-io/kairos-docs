---
title: "Announcements"
linkTitle: "Announcements"
icon: fa-solid fa-bullhorn
weight: 2
description: "A single stop to learn about Known Issues, Deprecation Warnings and/or Remarkable Changes in this release"
sitemap_exclude: true
---

{{% alert title="Enki" color="warning" %}}
Enki has been deprecated in favor of [AuroraBoot](https://github.com/kairos-io/auroraboot).
{{% /alert %}}

{{% alert title="Known Issues" color="warning" %}}
- RPi EFI booting no longer supported on kernels shipped with Ubuntu 24.04+ [#2249](https://github.com/kairos-io/kairos/issues/2249)
- RPi Alpine is a bit slow to sync the date on boot
{{% /alert %}}

{{% alert title="Deprecation Warnings" color="primary" %}}
Reading of `/etc/elemental/config.yaml` will be deprecated in favor of `/etc/kairos/config.yaml` in a future release. Use `/etc/kairos/config.yaml` instead. [#2233](https://github.com/kairos-io/kairos/issues/2233)
{{% /alert %}}

{{% alert title="Config dirs read ordering" color="primary" %}}
Starting on v3.2.0, we have agreed on the order the config dirs are read upon. See the [cloud-config]({{< relref "../Architecture/cloud-init/#configuration-order" >}}) page for more info.
{{% /alert %}}

{{% alert title="Remarkable Changes" color="info" %}}
By default, Uki artifacts (identified by the `-uki` suffix) no longer include Linux modules and firmware in the image. Real-world testing has shown that many EFI firmwares are very particular about the size of the EFI image, often refusing to boot if the file exceeds 300-400MB. Given the wide variety of EFI firmware implementations, predicting whether a UKI EFI file will boot on different hardware is challenging.

To enhance compatibility, we decided to slim down the UKI files by removing the largest components: the Linux modules and firmware packages. This results in EFI files around 200-300MB, which are much more likely to boot correctly across various EFI implementations.

However, this change comes with a trade-off. Smaller images, while being more compatible with a wide range of EFI firmwares, may lack comprehensive hardware support because they do not include all the Linux modules and firmware packages. This means that certain hardware components may not function correctly or optimally when using these slimmer UKI images.

On the other hand, larger UKI images, which include all necessary modules and firmware for extensive hardware support, provide better functionality and compatibility with a broad range of hardware. However, these larger images are more likely to encounter boot issues due to EFI firmware limitations, as many EFI implementations refuse to boot files larger than 300-400MB.

We publish `-uki` artifacts ourselves, which are the slimmed versions, as examples of how to build a slimmer UKI artifact. **While these serve as a reference, we recommend always building your own custom images to tailor them to your specific hardware needs.** If you need to include those packages for full hardware support, you can create a custom artifact to add them back, as detailed in the Kairos docs.

We recommend keeping your UKI EFI files as small as possible to maximize boot success across different EFI firmware implementations. While smaller images offer better compatibility, they may lack full hardware support. Conversely, larger images, which include all necessary modules and firmware, provide comprehensive hardware support but may fail to boot due to EFI firmware constraints.
{{% /alert %}}
