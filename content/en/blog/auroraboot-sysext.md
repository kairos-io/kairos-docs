---
title: "Creating system extensions for Kairos"
date: 2024-11-25
linkTitle: "Creating Kairos system extensions"
author: Dimitris Karakasilis ([GitHub](https://github.com/jimmykarily), [LinkedIn](https://www.linkedin.com/in/dkarakasilis/))
---

The most secure way to install Kairos is in [trusted boot mode](https://kairos.io/docs/installation/trustedboot/). In this mode, the whole OS is measured and signed, making it impossible for a malicious actor to tamper with it. One could ask why there should be another way to install Kairos then? The answer is, there are some prerequisites for Trusted boot to work (e.g. the existence of a TPM chip) and some limitations posed by the various firmwares. One such limitation is the maximum size of the efi file that the system can boot. This limit is different between implementations and we've seen it ranging from 800Mb to more than 1.3Gb. No matter what the limit is, eventually, a project may hit it. This may be because of additional drivers needed or binaries and dependencies in general.

One first step would be to ensure that there are no unnecessary files dangling in the OS image. But sometimes, this is not enough to make the final efi image small enough to boot on a specific device (or hypervisor).

There is another concept that can help in such cases. That is the [systemd system extensions](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html). In their own words:

```
System extension images may – dynamically at runtime — extend the /usr/ and /opt/ directory hierarchies with additional files
```

There are also images signed with the same keys as your OS, which makes them tamper proof. They are loaded at runtime and can be used to extract parts of the system to separate images (files), making the main OS image smaller and thus possible to boot but also easier to maintain, since the lifecycle of the extensions is different from that of the OS thus they can be built and deployed separately.

## Building a sysext for Kairos

## Deploying Kairos with a sysext

## Conclusions
