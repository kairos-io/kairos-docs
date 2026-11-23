---
title: "Release policy"
sidebar_label: "Release policy"
sidebar_position: 11
---

This page explains how often Kairos is released, how a version number is chosen, and which versions receive fixes.

## Which version to run

Run the latest release. Only the latest Kairos release receives fixes, including security fixes. The latest release is the one marked "Latest" on the [releases page](https://github.com/kairos-io/kairos/releases).

A maintainer may backport a fix to an older minor version by hand. This is done on a best-effort basis and is not promised. The supported versions are also listed in the [security policy](https://github.com/kairos-io/kairos/blob/master/SECURITY.md).

## How often Kairos is released

Kairos is released from the `master` branch every Monday at 06:00 UTC. A release is cut when both of these are true:

- The latest finished test run on `master` passed.
- At least one change was merged since the previous release.

Otherwise that week is skipped. A maintainer approves each release before it is published, so a release can appear later than Monday.

## How the version number is chosen

The version number comes from the titles of the changes merged since the previous release. Each title follows the [Conventional Commits](https://www.conventionalcommits.org/) format.

| Change | Version bump | Example |
|---|---|---|
| A new feature (`feat`) | Minor | `v4.3.0` to `v4.4.0` |
| Any other change, such as `fix`, `docs` or `ci` | Patch | `v4.3.0` to `v4.3.1` |
| A breaking change (`!` after the type, or a `BREAKING CHANGE:` footer) | Major | `v4.3.0` to `v5.0.0` |

A breaking change is not picked up by the weekly run. A maintainer starts that release by hand, and it is approved like any other release.

## Hadron

[Hadron](/hadron-docs/) is the minimal base OS that Kairos images can be built from. It is a rolling release with no long-term support versions, and it is released twice a week. As with Kairos, run the latest Hadron release to receive fixes.

## Support

Help with older versions is best-effort and comes from the community. [Spectro Cloud](https://www.spectrocloud.com/) offers enterprise support for users who need more.
