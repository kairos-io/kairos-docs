---
title: "xz Utils Backdoor"
date: 2024-04-02T20:53:13+01:00
author: Mauro Morales ([Twitter](https://twitter.com/mauromrls)) ([GitHub](https://github.com/mauromorales))
---

It's all over the tech news. Someone managed to put a backdoor on xz Utils, a very common package on Linux systems. In this post I want to share with you about what happened, how it impacted Kairos images, and what you should do in case you were affected.

## TL;DR

A backdoor that can be used to exploit systemd based Linux via ssh was introduced in xz Utils. Only Kairos Tumbleweed v3.0.1 and v3.0.2 were affected. We deleted all related OCI images from our repos and artifacts from our releases. If you installed it and the system was exposed to the internet, you should do a complete re-install. If you hosted security keys in given system, you should rotate them.

## xz Utils Backdoor

Versions 5.6.0 and 5.6.1 of xz Utils, which is used in many Linux distributions, are infected with a backdoor mechanism. Even if you don't install xz Utils directly, you might still be exposed if you're on a systemd based distribution, which is the case of most commonly used distros nowadays. This is because the init system, has a dependency on liblzma one of the affected libraries. The attack can be triggered via ssh access, which could have been catastrophic considering how many systems today connect to the internet.

If you want to read more about how the backdoor read [one](https://arstechnica.com/security/2024/04/what-we-know-about-the-xz-utils-backdoor-that-almost-infected-the-world/) of [these](https://arstechnica.com/security/2024/03/backdoor-found-in-widely-used-linux-utility-breaks-encrypted-ssh-connections/) posts, or read [Andres' disclosure email to the OSS](https://www.openwall.com/lists/oss-security/2024/03/29/4). However, more interesting than the technical implementation of the backdoor, is all the social engineering that took place.

I would like to bring your attention to the fact that in 2024, many critical open-source projects are still maintained by individuals, who do this on their spare time and who are not paid for it. It's no wonder that these maintainers are burned out or suffering of other mental health issues, as it is the case of the official xz Utils maintainer. Under such conditions it's no wonder that he was tricked by a malicious actor. As a community, we must find a solution because this time the issue was caught before it widespread, but we might not be as lucky next time.

## How it affected us?

On Monday, April 1st, after reading about the news, team member Dimitris Karakasilis decided to investigate which of our systems was affected. In his evaluation he noticed that the infected xz packages reached only Kairos Tumbleweed v3.0.1 and v3.0.2. The affected package never reached any of our other flavors since they are not rolling releases and therefore didn't get a package update.

After the analysis, on April 2nd, we deleted all related artifacts including OCI images from quay.io/kairos/opensuse, and ISOs from out [GitHub Releases](https://github.com/kairos-io/kairos/releases). Despite the artifacts not being available any longer, we decided to add a note of caution on the affected releases for anyone who wonders why the Tumbleweed artifacts are missing, and to better inform users on how react.

## What to do if you were affected?

Since only Tumblweed was affected, we decided to point you directly to [openSUSE's recommendation](https://news.opensuse.org/2024/03/29/xz-backdoor/), in which they recommend to:

> For our openSUSE Tumbleweed users where SSH is exposed to the internet, we recommend installing fresh, as it’s unknown if the backdoor has been exploited.
> 
> Due to the sophisticated nature of the backdoor an on-system detection of a breach is likely not possible.
> 
> Also rotation of any credentials that could have been fetched from the system is highly recommended.

https://www.suse.com/security/cve/CVE-2024-3094.html