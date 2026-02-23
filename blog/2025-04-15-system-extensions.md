---
description: Introducing the new CLI-driven system extension management in Kairos.
  Download, enable, and manage system extensions live without rebuilding your OS image.
slug: 2025/04/15/system-extensions-simplified-live-customization-with-kairos
tags:
- kairos
title: 'System Extensions, Simplified: Live Customization with Kairos'
---



# 🔧 System Extensions, Simplified: Live Customization with Kairos

Kairos has always focused on making operating system deployments more predictable, reproducible, and manageable—especially in edge and embedded environments. But for all the benefits of immutability, one challenge has lingered:

> **How do you safely and easily customize a system after it’s built—without breaking the image or going full Dockerfile rebuild?**

Today, we’re introducing a much cleaner answer: **the new system extension management framework**, now available via the Kairos Agent CLI and when Kairos 3.4.x releases.

---

<!--truncate-->


## 💡 What's New

System extensions in Kairos are not new—but managing them used to be a manual process. You had to mount things yourself, know where to drop files, and keep track of boot profiles by hand.

That’s all changed.

You can now:
- 🔄 **Download** raw extension images over `https`, `file`, or even `oci` (alpha)
- ✅ **Enable or disable** extensions declaratively per boot profile
- ⚡ **Activate extensions live** with `--now`
- 🔍 **List** which extensions are installed or currently active
- 🧹 **Remove** extensions safely—links and all

All from one CLI entrypoint:

```bash
kairos-agent sysext
```

---

## 🗂️ How It Works

Under the hood, the new system works using a simple but powerful layout:

| Path                                | What it does                                |
|-------------------------------------|---------------------------------------------|
| `/var/lib/kairos/extensions/`       | Stores downloaded disk images               |
| `.../active`, `.../passive`, etc.   | Symlink folders tied to boot profiles       |
| `/run/extensions/`                  | Where active sysexts live at runtime        |

When the system boots, **`immucore`** checks the current boot profile and links the relevant extensions into `/run/extensions/`, which are then loaded by **`systemd-sysext`**.

It’s all ephemeral, safe, and declarative.

---

## 🔐 Compatible with Trusted Boot

System security remains a top priority in Kairos. If you’re using **Trusted Boot**, rest assured: this new extension mechanism doesn't compromise your system's integrity.

Only **signed and trusted extension images** are allowed to load. This means:
- The bootloader and init system verify authenticity
- Unsigned or tampered images are simply ignored
- Your measured boot chain remains intact and auditable

So yes—you can safely extend your system at runtime *without sacrificing security*.

---

## 🛠️ Real-World Usage

Here’s what it looks like in action:

```bash
# Download a disk image directly
kairos-agent sysext download https://example.org/extensions/mytool.img

# Enable it for active boots, and load it now
kairos-agent sysext enable --active --now mytool

# See what’s active
kairos-agent sysext list --active

# Remove it completely
kairos-agent sysext remove --now mytool
```

And yes—**you don’t need to type full names**. All sysext commands accept **regex patterns**. That means `mytool` will match something like `mytool-v1.0.sysext.raw`.

---

## 🚧 Looking Ahead

This is just the beginning. We're planning further enhancements to system extension workflows—like declarative integration in the config layer, improved OCI support, and better visibility tooling.

We’d love to hear how you use it—and what would make it even better. Jump into [the Kairos community](https://kairos.io/community/) and let us know what you think.

For a more detailed breakdown, including supported commands and advanced examples, check out the [System Extensions documentation](https://kairos.io/docs/advanced/sys-extensions/).
