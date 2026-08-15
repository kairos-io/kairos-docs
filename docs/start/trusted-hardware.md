---
title: Trusted hardware gateway
sidebar_position: 5
---

# Trusted hardware gateway

## Who this is for

Operators shipping managed hardware to customers, or hosting it on their behalf, where the device is a network gateway into the operator's infrastructure. The wrong OS on those boxes is a direct compromise of the backend, so every unit must only ever run the operator's approved, attested stack. Fleets are large, remote, and unattended — boot integrity is a product requirement, not a checklist item.

## Product mapping

The trusted-hardware path leans on [Factory](/docs/products/factory/) for the trusted-boot profile that fixes the signing chain and measured-boot policy, [Builder](/docs/products/builder/) for the UKI and Secure Boot-enabled artifacts, and [Provision](/docs/products/provision/) to preload those artifacts at the factory before units ship. [Fleet](/docs/products/fleet/) holds the key store and node inventory for remote lifecycle. Level 3 work reaches into kcrypt and Immucore for TPM-bound disks and remote attestation.

## Level 1 — Guided

- [Trusted Boot architecture](/docs/architecture/trustedboot) — how UKI, Secure Boot, and measured boot compose in Kairos.
- [Secure Boot architecture](/docs/architecture/secureboot) — the signing-chain model that trusted hardware inherits.
- [Trusted Boot quickstart](/quickstart/trusted-boot) — first end-to-end trusted-boot run on a VM.

## Level 2 — Automate

- [Trusted Boot installation](/docs/installation/trustedboot) — production install flow for signed UKI images.
- [Trusted Boot upgrades](/docs/upgrade/trustedboot) — atomic upgrade path that preserves the measured-boot chain.
- [Boot assessment with Trusted Boot](/docs/examples/boot_assessment_trusted_boot) — combining automatic rollback with signed boot.
- [Firmware sysexts under Trusted Boot](/docs/examples/trusted-boot-firmware-sysext) — shipping vendor firmware without breaking measurements.
- [Rotating Secure Boot keys](/docs/advanced/revoking-secureboot-access) — revoke and re-issue the SB signing chain across a fleet.

## Level 3 — Extend

- [TPM-bound partition encryption](/docs/advanced/partition_encryption) — LUKS keys sealed to the platform's measurements.
- [Remote attestation with Keylime](/docs/examples/keylime) — prove to a verifier that a remote node booted the expected stack.
- [Boot assessment internals](/docs/upgrade/boot_assessment) — how Kairos detects a bad boot and falls back.

## Proof

This persona is modeled on the DeEEP Network public docs; DeEEP's public documentation does not name Kairos explicitly. See [docs.deeep.network](https://docs.deeep.network/), in particular the [how-it-works](https://docs.deeep.network/introduction/how-it-works.md) and [MS-01 hardware](https://docs.deeep.network/hardware/ms-01-deeep.md) pages, for the shape of the deployment: operator-signed images, remote fleets, and hardware that must not boot anything else.

## See also

- [Builder](/docs/products/builder/) — the artifact pipeline that produces signed UKIs.
- [Provision](/docs/products/provision/) — factory preload and first-boot enrollment.
- [Edge AI fleet operator](/docs/start/edge-ai-fleet) — sibling persona for unattended edge fleets without the trusted-boot hard requirement.
- [Regulated platform team](/docs/start/regulated-platform) — sibling persona focused on CI-driven image delivery.
