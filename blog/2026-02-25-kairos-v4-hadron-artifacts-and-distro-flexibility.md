---
authors:
  - mauro-morales
description: Starting with Kairos v4, the project will publish Hadron-based artifacts only.
slug: 2026/02/25/kairos-v4-hadron-artifacts-and-distro-flexibility
tags:
  - kairos
title: "Kairos v4: Hadron-Only Artifacts with Ongoing Distro Support"
---

Starting with **Kairos v4**, the Kairos project will publish **Hadron-based artifacts only**.

This decision allows us to reduce maintenance cost, focus engineering effort where it has the most impact, and ship improvements faster.

<!-- truncate -->

If you want the full background and rationale, please read the discussion in this issue:

[Kairos issue #3806](https://github.com/kairos-io/kairos/issues/3806).

## What is changing

Official artifacts published by the Kairos project for v4 and later will be based on Hadron.

## What is not changing

Support for different Linux distributions remains one of the core features of Kairos.

The `kairos-init` component, which is responsible for converting those distributions into Kairos variants, continues to validate a wide distro matrix: **8 different distros and multiple releases**.

You can see the exact test matrix here:

[`kairos-init` distro test matrix](https://github.com/kairos-io/kairos-init/blob/main/.github/workflows/test.yml#L22-L39).

## Build your own distro pipeline

If you are using GitHub, building your own release pipeline for a specific distribution is straightforward with:

[`kairos-factory-action`](https://github.com/kairos-io/kairos-factory-action).

It is mostly a matter of setting a few parameters, and it is exactly how we still build one-distro pipelines today:

[Kairos release workflow example](https://github.com/kairos-io/kairos/blob/3ba6e3e9d9d15aa9d3ba0a414d2e512db44f24d7/.github/workflows/release.yaml#L11).

If you are not using GitHub, no problem: you can build directly with AuroraBoot:

[AuroraBoot reference docs](https://kairos.io/docs/reference/auroraboot/).

## Why we believe this is the right move

We understand this may introduce some inconvenience for users who relied on project-published artifacts for multiple distros.

At the same time, this change helps us keep Kairos sustainable and gives us more time to focus on features, quality, and platform evolution.

It also aligns with the Kairos ethos: giving end users control over their own release cadence and distribution flexibility.

## Feedback and support

If you have questions, issues, or feedback, please reach out:

Open an issue on GitHub: [https://github.com/kairos-io/kairos/issues/new/choose](https://github.com/kairos-io/kairos/issues/new/choose).

Join the CNCF Slack (`#kairos`): [https://slack.cncf.io/](https://slack.cncf.io/).
