---
title: "Enhancing Kairos Documentation with a Customizable Flavor Menu"
date: 2024-08-14
linkTitle: "Customizable Flavor Menu"
description: "Discover how our new customizable flavor menu in Kairos documentation streamlines your experience by allowing you to select your preferred Linux distribution."
author: Mauro Morales ([Twitter](https://twitter.com/mauromrls)) ([GitHub](https://github.com/mauromorales))
---

Kairos is versatile, supporting various Linux distributions such as openSUSE Leap, Ubuntu 24.04, and [more]({{<ref "image_matrix" >}}). Our primary objective is to empower users to continue working with their preferred Linux distribution seamlessly. However, our previous documentation fell short of this goal. The scripts were tied to a default image, which often led to issues for users who preferred a different flavor.

During our [first Hackweek]({{<ref "hackweek-2024" >}}), we took a significant step forward by updating our documentation to allow users to select their preferred flavor, thereby enhancing the overall experience.

## How does it work?

To select your preferred flavor, simply use the drop-down menu at the top of the navigation bar on our website. Your selection is saved locally, meaning that if you access the documentation from a different browser or device, you’ll need to reselect your flavor.

Selecting your preferred flavor will automatically update the scripts displayed on the page. If an example is specific to a certain flavor, such as the installation on [Nvidia AGX Orin]({{<ref "nvidia_agx_orin" >}}), you will see a warning at the top of the page, and the scripts will not switch to your selected flavor. When only a subset of flavors is available, and your preferred one is not among them, a warning message will appear above the script, informing you of the available flavors. The script will default to the first available option.

## Give us feedback!

We hope this new feature enhances your experience with our documentation. If you have any feedback or suggestions, please don’t hesitate to reach out to us on the [CNCF Slack channel](https://cloud-native.slack.com/archives/C0707M8UEU8)