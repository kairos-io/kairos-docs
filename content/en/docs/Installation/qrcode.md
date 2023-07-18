---
title: "QR Code"
linkTitle: "QR Code"
weight: 1
date: 2022-11-13
description: >
  Use the QR code displayed at boot to drive the installation
---

{{% alert title="Warning" %}}
You will need a Standard Kairos OS image in order to use QR Code feature.
{{% /alert %}}

By default Kairos will display a QR code after booting the ISO to install the machine:

![livecd](https://user-images.githubusercontent.com/2420543/189219806-29b4deed-b4a1-4704-b558-7a60ae31caf2.gif)


The QR Code is a base64 encoded string which is an [`edgevpn`](https://github.com/mudler/edgevpn) token.
For example, you can scan the following QR Code from the video [Introduction to Kairos - timestamp 4:16](https://youtu.be/WzKf6WrL3nE?t=256).

The base64 encoded string from the QR Code looks like this:

```
b3RwOgogIGRodDoKICAgIGludGVydmFsOiA5MjIzMzcyMDM2ODU0Nzc1ODA3CiAgICBrZXk6IFY0NTYzWUhKNzdNVFZaMkVNRFk1QVZINklDNk1UNkU0MjdMVE1OQ1MyTVhWM1FWR1VESVEKICAgIGxlbmd0aDogMzIKICBjcnlwdG86CiAgICBpbnRlcnZhbDogOTIyMzM3MjAzNjg1NDc3NTgwNwogICAga2V5OiBNUlZTU05KQ09WWjYyV0dETFlXRE9OUkNDUTU0TEFVMkxMRkVONURNNERHTFlGWEZYVTRBCiAgICBsZW5ndGg6IDMyCnJvb206IDI3V0pWN1lNSzdXUzdRWVUzV0xPSVNRQUxZT0dFUjRRNUpNVVRVUk1UREZKS0E1NVZZWUEKcmVuZGV6dm91czogcWZNcHRBdFRzaUhxVmZWSEJhaXRBbXZQZFdySkJEcEMKbWRuczogSFB0WmlsSUp4UFhiUVRUSE93ZHhiWGZ4S3JvVmJmZEgKbWF4X21lc3NhZ2Vfc2l6ZTogMjA5NzE1MjAK
```

Once this base64 string is decoded, the [`edgevpn` token](https://github.com/mudler/edgevpn/blob/master/docs/content/en/docs/Concepts/Token/_index.md) looks like this:

```yaml
otp:
  dht:
    interval: 9223372036854775807
    key: V4563YHJ77MTVZ2EMDY5AVH6IC6MT6E427LTMNCS2MXV3QVGUDIQ
    length: 32
  crypto:
    interval: 9223372036854775807
    key: MRVSSNJCOVZ62WGDLYWDONRCCQ54LAU2LLFEN5DM4DGLYFXFXU4A
    length: 32
room: 27WJV7YMK7WS7QYU3WLOISQALYOGER4Q5JMUTURMTDFJKA55VYYA
rendezvous: qfMptAtTsiHqVfVHBaitAmvPdWrJBDpC
mdns: HPtZilIJxPXbQTTHOwdxbXfxKroVbfdH
max_message_size: 20971520
```

For more information about EdgeVPN, [check out the architecture section]({{< relref "../architecture/network" >}}).

To trigger the installation process via QR code, you need to use the Kairos CLI and provide a Cloud Config, as described in the [Getting started guide]({{< relref "../Getting started" >}}). You can also see some Cloud Config examples in our [Examples section]({{< relref "../examples" >}}). The CLI is currently available only for Linux and Windows. It can be downloaded from the release artifact:

```bash
VERSION=$(wget -q -O- https://api.github.com/repos/kairos-io/provider-kairos/releases/latest | jq -r '.tag_name')
curl -L https://github.com/kairos-io/provider-kairos/releases/download/${VERSION}/kairosctl-${VERSION}-linux-amd64.tar.gz -o - | tar -xvzf - -C .
```

The CLI allows to register a node with a screenshot, an image, or a token. During pairing, the configuration is sent over, and the node will continue the installation process.

In a terminal window from your desktop/workstation, run:

```
kairosctl register --reboot --device /dev/sda --config config.yaml
```

- The `--reboot` flag will make the node reboot automatically after the installation is completed.
- The `--device` flag determines the specific drive where Kairos will be installed. Replace `/dev/sda` with your drive. Any existing data will be overwritten, so please be cautious.
- The `--config` flag is used to specify the config file used by the installation process.

{{% alert title="Note" %}}
By default, the CLI will automatically take a screenshot to get the QR code. Make sure it fits into the screen. Alternatively, an image path or a token can be supplied via arguments (e.g. `kairosctl register /img/path` or `kairosctl register <token>`).
{{% /alert %}}

After a few minutes, the configuration is distributed to the node and the installation starts. At the end of the installation, the system is automatically rebooted.

