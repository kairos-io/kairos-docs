---
title: "Deploying kernel firmware via sysext on Trusted Boot"
sidebar_label: "Deploying kernel firmware via sysext on Trusted Boot"
description: This section describes an examples on how to deploy the kernel firmware via sysext on Trusted Boot
slug: /examples/trusted-boot-firmware-sysext
---

# Deploying Ubuntu kernel firmware via **systemd‑sysext** under **Trusted Boot** (Kairos)

This hands‑on example shows how to keep your Ubuntu‑based Kairos image slim by removing firmware from the base OS, packaging the firmware as a **signed system extension (sysext)**, and loading it under **Trusted Boot (UKI)**—with notes on early‑boot firmware availability.

> **Why this pattern?**
>
> • **Avoid oversized UKIs**: firmware blobs can bloat the UKI and even trigger allocation errors on certain platforms.
>
> • **Stay verifiable**: sysexts can be signed and verified under Trusted Boot.
>
> • **Swap/iterate fast**: update firmware by swapping the sysext without rebuilding the whole OS.
> 

For more info on Kairos sysexts, see the [sysext documentation](/docs/advanced/sys-extensions).

---

## Prerequisites

- A workstation with Docker/Podman.
- Secure Boot/Trusted Boot keys (DB key + certificate) you already use for your Kairos UKIs: `db.key` and `db.pem`.
- A Kairos Ubuntu base you control (we’ll build a minimal one with `kairos-init`).
- AuroraBoot container image (`quay.io/kairos/auroraboot`, v0.9.0+ recommended).
- A machine that will boot Kairos with **Trusted Boot**.

> **Terminology quickies**
>
> - **sysext**: a signed+verity system extension image that overlays **/usr** (and optionally **/opt**) at boot.
> - **UKI**: Unified Kernel Image (`*.efi`) that systemd‑boot loads. Under Trusted Boot, the boot chain and optional sysext payloads get measured in TPM PCRs.

---

## Step 1 — Build a slim Ubuntu base without firmware

Create `Dockerfile.kairos-ubuntu-slim` that “Kairosifies” Ubuntu and strips firmware from the rootfs:

```dockerfile
# Stage with kairos-init
FROM quay.io/kairos/kairos-init:v0.5.19 AS kairos-init

# Your Ubuntu base
FROM ubuntu:24.04

# Run kairos-init to turn this into a Kairos-ready base
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init \
    /kairos-init -l debug -t true --version 1.0.0 && /kairos-init validate -t true

# Ensure the base rootfs contains NO firmware
# (Kernel firmware will be provided by a sysext at boot.)
RUN apt-get remove -y linux-firmware
```

Build and tag the image:

```bash
docker build -f Dockerfile.kairos-ubuntu-slim -t kairos-ubuntu:1.0.0 .
```

---

## Step 2 — Create a **firmware sysext** with AuroraBoot

We’ll craft a tiny OCI image that contains just the firmware files under `/usr/lib/firmware`, then let **AuroraBoot** convert/sign it into `*.sysext.raw`.

1) Create a minimal Dockerfile that collects only the firmware you need:

```dockerfile
# Dockerfile.firmware
# Use the slim Kairos Ubuntu base so everything matches
FROM kairos-ubuntu:1.0.0
RUN apt-get update && \
    apt-get install -y --no-install-recommends linux-firmware && \
    rm -rf /var/lib/apt/lists/*
```

Build it locally:

```bash
docker build -f Dockerfile.firmware -t firmware:ubuntu-24.04 .
```

2) Convert and sign as a sysext with AuroraBoot (uses your Secure Boot DB key):

```bash
# Create a signed+verity sysext from the LAST layer of the OCI image
# (AuroraBoot will autogenerate the extension-release metadata.)

docker run --rm -ti \
  -v "$PWD":/build \
  -v "$PWD/keys":/keys \
  -v /var/run/docker.sock:/var/run/docker.sock \
  quay.io/kairos/auroraboot \
  sysext \
  --private-key=/keys/db.key \
  --certificate=/keys/db.pem \
  --output=/build \
  firmware-ubuntu-2404 firmware:ubuntu-24.04

# Result: firmware-ubuntu-2404.sysext.raw
2025-09-04T12:23:05Z INF [1] 🚀 Start sysext creation
2025-09-04T12:23:05Z DBG creating directory dir=/tmp/auroraboot-sysext-3867492028
2025-09-04T12:23:05Z INF [1] 💿 Getting image info
2025-09-04T12:23:05Z INF [1] 📤 Extracting archives from image layer
2025-09-04T12:23:17Z INF 📦 Packing sysext into raw image
2025-09-04T12:23:18Z INF 🎉 Done sysext creation output=/build/firmware-ubuntu-2404.sysext.raw

```

3) (Optional) Inspect the result:

```bash
sudo systemd-dissect firmware-ubuntu-2404.sysext.raw
 File Name: firmware-ubuntu-2404.sysext.raw
      Size: 519.9M
 Sec. Size: 512
     Arch.: x86-64

Image Name: firmware-ubuntu-2404
Image UUID: 60f29b0d-f685-4878-b529-4ef35c3f1196
 sysext R.: ID=_any
            ARCHITECTURE=x86-64

    Use As: ✗ bootable system for UEFI
            ✗ bootable system for container
            ✗ portable service
            ✗ initrd
            ✓ sysext for system
            ✓ sysext for portable service
            ✗ sysext for initrd
            ✗ confext for system
            ✗ confext for portable service
            ✗ confext for initrd

RW DESIGNATOR      PARTITION UUID                       PARTITION LABEL        FSTYPE                AR>
ro root            12492769-aef0-605b-0df7-b48fa9d8fab8 root-x86-64            erofs                 x8>
ro root-verity     645436ca-6eb4-af91-25b0-e93b3601607b root-x86-64-verity     DM_verity_hash        x8>
ro root-verity-sig ba282899-118d-4b1c-ba8c-5e1af8e37c81 root-x86-64-verity-sig verity_hash_signature x8>

```

---

## Step 3 — Deliver the sysext

Via **kairos-agent** after the install has been done and we have booted to the system:

```bash
$ kairos-agent sysext install https://example.org/firmware-ubuntu-2404.sysext.raw
$ kairos-agent sysext enable --common --now firmware-ubuntu-2404
```

You can also scp the file onto the node and enable it locally.

```bash
$ kairos-agent sysext install file:/tmp/firmware-ubuntu-2404.sysext.raw
$ kairos-agent sysext enable --common --now firmware-ubuntu-2404
```

---

## Step 4 — **Trusted Boot** specifics and signatures

- **Sign sysexts with the same key/cert used for your UKI** (DB key). Kairos verifies sysext signatures under Trusted Boot and will ignore unsigned/mismatched ones.
- Keep the sysext filename versioned (e.g. `firmware‑ubuntu‑2404‑YYYYMMDD.sysext.raw`) so systemd can order and upgrade cleanly.

### Optional: make firmware available to the **initramfs** itself

Some hardware needs firmware **before** the real root is mounted (e.g., early GPU, NIC, or storage). You can workaround this by embedding a minimal subset directly into the image:

    - During your UKI build step, copy only the critical blobs into `/usr/lib/firmware`
    - Keep the full set in the sysext for post‑switch use.

---

## Step 5 — Verify at runtime

After first boot on a node:

```bash
# See which extensions are installed and active for this profile
kairos-agent sysext list --active

# systemd view of merged overlays
systemd-sysext status

# Kernel firmware requests
dmesg | grep -i firmware
```

---

## Upgrading the firmware

Ship a new `.sysext.raw` and enable it atomically:

```bash
kairos-agent sysext install https://example.org/firmware-ubuntu-2404-2025.09.01.sysext.raw
kairos-agent sysext enable --common --now firmware-ubuntu-2404-2025.09.01
# Optionally remove the old image after a soak period
kairos-agent sysext remove firmware-ubuntu-2404-2025.06.01
```

> Under Trusted Boot, the new sysext must be signed with the same key/cert as your UKI.

---

## Troubleshooting & known gotchas

- **Sysext filename** must end with `.sysext.raw` for Kairos/immucore to find it.
- **Only `/usr` (and optionally `/opt`) is overlayed**. Ensure firmware lives under `/usr/lib/firmware`.
- **Order matters**: multiple sysexts are applied in version‑sorted order; keep names properly versioned.
- **Unsigned / wrong‑key sysext**: will be ignored in Trusted Boot—check logs under `/run/immucore/`.

---

## Appendix — Reloading devices after firmware becomes available

After the firmware sysext is active, some devices that probed before the overlay may still be missing firmware. Use a short-lived service to retrigger or reload the affected drivers.

# One-shot service (generic)

Create /etc/systemd/system/reprobe-after-firmware.service:

```
[Unit]
Description=Re-probe devices once firmware sysext is available
After=systemd-sysext.service
ConditionDirectoryNotEmpty=/usr/lib/firmware

[Service]
Type=oneshot
# Reload udev rules and re-emit add/change events
ExecStart=/usr/bin/udevadm control --reload
ExecStart=/usr/bin/udevadm trigger --action=add --subsystem-match=pci # or --subsystem-match=usb/net/sound/input etc...
ExecStart=/usr/bin/udevadm trigger --action=change --subsystem-match=pci # or --subsystem-match=usb/net/sound/input etc...
# (Optional) Reload common drivers that usually need firmware
# Adjust to your hardware; safe examples:
ExecStart=/usr/sbin/modprobe -r iwlmvm iwlwifi || true
ExecStart=/usr/sbin/modprobe iwlwifi iwlmvm || true
ExecStart=/usr/sbin/modprobe -r e1000e || true
ExecStart=/usr/sbin/modprobe e1000e || true
ExecStart=/usr/sbin/modprobe -r rtw_8821au || true
ExecStart=/usr/sbin/modprobe rtw_8821au || true

[Install]
WantedBy=multi-user.target
```

Enable it:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now reprobe-after-firmware.service
```

# Binding trick (when unloading a module isn’t safe)

For GPUs or storage controllers backing the root console, prefer unbind/bind over modprobe -r. 

Replace the PCI BDF and driver to match your device:


```bash
# Example: rebind an Intel iGPU without unloading the module
BDF="0000:00:02.0"
DRV="i915"
echo "$BDF" | sudo tee /sys/bus/pci/drivers/$DRV/unbind
echo "$BDF" | sudo tee /sys/bus/pci/drivers/$DRV/bind
```

To automate, drop a helper at /usr/local/bin/rebind-pci.sh:
```bash
#!/usr/bin/env bash
set -euo pipefail
BDF="$1"
DRV="$(basename "$(readlink -f /sys/bus/pci/devices/$BDF/driver)")"
echo "$BDF" >"/sys/bus/pci/drivers/$DRV/unbind"
echo "$BDF" >"/sys/bus/pci/drivers/$DRV/bind"
```

…and call it from a tiny unit that has the `After=systemd-sysext.service` stanza.

> You can do the same trick with usb devices by sending the device ID to `/sys/bus/usb/drivers/usb/bind`
> and `/sys/bus/usb/drivers/usb/unbind`, like `echo "1-1.2" | sudo tee /sys/bus/usb/drivers/usb/unbind`.
