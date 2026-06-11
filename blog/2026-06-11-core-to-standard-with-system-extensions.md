---
authors:
  - dimitris-karakasilis
description: A proof-of-concept that turns an unmodified Kairos core image into a Kubernetes-ready "standard" node at runtime using a system extension, with the trade-offs, and a call for feedback.
slug: 2026/06/11/core-to-standard-with-system-extensions
tags:
  - kairos
title: "From Core to Standard: Delivering Kubernetes as a System Extension"
---

Kairos ships two kinds of images. A "core" image is just the immutable OS. A "standard"
image is that same core with a Kubernetes layer baked in: the k8s provider plugin, edgevpn,
and the k3s or k0s binaries with their service units. Those extra files are added at build
time by kairos-init, and once they are in the image they are part of it for the life of that
release.

That packaging is convenient, but it ties two things together that do not really need to be
tied: the operating system and the Kubernetes distribution running on top of it. I spent some
time on a proof-of-concept that pulls them apart, and I would like to show you what it looks
like and, more importantly, hear whether you think it is worth pursuing.

The repository is here: https://github.com/jimmykarily/provider-kairos-extension

{/* truncate */}

## The idea

Everything a standard image adds on top of a core image is, in the end, just files on the
root filesystem. So instead of baking those files into the OS at build time, what if we built
them once and shipped them as a system extension that you apply to an unmodified core image at
runtime?

That is the whole proof-of-concept. Take any released systemd-based core image, for example
core Hadron, apply the extension, and it becomes a Kubernetes node. No OS rebuild, no special
image.

One detail worth getting right up front: the extension packages provider-kairos, not only k3s.
provider-kairos is the piece that knows how to bring up and manage a Kubernetes distribution on
a Kairos node. k3s is just the distro it happens to manage here. The k3s binary itself is laid
down by the provider's own build hook, which is the exact mechanism kairos-init already uses
when it builds a standard image. So we are not reimplementing how Kubernetes gets installed. We
are taking the same result and delivering it through a different channel.

## How you use it

Activation is a single cloud-config file. There are no manual kairos-agent commands to run and
nothing to remember after the fact. Each release of the extension ships an activation.yaml with
the download URLs already filled in.

On a core node that is already installed and booted, you drop the file in `/oem/` and reboot:

```bash
curl -fsSL -o /oem/90_provider-kairos.yaml \
  https://github.com/jimmykarily/provider-kairos-extension/releases/download/v0.0.1/activation.yaml
reboot
```

If you would rather have a fresh install come up as a Kubernetes node directly, include the same
contents in your install user-data instead.

The activation config itself is small. For a single-node k3s setup it comes down to this:

```yaml
#cloud-config
stages:
  network:
    - name: "Install the provider-kairos extension (once)"
      if: '[ ! -e /var/lib/kairos/extensions/provider-kairos.sysext.raw ]'
      commands:
        - kairos-agent sysext install https://github.com/jimmykarily/provider-kairos-extension/releases/download/v0.0.1/provider-kairos.sysext.raw
    - name: "Enable the extension and link the provider plugin"
      commands:
        - kairos-agent sysext enable --active --now provider-kairos
        - mkdir -p /usr/local/system/providers
        - ln -sf /usr/local/bin/agent-provider-kairos /usr/local/system/providers/agent-provider-kairos

k3s:
  enabled: true
```

The first boot downloads the extension and brings k3s up on the same boot. Later boots already
have it enabled, so immucore merges it during initramfs and the install step is skipped. For a
multi-node cluster you set `p2p.network_token` instead of the single-node `k3s.enabled` block.

Once the node is back up you can confirm it worked:

```bash
systemd-sysext status | grep provider-kairos   # the extension is merged
k3s --version                                   # the binary is there
k3s kubectl get nodes                            # the node should reach Ready shortly
```

## What you get out of it

The most useful consequence is that the Kubernetes layer stops being tied to the OS release.

For you, that means you can move Kubernetes forward without touching the OS underneath it.
Bumping the k3s or k0s version becomes a matter of upgrading the extension rather than waiting
for a new OS image, rebuilding, and reinstalling. The same core image can be a plain node today
and a Kubernetes node tomorrow, decided at runtime by whether you apply the extension, instead
of being a choice you locked in when you picked which image to download. And on systemd flavors
the extension brings the usual sysext properties with it: it is immutable, and under trusted
boot it is signed and measured, with clean upgrade and rollback.

None of this relies on anything exotic. It is built out of mechanisms Kairos already has:
`kairos-agent sysext`, cloud-config boot stages, and the provider build hook.

There is a benefit for the project too, even if it is less visible from the outside. Today the
standard-image build jobs sit on the critical path of a Kairos release, so a k3s or k0s CVE, a
flaky download, or a scanner tripping on something outside our control can hold up the entire
release, including the core artifacts that have nothing to do with Kubernetes. Delivering the
Kubernetes layer as its own artifact removes that coupling: the base image ships on its own
cadence, and the Kubernetes layer is published and updated separately. That makes releasing
Kairos itself simpler and less fragile, which in the end is good for everyone relying on those
releases.

## The trade-offs

I want to be straight about the costs, because there is a real one.

The biggest is that upgrades are no longer fully atomic. Today, an upgrade swaps the whole
immutable image in a single transaction, Kubernetes layer included. With this approach the OS
and the Kubernetes layer upgrade independently: you move the OS forward by upgrading the image,
and you move Kubernetes forward by upgrading the extension. That independence is exactly what
buys us the decoupling above, but it is the other side of the same coin.

It is worth being concrete about why that matters, because it goes deeper than "two upgrades
instead of one." A lot of what makes Kairos feel safe to upgrade rests on a simple guarantee: if
something goes wrong, the rollback, whether automatic or a manual boot into the passive image,
will work, because the passive image is exactly the thing that was running and working before.
It is a known-good combination that has already proven itself on this machine.

Once the OS and Kubernetes versions can be mixed and matched, that guarantee gets shakier. You
could end up booting the passive, previously-working OS image alongside a newer Kubernetes
version that was never tried together with it. The fallback you are counting on is suddenly a
combination the node has never actually run. Making this safe again would take some redesign in
the Kairos upgrade flow, so that the combination that was known to work is always preserved and
ready to boot if the new one fails. Kairos does not support that neatly today, precisely because
it was built on the assumption that an upgrade is one atomic thing. If you specifically value
that everything on the node moves together in a single step, with a rollback you can fully trust,
this approach asks you to give that up for now.

There is also a little more machinery at activation time than I would like. The paths where
kairos-agent looks for provider plugins are not among the directories a sysext is allowed to
overlay, so the activation config has to symlink the plugin into `/usr/local/system/providers/`
itself. It is reliable, because the network stage that does it runs before kairos-agent (the
agent's service is ordered `After=cos-setup-network.service`), but it is still a step that a
baked-in standard image does not need. As you will see below, this is one of the things that
could simply disappear with a small upstream change.

Finally, this is a proof-of-concept, and it has the rough edges of one. The current builds are
unsigned and amd64 only, and the system-extension path covers systemd flavors first. OpenRC
flavors such as Alpine are not handled by the sysext yet; they would come through a separate
bundle artifact, which is on the list but not done.

## Where the PoC stands

The extension builds from start to finish and produces the file you apply to a node. There is
also an automated test that takes a real released core image, applies the extension, and checks
that Kubernetes comes up just like it would on a standard image. That test passes, so the core
idea is proven: you really can take an unmodified core image and turn it into a working
Kubernetes node this way.

Beyond that, the bundle path for OpenRC flavors and the release pipeline are the next pieces of
work.

## What would make this genuinely nice

The proof-of-concept stands on its own, but a couple of small changes upstream in Kairos would
take it from "works, with a few steps" to "barely any steps at all." These are the things I
would want feedback on before going further:

- Let extensions ship the provider binaries. If Kairos looked for provider plugins in a
  directory that a sysext is allowed to populate, the extension could carry the plugin directly
  and the activation symlink step would go away entirely.
- Let extensions ship their own cloud-config. With a lookup directory for cloud-config that an
  extension can populate, the extension could carry its own activation stage, and the only thing
  a user would write is the k3s or p2p block.
- Reuse the same artifact on Alpine too. On systemd flavors we keep using systemd-sysext, so we
  do not give up anything it offers now or later. The gap is that systemd-sysext is not there on
  OpenRC flavors like Alpine, so the same `.raw` does not apply. If immucore did the final overlay
  mount itself on those flavors, the same extension file could be reused there as well: the
  binaries inside are init-agnostic, and the systemd units are simply ignored. That would let one
  artifact cover both worlds instead of building a separate bundle for Alpine.
- Give it a home in provider-kairos. provider-kairos already owns the build hook, so it is the
  natural place to produce and release the extension as part of its own releases.

One security note on the first two, since it matters: the new lookup directories would be
root-equivalent sinks, because boot cloud-config runs as root and provider binaries are executed
as root. So they have to be root-owned rather than writable by an unprivileged user. That is not
a new privilege boundary, though. Installing an extension already implies root, and under trusted
boot the extension's contents are signature-verified.

## Try it, and tell me what you think

If any of this sounds useful, the best thing you can do is try it. Grab a release, apply the
activation config to a core image, and see how it feels compared to a standard image. Then come
tell me what broke, what surprised you, and whether the trade-off lands well for your use case.

The real question I am trying to answer is the one in the trade-offs section: is decoupling the
Kubernetes layer from the OS worth giving up fully-atomic upgrades? My own hunch is that for a
lot of people it is, but I would much rather hear it from you than guess.

I have opened [a discussion thread](DISCUSSION_URL_PLACEHOLDER) to collect feedback in one place,
so please leave your thoughts there rather than scattering them around. You are of course also
welcome in the wider [Kairos community](https://kairos.io/community/). If there is appetite for
the direction, the upstream pieces above are small and well scoped, and they would make this
simpler for everyone who comes after.
