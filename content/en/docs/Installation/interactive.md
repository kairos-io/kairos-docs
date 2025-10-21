---
title: "Interactive"
linkTitle: "Interactive"
weight: 2
date: 2022-11-13
description: Install Kairos interactively
---

The interactive installation can be accessed from the LiveCD ISO and guides the user into the installation process.

It generates a configuration file, which is later accessible after installation in the `/oem/90_custom.yaml` file.

## From the boot menu

When loading any Kairos ISOs, a GRUB menu, like the following will be displayed. To access the interactive installation, select the third entry (`kairos (interactive install)`).

![interactive](https://user-images.githubusercontent.com/2420543/189219819-6b16d13d-c409-4b9b-889b-12792f800a08.gif)

## Manually

The interactive installer can be also started manually with `kairos-agent interactive-install` from the LiveCD.

## Customizing the Interactive Installer

The interactive installer supports customization options that allow you to modify its appearance and available options. These customizations are controlled through files placed in the `/etc/kairos/branding/` directory.

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

{{% alert title="Note" color="info" %}}
If you set values to 0-9, those simple colors will be used even on 256-color terminals. For the best experience on modern terminals, use hex triplet format.
{{% /alert %}}

### Disabling Advanced Options

If you want to hide the "Customize Further" option in the interactive installer, you can create an empty file at `/etc/kairos/branding/interactive_install_advanced_disabled`. When this file exists, the installer will only show the "Start Install" option, simplifying the interface for users who don't need advanced customization.

```bash
# Create the file to disable advanced options
touch /etc/kairos/branding/interactive_install_advanced_disabled
```

These branding files should be included in your Kairos image build process or deployed to the system before running the interactive installer.
