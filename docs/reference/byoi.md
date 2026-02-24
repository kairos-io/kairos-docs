---
title: "Bring Your Own Image (BYOI)"
sidebar_label: "Bring Your Own Image"
sidebar_position: 4
description: Build and publish your own Kairos images while keeping full control of release cadence.
---

Kairos still supports multiple Linux distributions. What changed is where official prebuilt artifacts are focused: docs and default release flow now center on Hadron.

If you run Ubuntu, Alpine, openSUSE, Debian, Fedora, Rocky, or another supported base, the recommended path is BYOI: build and publish your own images while keeping Kairos lifecycle and upgrade semantics.

## Why BYOI

- You keep full control over release cadence and patch windows.
- You can align base OS updates with your own security and compliance process.
- The tested distro matrix remains broad in `kairos-init`, even when not all artifacts are published by default.

## Pick your pipeline path

### 1) GitHub-only path (fastest)

Use the Kairos Factory GitHub Action to build and publish artifacts in GitHub Actions.

- Good default for small teams.
- Works well with free GitHub-hosted runners for many workflows.
- Keeps your build logic in repo and easy to audit.

Start here: [Kairos Factory reference](/docs/reference/kairos-factory/)

### 2) Generic CI path (any CI system)

Use AuroraBoot and Kairos Factory tooling directly in your own CI pipeline (GitHub, GitLab, Jenkins, Tekton, etc.).

- Same model, no GitHub lock-in.
- Full control over runners, registries, and signing.

Start here:

- [AuroraBoot reference](/docs/reference/auroraboot/)
- [Build from scratch](/docs/reference/build-from-scratch/)
- [Build raw images with qemu](/docs/reference/build_raw_images_with_qemu/)

### 3) Kubernetes-native path (Kairos Operator)

Use the Kairos Operator to build OS artifacts directly in Kubernetes using the OSArtifact CRD.

- Build ISOs, cloud images, and netboot artifacts as Kubernetes-native resources.
- Integrates with existing Kubernetes workflows and GitOps patterns.
- Manage upgrades and operations on Kairos nodes from within Kubernetes.

Start here: [Kairos Operator](/docs/operator/)

## Suggested workflow

1. Select your base distribution and release.
2. Build core/standard image with Kairos Factory tooling.
3. Publish to your own registry/release assets.
4. Use that image reference for installs, resets, and upgrades.
5. Rebuild on your cadence when upstream distro or Kairos updates are needed.

## Notes on legacy examples

Some docs still include concrete flavor/release image examples to show naming patterns. Treat them as templates. For non-Hadron flavors, prefer publishing your own image artifacts and referencing those in production workflows.
