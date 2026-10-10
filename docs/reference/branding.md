---
title: "Branding"
sidebar_label: "Branding"
description: Customize the appearance and behavior of Kairos components
slug: /reference/branding
---

Kairos supports branding customization to tailor the appearance and behavior of various components to match your organization's identity or requirements. Branding options are controlled through configuration files placed in the `/etc/kairos/branding/` directory.

## Interactive Installer Branding

The interactive installer supports customization options that allow you to modify its appearance and available options.

### Color Scheme Customization

You can customize the color scheme of the interactive installer by creating a file at `/etc/kairos/branding/interactive_install_colors`. This file should contain environment variable definitions for the colors you want to override. You can specify any, all, or none of these variables - they will override the corresponding default colors.

The available color variables are:

- `KAIROS_BG` - Background color
- `KAIROS_TEXT` - Text color  
- `KAIROS_HIGHLIGHT` - Primary highlight color
- `KAIROS_HIGHLIGHT2` - Secondary highlight color
- `KAIROS_ACCENT` - Accent color
- `KAIROS_BORDER` - Border color
- `CHECK_MARK` - Check mark character/symbol

#### Color Format

Colors can be specified in two formats depending on your terminal capabilities:

**For full color terminals (24-bit/true color)**: Use hex triplet format in RGB:
```bash
# /etc/kairos/branding/interactive_install_colors
KAIROS_BG="#03153a"        # Deep blue background
KAIROS_TEXT="#ffffff"      # White text
KAIROS_HIGHLIGHT="#e56a44" # Orange highlight
KAIROS_ACCENT="#ee5007"    # Accent orange
CHECK_MARK="✓"
```

**For simple/dumb terminals (16 colors)**: Use numbers 0-9 for basic colors:
```bash
# /etc/kairos/branding/interactive_install_colors
KAIROS_BG="0"        # Black background
KAIROS_TEXT="7"      # White text
KAIROS_HIGHLIGHT="9" # Bright red highlight
KAIROS_BORDER="9"    # Bright red border
CHECK_MARK="*"
```

:::info Note
If you set values to 0-9, those simple colors will be used even on 256-color terminals. For the best experience on modern terminals, use hex triplet format.
:::
### Border customization

The border feature allows you to add customizable borders to UI components. This enhances visual separation and improves the overall design consistency.

By default the border is set as `normal` which just draws a simple square box around the installer. In dumb terminals (16 color) the `ascii` border is selected for maximum compatibility with all terminals. The following options are supported:

 - `rounded`: A rounded in the corners box, it should be supported by your terminal font.
 - `double`: Border comprised of two thin strokes
 - `thick`: Border that's thicker than the normal one
 - `normal`: The default square border
 - `ascii`: A border done with only ASCII symbols. The default in 16 color terminals
 - `off`: No border

As with the colors, the border style can be overriden in the `/etc/kairos/branding/interactive_install_colors` file with the key `BORDER_STYLE`

```bash
# /etc/kairos/branding/interactive_install_colors
BORDER_STYLE="off"
```

### Disabling Advanced Options

If you want to hide the "Customize Further" option in the interactive installer, you can create an empty file at `/etc/kairos/branding/interactive_install_advanced_disabled`. When this file exists, the installer will only show the "Start Install" option, simplifying the interface for users who don't need advanced customization.

```bash
# Create the file to disable advanced options
touch /etc/kairos/branding/interactive_install_advanced_disabled
```

### Applying Branding

These branding files should be included in your Kairos image build process or deployed to the system before running the interactive installer. For details on building custom images, see the [Build from Scratch](/docs/reference/build-from-scratch) documentation.

## Boot Splash

Kairos draws an animated logo on `/dev/tty1` for the length of the boot. The animation covers two halves of the boot with the same artwork: the initramfs, from the moment udev creates the console until the switch to the root filesystem, and the booted system, from that switch until the login prompt.

The splash never fails a boot. A console it cannot draw on, for example a serial-only console or a kernel built without `CONFIG_VT`, prints one identifying line and the boot continues. Press `Escape` during the initramfs half to switch to the kernel log and press it again to go back.

### Turning the Splash Off

The splash is on when the `splash` token is on the kernel command line, which Kairos puts there by default.

To turn it off for one boot, add `kairos.splash=0` at the boot menu. The values `off`, `false` and `no` also work.

To turn it off for every boot, remove the `splash` token from the kernel command line of your GRUB entries. Both splash units are gated on that token, so no unit file needs an edit.

### Customizing the Artwork

The splash reads its artwork from `/etc/kairos/branding/splash/`. Every file is optional and each one falls back on its own, so a directory with only some of the files still animates, and an absent directory gives you the built-in Kairos artwork.

| File | Content |
| --- | --- |
| `wordmark` | The block-art logo, one row per line. Every row must have the same display width. |
| `tagline` | One line of text, centred under the wordmark. An empty file means no tagline. |
| `palette` | The colour ramp the wordmark cycles through, as SGR foreground codes, one per line or space separated. |
| `name` | The plain-text fallback printed when there is no usable console. |

```bash
# /etc/kairos/branding/splash/tagline
The immutable Linux for my fleet
```

```bash
# /etc/kairos/branding/splash/palette
92
32
96
```

:::info Note
Use only the 16 colours a Linux virtual console can render: SGR codes `30` to `37` and their bright counterparts `90` to `97`. A 256-colour code such as `38;5;208` looks correct in a graphical terminal and paints the wrong hue on `/dev/tty1`, so the splash rejects it and keeps the default palette.
:::

The splash rejects a wordmark whose rows are not all the same width, because it centres the block by its width and one long row would shift every other row off-centre. A rejected file is reported on standard error, which means the journal, and the default artwork is used for that part.

Ragged artwork and bad palettes do not stop the boot.

The splash dracut module copies this directory into the initramfs, so your artwork applies to the initramfs half of the boot as well as to the booted system.

### Replacing the Splash Entirely

If you want your own animation rather than your own artwork, replace the executable the splash runs.

Both splash units execute `/usr/bin/kairos-splash` and nothing else. By default `kairos-init` makes that path a symlink to the Kairos multi-call binary, but it never replaces an entry that is already there. Drop your own executable at that path in your image build and Kairos keeps it.

```dockerfile
COPY my-splash /usr/bin/kairos-splash
RUN kairos-init ...
```

Run `kairos-init` after you drop the file. It rebuilds the initramfs in a later step than the one that installs binaries, so your executable reaches both halves of the boot with no further wiring.

Your executable owns `/dev/tty1` for as long as it runs. Two things are worth matching:

- The booted-system unit passes `--duration=<time>`, so accept and honour a `--duration` flag, or at least do not fail on an unknown one. The initramfs unit passes no arguments and expects the program to run until it receives `SIGTERM`.
- Exit with status 0 on a console you cannot draw on. The units are wanted, not required, so a failure does not stop the boot, but a clean exit keeps the journal readable.

To ship no splash at all rather than a different one, leave the `splash` token off the kernel command line. An image with no `/usr/bin/kairos-splash` also gets no splash: the dracut module excludes itself and both units skip on their `ConditionPathExists`.
