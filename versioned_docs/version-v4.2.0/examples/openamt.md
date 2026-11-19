---
title: "Intel Open AMT Registration"
sidebar_label: "Intel Open AMT Registration"
description: This bundle configures Intel AMT devices during Kairos installation.
---

If Kairos is installed on a device with an Intel AMT device, the device can be automatically registered with an MPS server.
The registration will only run during installation. Devices with Kairos already installed will not be affected.

## Configuration

To configure this bundle, it must be referenced in the install bundles section.  Additional configuration can be included
under the amt section. To see all configuration options see the [openamt repository](https://github.com/kairos-io/openamt).

:::warning Build the bundle first
`quay.io/kairos/community-bundles:openamt_latest` is not published. The bundle source is in
[kairos-community/bundles](https://github.com/kairos-community/bundles/tree/main/openamt), but
the publish workflow there does not build it, so the reference below cannot be pulled as is.
Build the bundle, push it to a registry you control and name that image instead. See
[Create bundles](/docs/advanced/bundles#create-bundles).
:::

```yaml
#cloud-config

install:
  bundles:
    - targets:
        - run://quay.io/kairos/community-bundles:openamt_latest
amt:
  server_address: wss://mps.contoso.com/activate
  profile: myprofile
```
