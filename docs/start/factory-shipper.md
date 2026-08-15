---
title: Factory / OEM shipper
sidebar_position: 4
---

# Factory / OEM shipper

Who this is for: teams that build devices in a lab or warehouse and ship them to a customer site. Every unit must leave the factory identical. Field install has to be plug-and-power-on, with any per-site provisioning limited to certificates or a small cloud-config drop. The concern is producing a repeatable golden image and a clean mass-install path, not day-two orchestration.

## Product mapping

The pipeline is Factory to Builder to Provision to Fleet. [Factory](/docs/products/factory/) produces the golden OS image with `kairos-init`. [Builder](/docs/products/builder/) turns that image into an ISO, USB, or cloud artifact for the assembly line. [Provision](/docs/products/provision/) drives mass install and captures the fleet as it comes online. Fleet-scope inventory and phone-home are covered by [Fleet](/docs/products/fleet/); ongoing upgrades are handed off to Fleet or the [Operator](/docs/products/operator/) once devices reach the field.

## Level 1 — Guided

- [Kairos Factory](/docs/reference/kairos-factory) — build a golden OS image with `kairos-init`.
- [Build Kairos appliances](/docs/advanced/build) — end-to-end walkthrough for turning that image into shippable media.

## Level 2 — Automate

- [Custom cloud images](/docs/advanced/creating_custom_cloud_images) — bake cloud-config straight into the image so the field only supplies certs.
- [Build from scratch](/docs/reference/build-from-scratch) — the deeper, componentised build path when the guided flow is not enough.
- [Raw images with QEMU](/docs/reference/build_raw_images_with_qemu) — produce raw images for USB and SD-card flashing.
- [Hadron layers](/hadron-docs/layers) — compose pre-built Hadron layers into the shipping image.
- [OSArtifact](/operator-docs/osartifact) — emit OSArtifact CRs from CI so images are cluster-native build outputs.

## Level 3 — Extend

- [System extensions](/docs/advanced/sys-extensions) — ship optional features as sysexts instead of forking the base image.
- [Adding /opt to system extensions](/docs/advanced/adding_opt_to_system_extensions) — layer `/opt` content into a sysext for vendor payloads.
- [Artifacts](/docs/reference/artifacts) — the naming convention that keeps a factory's output catalog sane.

## Proof

This persona is based on real pre-flash provisioning work documented in the CNCF write-up on [integrating Kairos into an Edge AI platform](https://www.cncf.io/blog/2025/12/29/how-to-integrate-kairos-architecturally-into-an-edge-ai-platform/), which walks the flow from golden image to field bring-up.

## See also

- [Factory](/docs/products/factory/) — the golden-image product this persona lives in.
- [Provision](/docs/products/provision/) — mass install and first boot.
- [Regulated platform team](/docs/start/regulated-platform) — sibling persona for sites without upstream connectivity.
- [Edge AI fleet operator](/docs/start/edge-ai-fleet) — sibling persona that picks up the devices once they land.
