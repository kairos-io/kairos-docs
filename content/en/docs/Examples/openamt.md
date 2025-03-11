---
title: "Intel Open AMT Registration"
linkTitle: "Intel Open AMT Registration"
description: This bundle configures Intel AMT devices during Kairos installation.
---

If Kairos is installed on a device with an Intel AMT device, the device can be automatically registered with an MPS server.
The registration will only run during installation. Devices with Kairos already installed will not be affected.

## Configuration

To configure this bundle, it must be referenced in the install bundles section.  Additional configuration can be included
under the amt section. To see all configuration options see the [openamt repository](https://github.com/kairos-io/openamt).

```yaml
#cloud-config

install:
  bundles:
    - run://quay.io/kairos/community-bundles:openamt_latest
amt:
  server_address: wss://mps.contoso.com/activate
  profile: myprofile
```
