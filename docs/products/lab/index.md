---
title: Kairos Lab
sidebar_position: 1
---

# Kairos Lab

Spin up Kairos in a local VM for demos, PoCs, and hands-on learning. The Lab uses the Hadron flavor by default and gets you from zero to a running Kairos node in minutes. It is the fastest path from "never seen Kairos" to "running Kairos".

## How it fits

Kairos Lab is not part of the production pipeline. It wraps the quickstart flow behind a single bootstrap script — [`/install-kairos-lab.sh`](/install-kairos-lab.sh) — so you can evaluate the platform without touching real hardware or a CI pipeline. Once comfortable, graduate to [Kairos Factory](/docs/products/factory/) for real image builds and [Kairos Provision](/docs/products/provision/) for real installs.

## Level 1 — Guided

- [Hadron VM quickstart](/quickstart/) — the Lab flow end-to-end.
- [Extend the running lab OS via Dockerfile](/quickstart/extending-the-system-dockerfile) — add packages to a live lab node.
- [Lifecycle management](/quickstart/lifecycle-management) — perform a first upgrade in the lab.
- [Trusted Boot](/quickstart/trusted-boot) — enable measured boot in the lab.

## Level 2 — Automate

- [VirtualBox scenario](/docs/examples/virtual-box) — reproducible local VM setup.
- [Single-node cluster](/docs/examples/single-node) — first Kubernetes cluster on Kairos.
- [Multi-node cluster](/docs/examples/multi-node) — scale the lab to multiple nodes.

## Level 3 — Extend

- [Bring-Your-Own-Image](/docs/reference/byoi) — move from Lab to a custom base image.
- [Kairos Factory](/docs/reference/kairos-factory) — graduate from Lab to reproducible Factory builds.

## Reference

- [Quickstart](/quickstart/) — canonical entry point for the Lab.

## See also

- [Kairos Installer](/docs/products/installer/)
- [Kairos Factory](/docs/products/factory/)
- [Quick eval](/docs/start/quick-eval)
