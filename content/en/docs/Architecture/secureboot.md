---
title: "SecureBoot support"
linkTitle: "SecureBoot support"
weight: 3
date: 2024-01-29
---


## SecureBoot support implementation

Currently Kairos supports SecureBoot based on the upstream artifacts. 
We piggyback on the upstream artifacts to be properly signed in order to support SecureBoot.

Before this was supported, we shipped a single set of artifacts that were signed by one of the upstream distros.
That meant that only that distro was supported under SecureBoot as we needed all artifacts in the chain to be signed with the same key. So that meant that secureboot was only supported on the same distro that we obtained the artifacts from.

 - Shim (signed by X) -> grub (signed by X) -> kernel (signed by X) = SecureBoot
 - Shim (signed by X) -> grub (signed by X) -> **kernel (signed by Y)** = No SecureBoot


Now, instead of using a single set of artifacts, we use the upstream artifacts directly, so we can support SecureBoot on all the distros that support it directly with the upstream signatures. This also allows us to pinpoint specific bugs of a given artifact with the upstream report.


Any of the current supported flavors in Kairos can be used with SecureBoot out of the box in UEFI mode.

Currently Alpine is not supported as it does not provide signed artifacts by default and relies in users generating their own keys to sign those.

#### Artifacts used on each distro

 - shim
 - grub
 - kernel
