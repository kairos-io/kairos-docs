---
title: "How We Rebuilt Kairos building From the Ground Up"
date: 2025-03-26T10:53:13+01:00
author: Itxaka Serrano (([GitHub](https://github.com/itxaka))
---

# How We Rebuilt Kairos building From the Ground Up

## 🧱 Introduction

Building Kairos has always been about more than assembling images — it's about shaping a flexible, powerful OS tailored for the edge. Over the past couple of years, we've learned a lot while navigating how to build and maintain Kairos across a growing list of base distributions, architectures, and board-specific targets.

Today, we’re excited to introduce something that marks a turning point in how Kairos is built: **`kairos-init`**.

This post isn't just about a new tool. It’s about simplifying complexity, rediscovering clarity, and embedding hard-earned lessons into something lean and extensible. If you've followed our journey, you'll know that we've gone from Dockerfiles to Earthly, and now to a new approach centered on declarative simplicity with Yip.

In this post, we’ll take you behind the scenes:
- Why the old ways worked (until they didn’t)
- How we outgrew our tooling
- What `kairos-init` changes — and why it matters

This is the story of how we rebuilt the foundation of Kairos, one layer at a time.

## 🐳 The Early Days: Building with Dockerfiles

When Kairos first took shape, our needs were simple. We wanted a predictable, repeatable way to turn a base Linux distribution into a fully working Kairos image. And at the time, the most straightforward path was through a set of handcrafted **Dockerfiles** — one for each supported base.

Need Kairos on Ubuntu? There was a Dockerfile for that. OpenSUSE? Another one. Want to tweak something for a Raspberry Pi or test an Alpine variant? Copy, paste, modify.

This worked — until it didn’t.

At first, it was empowering. We could iterate quickly, test changes, and get a Kairos image up and running in no time. Each Dockerfile acted like a scriptable recipe for image creation. But as we started expanding support for more:
- 🧱 **Distributions** (Ubuntu, OpenSUSE, Alpine, Rocky, Fedora…)
- ⚙️ **Architectures** (x86_64, ARM64)
- 📦 **Boards and platforms** (Raspberry Pi, NVIDIA Jetson, cloud providers…)

… the number of Dockerfiles exploded.


<p align="center">
  <img src="/images/init-1.png" alt="Kairos Dockerfiles in the wild (Version 2.3.0)">
  <br>
  <em>Kairos Dockerfiles in the wild (Version 2.3.0)</em>
</p>

_Kairos Dockerfiles in the wild (Version 2.3.0)_

Maintaining them became a slow grind. Every distro had its quirks. Every version bump required tweaks. Repeating common steps across files introduced subtle bugs. And worst of all, it was hard to scale — we were reinventing the same process in N different places, each slightly different, each easy to break.

We needed a better way.

## 🌍 Scaling Painfully: Enter Earthly

As the number of supported distros, architectures, and boards grew, so did the pain of managing our Dockerfiles. It wasn’t just about duplication anymore — it was about orchestration, coordination, and staying sane across a forest of moving parts.

So we took the next step and adopted **[Earthly](https://earthly.dev/)**.

Earthly gave us a powerful framework to unify and modularize our builds. Instead of one Dockerfile per case, we could define reusable steps, build pipelines, and cache logic across flavors and platforms. It brought real structure to our chaos.

With Earthly, we gained:
- 🔁 **Reusable modules** for common build logic
- 🧩 **Parameterized builds** across distros and versions
- 🧠 **Smarter caching**, which cut build times drastically
- 🤖 **Better CI integration**, especially in GitHub Actions
- 🏗️ **Cross-architecture support** (building ARM images from x86 machines)

It was a massive improvement. Kairos became easier to scale, easier to extend, and more robust in CI/CD pipelines. We could merge several Dockerfiles into a single one for that given Flavor and make earthly trigger the right steps based on the target architecture or version.

<p align="center">
  <img src="/images/init-2.png" alt="Less lines is always better, right? (Version 3.3.1)">
  <br>
  <em>Less lines is always better, right? (Version 3.3.1)</em>
</p>


But the cost of complexity caught up with us.

Earthly was powerful, but also heavy. Setting up the environment required more tooling and context. Onboarding new contributors meant explaining layers of build abstraction. And eventually, even Earthly couldn’t fully hide the fact that we were fighting the complexity we had slowly built up.

As our use cases expanded — with more devices, more customization, more flavors — our build logic became a tangled web of conditionals and overrides.


<p align="center">
  <img src="/images/init-3.png" alt="The Earthly pipeline grows instead (Version 3.3.1)">
  <br>
  <em>The Earthly pipeline grows instead (Version 3.3.1)</em>
</p>


We needed a reset. A system built from the start for clarity and adaptability.

## 🧨 Reaching the Breaking Point

By this stage, we had all the signs of a powerful yet brittle system.

Every new board support request — whether for a Jetson device, RPi variant, or some obscure industrial box — meant another round of “how do we fit this into the Earthly pipeline without breaking 10 other things?” Even small changes to the build logic carried unintended ripple effects. Maintenance became a game of regression whack-a-mole.

Our internal complexity had quietly outpaced the benefits of our tooling.

- We were juggling **multiple abstraction layers**
- Supporting a new architecture meant rewriting or extending **multiple Earthfiles**
- Troubleshooting builds required context-switching between tools and environments
- Most importantly, it became **hard for contributors to participate**

That’s when we stopped and asked: *What if we could start fresh?*

The answer was `kairos-init`.

## ✨ The Breakthrough: `kairos-init` and Yip

`kairos-init` is a CLI tool that encapsulates everything needed to transform **any base Linux image** into a fully Kairos system — with nothing more than a standard `Dockerfile`.

By running `kairos-init BUILD` in a Dockerfile, it:
- Inspects the base image
- Generates a Yip configuration
- Executes that config to:
  - Install necessary packages
  - Add the Kairos framework (binaries, configs, init hooks)
  - Patch the initramfs
  - Link kernel files
  - Apply any workarounds or tweaks

The result is a container image that’s Kairos-ready — no extra steps, no complex layering.

You can then:
- Use it as an **upgrade image**
- Extend it with Kubernetes runtimes like `k3s` or `k0s` using flags
- Convert it into various formats with [AuroraBoot](https://github.com/kairos-io/AuroraBoot):
  - ISO
  - Raw image
  - Cloud image
  - PXE bootable
  - EFI Unified System Image

And because it’s just a Dockerfile, it drops right into any existing workflow:
- CI/CD pipelines
- Local testing
- Version-controlled infra repos

## 🌤 A Cleaner Future

With `kairos-init`, we’ve:
- Simplified builds down to one step
- Removed the need for Earthly or complex pipelines
- Made Kairos accessible to new contributors and integrators
- Enabled future growth without growing technical debt

We’re no longer managing complexity — we’ve replaced it with clarity.

## 🔭 What’s Next

What’s ahead:
- More `kairos-init` examples and docs
- Deep dives on Yip
- Custom build guides
- Community use cases

We’re also eager to hear how **you** use it — tag us, open issues, or just say hi.

## 🧭 Conclusion

From handcrafted Dockerfiles to Earthly-powered pipelines and now to a clean, declarative build system — this journey has been about making Kairos better not just for us, but for you.

With `kairos-init`, we’ve laid the groundwork for a more open, composable, and hackable future.

Thanks for building with us. 🚀
