---
title: "WebUI"
sidebar_label: "WebUI"
sidebar_position: 2
date: 2022-11-13
description: Use the WebUI at boot to drive the installation
---

By default when running the LiveCD, or during installation, Kairos will start a WebUI in the background, listening by default on the `8080` port:

![WebUI](https://user-images.githubusercontent.com/2420543/214573939-31f887b8-890c-4cce-a02a-0100198ea7d9.png)

The WebUI has an input form that accepts the `YAML` config file, features a syntax highlighter and a `YAML` syntax checker. You can find a [full example in our documentation](/docs/reference/configuration) or navigate to our [examples section](../../examples).

## Requiring a token

The WebUI answers on every network interface of the machine, and the form it
serves installs that machine. On a network where not everyone may do that, ask
it for a token. Write `/etc/kairos/agent.yaml` from the cloud config, the same
file the other WebUI settings are read from:

```yaml
#cloud-config

stages:
  boot:
    - name: "Require a token for the WebUI"
      files:
        - path: /etc/kairos/agent.yaml
          permissions: 0600
          content: |
            webui:
              token: "a secret only the installer harness knows"
```

With a token set, a request that does not carry it is answered with `401` and
nothing else. There are three ways to carry it:

| How | Who uses it |
|---|---|
| `Authorization: Bearer <token>` | an unattended install, a script, an agent harness |
| `?token=<token>` on the URL | a person, once, from the address the installer prints |
| a cookie | the browser, on everything after that first URL |

An unattended install sends the header:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  -F cloud-config="$(cat config.yaml)" \
  -F installation-device=/dev/sda \
  http://the-machine:8080/install
```

A person opens the address the interactive installer shows on its welcome
screen, or scans the QR code beside it. Both already carry `?token=`, so there
is nothing to type, and the cookie the first page sets keeps the rest of the
session working.

Leave `token` out, which is the default, and the WebUI stays open. That is what
a live ISO booted on a machine you are standing at is expected to do.

:::warning
The WebUI speaks plain HTTP, so a token protects the install from somebody who
cannot read the traffic, not from somebody who can. Treat it as a way to keep
the wrong machine from being installed on a trusted network, not as a way to
expose the installer to an untrusted one.
:::
