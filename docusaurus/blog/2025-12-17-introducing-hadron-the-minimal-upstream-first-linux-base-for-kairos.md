---
authors:
  - ettore-di-giacinto
slug: 2025/12/17/introducing-hadron-the-minimal-upstream-first-linux-base-for-kairos
tags:
  - kairos
title: "Introducing Hadron: The Minimal, Upstream-First Linux Base for Kairos"
---

The cloud-native and edge-computing world demands systems that are small, reliable, and predictable. For years, the Kairos project has empowered users to turn mainstream Linux distributions, such as Ubuntu, Alpine, Debian, Fedora and more, into immutable, image-based operating systems with secure, atomic A/B updates.

That mission remains core to us. But in transforming traditional distributions, we continually encountered friction: the inherited bloat of legacy package managers, sprawling dependency graphs, and downstream patches that increase image size and boot time.

<!-- truncate -->

Today, we are excited to announce a new option for the Kairos ecosystem: [Hadron Linux](https://hadron-linux.io).

Hadron is a brand-new, minimal, and trustworthy Linux distribution engineered from scratch by the Kairos team to be the perfect base for immutable, image-based systems.

## Why Hadron? The Pursuit of Minimal Predictability

Hadron is not "yet another distro". It is a surgical response to the specific needs of cloud-native and edge deployments, and a modern first system, built on the core goals of **ultimate minimalism**, **upstream alignment**, and **reproducibility**.

| Feature | Hadron's Approach | Benefit for Cloud/Edge |
| --- | --- | --- |
| Base | Built from scratch, non-derived | Zero legacy bloat or dependencies |
| Components | Vanilla (musl libc, systemd, unpatched kernel) | Upstream alignment, minimal drift |
| Upgrade Model | Image-based (via Kairos) | Atomic A/B updates, safe rollbacks |
| Footprint | Extremely minimal | Fast boot times, smaller images |
| Package Management | None by design | No vendor lock-in, use your preferred extension method |

This "minimal-first" approach directly translates into reduced attack surface and enhanced security, as fewer components mean fewer vectors for compromise. Hadron is not positioned as a replacement or competitor to established general-purpose distributions like Ubuntu, Debian, or Alpine. Instead, it is an alternative base layer specifically optimized for the constraints and requirements of modern immutable, image-based, cloud-native, and edge systems. 

While Kairos continues to support all major distributions, Hadron exists to serve the users who need the absolute smallest footprint, fastest boot times, and most predictable upstream-aligned behavior possible when deploying at scale or in resource-constrained environments. It is a purpose-built tool for a specialized job, complementing, rather than challenging, the broader Linux ecosystem.

## A Novel Combination: musl + systemd

Hadron is one of the only distributions intentionally combining the [musl C library](https://www.musl-libc.org/) with the [systemd init system](https://systemd.io/). This combination is powerful for modern systems:

- **musl**: Provides a small, secure, and reproducible foundation, ideal for cloud-native container workloads.
- **systemd**: Offers predictable boot, rich observability, and broad ecosystem support through standard APIs.

The result is a small footprint, fast boot, while still operating modern operating system needs and consistent behavior across diverse environments, without the complexity of the traditional glibc-based stack.

| Feature | Hadron | Alpine | Ubuntu | Red Hat families | SUSE families |
| --- | --- | --- | --- | --- | --- |
| Package manager | None by design | APK | apt | dnf | zypper |
| Libc | musl | musl | glibc | glibc | glibc | 
| Init system | systemd | openRC | systemd | systemd | systemd |
| Footprint | Extremely minimal | Fast boot times, smaller images | small-medium | small-medium | small-medium |
| Lifecycle management | Kairos | APK | apt, Snap | Dnf, bootc, rpm-ostree  | Zypper, Elemental |

## Hadron and Kairos: The Perfect Immutable Stack

It is critical to understand the relationship:

**Kairos** is the project that delivers the immutable, image-based lifecycle, atomic A/B upgrades, and zero-touch provisioning. Kairos remains distro-agnostic and will continue to support all current flavors (Ubuntu, Debian, Fedora, etc.).

**Hadron** is the purpose-built, optimal flavor for Kairos, a clean, lean, and predictable base OS.

If you are looking for the smallest, cleanest, most upstream-aligned OS for your cloud-native or edge infrastructure, Hadron is designed for you. You can build your image, extend it using container technologies, or simply use system extensions without ever touching a package manager.

## Our Invitation to the Community

Hadron is mature and production-ready for its core purpose: to be a minimal, predictable base for Kairos. As part of the CNCF project Kairos, Hadron guarantees vendor neutrality and a clear governance model.

Hadron expands the Kairos matrix with a specialized flavor that will become the new default. All existing flavors remain fully supported, and our commitment to a vendor-neutral, lock-in-free ecosystem stays unchanged—giving you the freedom to choose the base OS that best fits your needs.

We invite you to explore Hadron, try the quickstart guide, and join the conversation:

- **View the Code**: The [Hadron repository](https://github.com/kairos-io/hadron) is public on GitHub.
- **Get Started**: Check out the Hadron documentation [quickstart](https://kairos.io/quickstart/).
- **Join the Discussion**: Connect with the Kairos and Hadron community on the [CNCF Slack channel](https://slack.cncf.io/#kairos).
