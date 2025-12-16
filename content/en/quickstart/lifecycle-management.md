---
title: "Lifecycle Management"
linkTitle: "Lifecycle Management"
versionBanner: "false"
weight: 3
description: |
---

{{% alert title="Objective" color="success" %}}
{{% /alert %}}

If you followed the quickstart to [installed your first Kubernetes cluster]({{< ref "index.md" >}}) and [how to extend the system]({{< ref "extending-the-system-dockerfile.md" >}}), the next obvious step is to upgrade from that first system into the new one with our added binary. In traditional Linux systemd, you would normally do this via the package manager. In some cases it's matter of calling a single command like in the case of Ubuntu where `do-release-upgrade` and for fedora `dnf-plugin-system-upgrade` will **transform** your system into a later version of it. Others require that you fidle with doing small changes in the configured repositories giving you a bit more freedom but the experience is very similar, you do an in-place upgrade. Kairos doesn't work like this, instead you do atomic upgrades, which means that you never touch the running system and instead generate an new image and upgrade to it avoiding drift and allowing you to always access your previous system if needed.

## Prerequisites

{{% alert title="Alternatives" color="success" %}}
This tutorial uses the recommended container and virtualization tools to keep the instructions simple. Other alternatives should work as well, but they’re not documented here. If you successfully follow the tutorial using different tools, please consider opening a PR so others can benefit from your steps.
{{% /alert %}}

To extend and run Hadron, you’ll need virtualization software that can run (or emulate) the amd64 architecture. In this guide, we’ll use:

- [VirtualBox](https://www.virtualbox.org/)

## Running an upgrade

{{% alert title="Alternatives" color="success" %}}
One important aspect to keep in mind is that while the command is called upgrade, you can point your system to older images and "upgrade" to them. Don't think of this as incremental growth but simply as upgrading to your next system even if that one happens to be an older one, meaning that you can use this same command to downgrade a system.
{{% /alert %}}

Access the running system we built during the [first section of this quickstart]({{< ref "index.md" >}})

```bash
ssh kairos@IP
```

Run an upgrade using [the image we built during the second section of this quickstart]({{< ref "extending-the-system-dockerfile.md" >}})

```bash
sudo kairos-agent upgrade --source oci:ttl.sh/my-hadron:0.2.0
```

Reboot the system:

```bash
sudo reboot
```

Once the system is back up, SSH in again:

```bash
ssh kairos@IP
```

Validate that the new version is running:

```bash
cat /etc/kairos-release | grep KAIROS_VERSION
```

You should see the version you assigned during the build, for example:

```
KAIROS_VERSION="v0.2.0"
```

Finally, lets check that the newly installed `bottom` binary, is running:

```bash
btm
```

## Conclusion

Congratulations :tada: You have successfully upgraded your system to a new image.

## What's Next?

Ready to configure and extend your newly deployed Kairos node?

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "../docs/reference/configuration" >}}">
    Configuration
</a>

Need a highly secure system with TPM-backed attestation and trusted boot?

<a class="btn btn-lg btn-primary me-3 mb-4" href="{{< relref "./trusted-boot" >}}">
    Trusted Boot Quickstart
</a>

## Frequently Asked Questions (FAQs)

**Upgrade failed what can I do?**

Run the upgrade with the `--debug` flag and you might find out what's causing the issue. If you cannot determine the problem use the output to share it in the community channel. Or contact one of our partner organizations for professional support.

**How do I downgrade?**

Use the same command, but point it to the image tag you want to downgrade to.

**Upgrade was successful but my image doesn't boot?**

By default, if Kairos doesn't manage to boot your newly upgraded image, it will try to configure your bootloader to boot on the passive system, that is your previously running image. You can use that or the recovery system to mount the active partiion and determine what's going on. Alternatively also check the [troubleshooting guide]({{< ref "troubleshooting.md" >}})

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the hadron-toolchain container for?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Hadron builds many packages that are available in the toolchain image but are not included in the final production images. They’re useful for building code from source and other build-time tasks, but you typically avoid shipping them at runtime for security and size reasons."
      }
    },
    {
      "@type": "Question",
      "name": "How do I downgrade?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use the same command, but point it to the image tag you want to downgrade to."
      }
    },
    {
      "@type": "Question",
      "name": "What if I don't need Kubernetes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No problem—remove the `--provider` flag from `kairos-init` and you’ll get a `core` image without Kubernetes installed."
      }
    }
  ]
}
</script>