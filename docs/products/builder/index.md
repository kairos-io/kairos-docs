---
title: Kairos Builder
sidebar_position: 1
---

# Kairos Builder

Builder turns a Kairos OCI image into a bootable artifact. It takes the container image produced by Kairos Factory and emits an ISO, cloud image (AMI, qcow2, vhd), raw disk image, or a UKI bundle for Trusted Boot.

## How it fits

Builder sits between image assembly and machine bring-up. It consumes the OCI output of [Kairos Factory](/docs/products/factory/) and produces the media that [Kairos Provision](/docs/products/provision/) installs onto target machines, or that [Kairos Installer](/docs/products/installer/) boots as live media.

Under the hood, Builder is powered by the AuroraBoot engine. See the [AuroraBoot reference](/docs/reference/auroraboot) for CLI details.

## Level 1 — Guided

- [Build Kairos appliances](/docs/advanced/build) — end-to-end walkthrough for producing a bootable artifact from an OCI image.
- [Build raw images with QEMU](/docs/reference/build_raw_images_with_qemu) — produce raw disk images locally with QEMU.

## Level 2 — Automate

- [Custom cloud images](/docs/advanced/creating_custom_cloud_images) — build AMI, qcow2, and vhd artifacts tuned for cloud targets.
- [Trusted Boot / UKI artifacts](/docs/installation/trustedboot) — produce signed UKI bundles for measured boot.
- [Artifact naming convention](/docs/reference/artifacts) — how output artifacts are named and versioned.
- [Image support matrix](/docs/reference/image_matrix) — supported base OS, arch, and Kubernetes distribution combinations.

## Level 3 — Extend

- [Ship optional content as sysexts](/docs/advanced/sys-extensions) — package optional software as systemd system extensions.
- [Layer /opt into sysexts](/docs/advanced/adding_opt_to_system_extensions) — bring `/opt` payloads into the sysext model.
- [From-scratch build path](/docs/reference/build-from-scratch) — assemble a Kairos artifact without the standard base images.

## Reference

- [AuroraBoot](/docs/reference/auroraboot) — CLI reference for the underlying build engine.
- [Artifacts](/docs/reference/artifacts) — artifact naming and layout.
- [Image matrix](/docs/reference/image_matrix) — supported build targets.

## See also

- [Kairos Factory](/docs/products/factory/) — upstream: produces the OCI image Builder consumes.
- [Kairos Provision](/docs/products/provision/) — downstream: installs the artifact onto machines.
- [Factory-to-shipper flow](/docs/start/factory-shipper) — the full path from source to bootable media.
