---
title: "Branding"
sidebar_label: "Branding"
sidebar_position: 12
date: 2025-10-21
description: Customize the appearance and behavior of Kairos components
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
