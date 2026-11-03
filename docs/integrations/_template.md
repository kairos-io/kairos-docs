---
title: "Project name"
sidebar_label: "Project name"
description: One sentence on what the project does on Kairos
---

<!-- Lead with the upstream guide. Link the install page, not the project home page. -->
Install Project name by following the upstream guide:
[Upstream install guide](https://example.com/upstream/install).

<!-- One or two sentences. Say what this page covers and what it leaves to the upstream guide. -->
The rest of this page covers only what is different on Kairos.

## Prerequisites

<!-- List what the reader needs before starting: a Kairos image, a kernel feature, a bundle, a network range. Keep it short. -->

- A Kairos image that includes the features this project needs.

## Kairos-specific configuration

<!-- Show the smallest cloud-config that works. Runtime settings go in the user cloud-config. -->
<!-- Explain only the keys that are Kairos-specific. Do not repeat upstream options. -->

```yaml
#cloud-config

# Replace with the real keys for this project.
stages:
  boot:
    - name: "Configure Project name"
      commands:
        - echo "replace me"
```

## Verify

<!-- Give one or two commands that show the project is running. Use real output where you can. -->

```bash
$ kubectl get pods -A
```

## Troubleshooting and notes

<!-- Short list of known issues that are specific to Kairos. Link upstream for everything else. -->

- Add Kairos-specific notes here. Remove this section if there are none.
