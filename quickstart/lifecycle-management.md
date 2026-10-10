---
title: "Lifecycle Management"
description: Learn how Kairos handles lifecycle management with atomic, image-based upgrades. Upgrade a running node to a newly built OCI image, reboot into it, verify the new version, and confirm your added binary is available—while keeping rollback paths intact.
sidebar_position: 3
---


:::tip Objective
Upgrade a running Kairos system to a newly built image (atomic upgrade), reboot into it, and validate you’re on the new version and that your added binary is present—while understanding how to recover or roll back if something goes wrong.
:::

If you followed the quickstart to [install your first Kubernetes cluster](/quickstart/) and learned [how to extend the system](/quickstart/extending-the-system-dockerfile/), the next step is to upgrade from that first system to a new one that includes your added binary. On traditional Linux distributions, you’d typically do this via the package manager. Sometimes it’s a single command—for example, Ubuntu’s `do-release-upgrade` or Fedora’s `dnf-plugin-system-upgrade`—that **transforms** your system into a later version. Other times, you might need to adjust configured repositories, but the experience is still an in-place upgrade. Kairos works differently: upgrades are atomic. You don’t modify the running system; instead, you build a new image and upgrade to it. This avoids drift and ensures you can always get back to the previously running system if needed.

## Prerequisites

:::tip Alternatives
This tutorial uses the recommended container and virtualization tools to keep the instructions simple. Other alternatives should work as well, but they’re not documented here. If you successfully follow the tutorial using different tools, please consider opening a PR so others can benefit from your steps.
:::

To extend and run Hadron, you’ll need virtualization software that can run (or emulate) the amd64 architecture. In this guide, we’ll use:

- [VirtualBox](https://www.virtualbox.org/)

## Prefer to watch a video?

<YouTube id="Xd2VfPB0ueM" title="Hadron Quickstart" />

## Running an upgrade

:::tip Alternatives
One important thing to keep in mind is that although the command is called `upgrade`, you can point your system to older images and still “upgrade” to them. Don’t think of this as incremental growth; think of it as switching to a target system image—even if that image is older. In other words, you can use the same command to downgrade a system.
:::

Access the running system we built during the [first section of this quickstart](/quickstart/):

```bash
ssh kairos@IP
```

Run an upgrade using [the image we built during the second section of this quickstart](/quickstart/extending-the-system-dockerfile/):

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

Finally, let's check that the newly installed `bottom` binary is available:

```bash
btm
```

## Conclusion

Congratulations :tada: You have successfully upgraded your system to a new image.

## What's Next?

### Continue the quickstart (recommended)

If you’re new to Kairos, the next step after atomic upgrades is to harden the system with Trusted Boot.

<a class="btn btn-lg btn-primary me-3 mb-4" href="/quickstart/trusted-boot/">
    Trusted Boot (TPM + Secure Boot) quickstart
</a>

### Deep dive docs

If you’re already comfortable with Kairos and want details, jump straight to reference docs and troubleshooting.

<a class="btn btn-lg btn-primary me-3 mb-4" href="/docs/reference/configuration/">
    Cloud-config reference
</a>

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="/docs/reference/troubleshooting/">
    Troubleshooting guide
</a>

<a class="btn btn-lg btn-outline-primary me-3 mb-4" href="/docs/advanced/sys-extensions/">
    Extend with systemd extensions
</a>

## Frequently Asked Questions (FAQs)

**My upgrade failed. What can I do?**

Run the upgrade with the `--debug` flag to help identify what’s causing the issue. If you still can’t determine the problem, use the output when asking for help in the community channel, or contact one of our partner organizations for professional support.

**How do I downgrade?**

Use the same command, but point it to the image tag you want to downgrade to.

**My upgrade was successful, but the new image doesn’t boot. What can I do?**

By default, if Kairos can’t boot your newly upgraded image, it will try to configure your bootloader to boot the passive system (your previously running image). You can use that (or the recovery system) to mount the active partition and determine what’s going on. Alternatively, also check the [troubleshooting guide](/docs/reference/troubleshooting/)

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Upgrade a Kairos system atomically (image-based upgrade)',
      description:
        'Upgrade a running Kairos node to a new OCI image, reboot into it, and verify the new version is running.',
      step: [
        {
          '@type': 'HowToStep',
          name: 'SSH into the node',
          text: 'SSH into the running Kairos system.',
        },
        {
          '@type': 'HowToStep',
          name: 'Run an upgrade to a target OCI image',
          text: 'Run kairos-agent upgrade pointing at the OCI image you want to switch to.',
        },
        {
          '@type': 'HowToStep',
          name: 'Reboot into the upgraded system',
          text: 'Reboot the node so it boots into the upgraded image.',
        },
        {
          '@type': 'HowToStep',
          name: 'Verify the running version',
          text: 'SSH in again and confirm the running version via /etc/kairos-release.',
        },
        {
          '@type': 'HowToStep',
          name: 'Validate your change is present',
          text: 'Run a command that depends on your new image contents (for example btm) to confirm the upgrade took effect.',
        },
      ],
    }),
  }}
/>

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'My upgrade failed. What can I do?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Run the upgrade with the `--debug` flag to help identify what’s causing the issue. If you still can’t determine the problem, use the output when asking for help in the community channel, or contact one of our partner organizations for professional support.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I downgrade?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Use the same command, but point it to the image tag you want to downgrade to.',
          },
        },
        {
          '@type': 'Question',
          name: 'My upgrade was successful, but the new image doesn’t boot. What can I do?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'By default, if Kairos can’t boot your newly upgraded image, it will try to configure your bootloader to boot the passive system (your previously running image). You can use that (or the recovery system) to mount the active partition and determine what’s going on. Alternatively, also check the troubleshooting guide.',
          },
        },
      ],
    }),
  }}
/>


