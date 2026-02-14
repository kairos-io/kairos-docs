---
title: "Configuring WiFi via Cloud-Config"
sidebar_label: "WiFi"
description: This section describe examples on how to deploy Kairos with WiFi
---

This example is valid with Alpine.

{{< getRemoteSource "https://raw.githubusercontent.com/kairos-io/kairos/master/examples/cloud-configs/wifi-alpine.yaml" >}}

This example is valid with openSUSE on a Raspberry Pi.

{{< getRemoteSource "https://raw.githubusercontent.com/kairos-io/kairos/master/examples/cloud-configs/wifi.yaml" >}}

:::info Note
This is only an example as there is many ways of configuring wifi via cloud config depending on the software installed on the image. Only Alpine (all architectures) and openSUSE (Raspberry Pi) currently have the necessary packages for WiFi support.
:::
