---
title: "Recovery mode"
sidebar_label: "Recovery mode"
sidebar_position: 7
date: 2022-11-13
---

Kairos remote recovery hands the console to `kairos-agent recovery`, which prints a network token as a QR code and waits for `kairosctl bridge` to connect over it. Use it to regain access, with assistance, to a machine you have lost access to.

Remote recovery runs from the live media only. An installed system keeps its own local `recovery` GRUB entry, which boots the recovery image on the machine itself and needs no second machine to drive it. That entry is unaffected by this page.

:::note

Remote recovery used to be a GRUB entry of its own, `kairos (remote recovery mode)`, on the live media and in `/etc/kairos/branding/grubmenu.cfg` on installed systems. Both entries are gone. The interactive installer's welcome page offers the same handover, so the boot menu no longer carries a second route to it.

:::

## Start remote recovery

Boot the Kairos ISO and select `kairos (interactive install)` from the boot menu.

On the installer's welcome page, press `r`.

The option appears only when the handover could actually work, which needs two things on the media: `kairos-agent`, and a provider to answer the pairing challenge. A core image with no provider does not offer it, the same way it does not offer the `a` pairing install.

After a few seconds a QR code is printed along with a password you can use later to SSH into the machine:

![Screenshot from 2022-04-28 17-48-43](https://user-images.githubusercontent.com/2420543/165800187-4d2fe04e-c501-4ad8-a29f-32a0110eaa72.png)

At this stage, take a screenshot or a photo and save the image with the QR code.

## Connect to the machine

In the another machine that you are using to connect to your server, (your workstation, a jumpbox, or other) use the Kairos CLI to connect over the remote machine:

```
$ ./kairosctl bridge --qr-code-image /path/to/image.png
 INFO   Connecting to service kAIsuqiwKR
 INFO   SSH access password is yTXlkak
 INFO   SSH server reachable at 127.0.0.1:2200
 INFO   To connect, keep this terminal open and run in another terminal 'ssh 127.0.0.1 -p 2200' the password is  yTXlkak
 INFO   Note: the connection might not be available instantly and first attempts will likely fail.
 INFO         Few attempts might be required before establishing a tunnel to the host.
 INFO   Starting EdgeVPN network
 INFO   Node ID: 12D3KooWSTRBCTNGZ61wzK5tgYvFi8rQVxkXJCDUYngBWGDSyoBK
 INFO   Node Addresses: [/ip4/192.168.1.233/tcp/36071 /ip4/127.0.0.1/tcp/36071 /ip6/::1/tcp/37661]
 INFO   Bootstrapping DHT
```

At this point, the bridge should start, and you should be able to see connection messages in the terminal. You can connect to the remote machine by using `ssh` and pointing it locally at `127.0.0.1:2200`. The username is not relevant, the password is print from the CLI.

The bridge operates in the foreground, so you have to shut it down by using CTRL-C.
