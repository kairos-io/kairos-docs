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

You can customize the color scheme of the interactive installer by creating a file at `/etc/kairos/branding/interactive_install_colors`. This file should contain environment variable definitions for the colors you want to override.

The available color variables are:

- `KAIROS_BG` - Background color
- `KAIROS_TEXT` - Text color  
- `KAIROS_HIGHLIGHT` - Primary highlight color
- `KAIROS_HIGHLIGHT2` - Secondary highlight color
- `KAIROS_ACCENT` - Accent color
- `KAIROS_BORDER` - Border color
- `CHECK_MARK` - Check mark character/symbol

Example color configuration file:
```bash
# /etc/kairos/branding/interactive_install_colors
KAIROS_BG="235"
KAIROS_TEXT="252"
KAIROS_HIGHLIGHT="33"
KAIROS_HIGHLIGHT2="39"
KAIROS_ACCENT="208"
KAIROS_BORDER="9"
CHECK_MARK="✓"
```

Colors can be specified using terminal color codes (0-255) or color names supported by your terminal.

### Disabling Advanced Options

If you want to hide the "Customize Further" option in the interactive installer, you can create an empty file at `/etc/kairos/branding/interactive_install_advanced_disabled`. When this file exists, the installer will only show the "Start Install" option, simplifying the interface for users who don't need advanced customization.

```bash
# Create the file to disable advanced options
touch /etc/kairos/branding/interactive_install_advanced_disabled
```

These branding files should be included in your Kairos image build process or deployed to the system before running the interactive installer.
