---
title: "Kairos release v3.4.0"
date: 2025-04-24
linkTitle: "Kairos release v3.4.0"
description: "Kairos release v3.4.0"
author: Itxaka Serrano ([GitHub](https://github.com/itxaka))
---
<h1 align="center">
  <br>
     <img width="184" alt="kairos-white-column 5bc2fe34" src="https://user-images.githubusercontent.com/2420543/215073247-96988fd1-7fcf-4877-a28d-7c5802db43ab.png">
    <br>
<br>
</h1>


# Kairos 3.4.0: Building Forward with Simplicity, Cloud Reach, and Runtime Flexibility

Every now and then, a release isn't just a version bump—it’s a reset button. Kairos 3.4.0 is one of those releases.

In the last few months, we’ve been heads-down rethinking what makes Kairos powerful, approachable, and future-proof. The result is a foundational overhaul: a brand-new build system, native images for all major cloud providers, streamlined customization through system extensions, and a tighter Kubernetes story with built-in support for k0s. This release isn’t just packed with features—it reflects where the project is heading and how our community is shaping that direction.

Let’s walk through the biggest milestones in Kairos 3.4.0, how they work, and why they matter.

## 🛠️ Rebuilding Kairos from the Ground Up with `kairos-init`

We’ve officially said goodbye to Earthly and rebuilt the Kairos build system from scratch. The new system, centered around `kairos-init`, is faster, cleaner, and deeply inspired by the declarative configuration model we’ve honed through Yip.

> “We didn’t just want to make the build system better—we wanted to make it understandable and hackable.” — from [our deep dive](https://kairos.io/blog/2025/03/26/how-we-rebuilt-kairos-building-from-the-ground-up/)

This change makes it easier than ever to create your own derivative OS with Kairos. If you’re customizing images or building new flavors, the [`kairos-factory` documentation](https://kairos.io/docs/reference/kairos-factory/) is your new best friend. It’s built for composability, consistency, and speed.

## ☁️ Kairos Goes Native on the Cloud

With 3.4.0, Kairos now offers **official cloud images** for AWS, Azure, and GCP. That means you can deploy Kairos right from your cloud console—no manual image imports, no extra setup.

- [Launch on AWS](https://kairos.io/docs/installation/aws/)
- [Deploy via Azure Marketplace](https://kairos.io/docs/installation/azure/)
- [Spin up on GCP](https://kairos.io/docs/installation/gce/)

This makes it easier to integrate Kairos into hybrid, multi-cloud, or CI-driven workflows—and aligns with our goal to make Kairos ready-to-go for every environment.

## 🚀 Kubernetes with k0s: The Meta-Distribution Vision

With native support for [k0s](https://k0sproject.io/), Kairos is now a **meta-distribution for Kubernetes**—fully declarative, fully integrated. Whether you're deploying edge nodes or building HA clusters, k0s + Kairos is a minimal, clean foundation.

You can now toggle between k3s and k0s setups in the updated docs and configure each using the same Kairos cloud-init model.  
👉 [Blog deep dive](https://kairos.io/blog/2025/04/02/kairos-meets-k0s-a-meta-distribution-for-kubernetes-is-born/)

## 🧩 Live Customization with System Extensions

Say goodbye to image rebuilds for small tweaks. System extensions let you declaratively **add or modify behavior on a running Kairos system**, and 3.4.0 ships with built-in CLI support to install, remove, enable, and disable extensions.

👉 [Learn more](https://kairos.io/blog/2025/04/15/system-extensions-simplified-live-customization-with-kairos/)  
👉 [System Extensions docs](https://kairos.io/docs/advanced/sys-extensions/)

This opens the door to layered, profile-based systems that evolve post-deployment—great for both immutable infrastructure and rapidly changing environments.

## 🙌 New Contributor Shout-Out

Huge thanks to **@jimmycathy** for their first contribution to the project! 🎉  
PR: https://github.com/kairos-io/kairos/pull/3255

We’re always excited to welcome new contributors. Whether it’s documentation, ideas, or PRs—every bit helps make Kairos stronger for everyone.

---

Stay tuned as we continue evolving Kairos with your feedback and use cases in mind. Got a question or want to share how you’re using 3.4.0? Join the conversation in our [Discord](https://kairos.io/community/) or [GitHub Discussions](https://github.com/kairos-io/kairos/discussions).