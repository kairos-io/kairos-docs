---
slug: /integrations
title: "Integrations"
sidebar_label: "Overview"
sidebar_position: 0
description: Notes on running third-party projects on Kairos. Each page links to the upstream guide and covers only what changes on Kairos.
---

Third-party projects that run on Kairos. Each page links to the upstream guide first and covers only what is specific to Kairos.

- [Dragonfly and Nydus](/docs/integrations/dragonfly-nydus/): Run the Dragonfly and Nydus snapshotter with a persistent state directory.
- [Kyverno](/docs/integrations/kyverno/): Verify Kairos image signatures with Kyverno before upgrading nodes.
- [MetalLB](/docs/integrations/metallb/): Deploy MetalLB load balancing on Kairos with K3s.
- [LocalAI](/docs/integrations/localai/): Run LocalAI on Kairos with K3s.
- [Keylime agent](/docs/integrations/keylime/): Run the Keylime agent for runtime attestation.

## Adding an integration

An integration is a third-party project that needs Kairos-specific steps, such as a bundle, a bind mount, a custom image, or a cloud-config setting. A Kairos feature that is documented in its own section, such as bundles or installation methods, does not belong here.

Follow these rules when you add a page:

- Start with a link to the upstream guide. Do not copy the upstream install steps.
- Document only what is different on Kairos.
- Put runtime settings in the user cloud-config, not in image build steps, unless the image build is the point of the page.
- Keep examples minimal. Show the smallest config that works.
- Do not add lines about where or how the page was tested.
- Do not add Kairos version claims unless the source code shows them.

To start a new page, copy `docs/integrations/_template.md` in the repository. The template has the page skeleton and HTML comments that explain each section.
