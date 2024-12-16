---
title: "Running AI Models Securely at the Edge"
date: 2024-11-10T12:53:13+01:00
author: Mauro Morales ([X](https://x.com/mauromrls)) ([GitHub](https://github.com/mauromorales))
---

{{< alert title="Requirements" color="info" >}}
- [Radxa X4](https://radxa.com/products/x/x4/) with at least 8GB of RAM and [proper cooling](https://radxa.com/products/accessories/heatsink-for-x4)
- Radxa X4 Beta Firmware including the Secure Boot feature
{{< /alert >}}

## Prepare the Radxa X4

{{< alert title="Warning" color="warning" >}}
- Without proper cooling, the Radxa X4 will overheat and might shut down during the firmware update process, which could brick the device.
- Radxa's Firmware to enable Secure Boot is still in beta as of writing of this document. Use it at your own risk.
{{< /alert >}}

Once you have a Radxa X4 and the proper cooling, we first need to flash the Radxa X4 Beta Firmware to enable Secure Boot. Follow these steps:

1. Go to this  [Radxa X4 Beta Firmware](https://forum.radxa.com/t/enabling-secureboot/22704/15) and request access to the firmware.
2. Extract the contents of the zip file  
    {{< figure src="https://github.com/user-attachments/assets/d1614177-2e88-4a01-b514-4d1572b28a7a" title="An elephant at sunset" >}}
3. Format a USB drive as FAT32  
    ![Format USB Drive](https://github.com/user-attachments/assets/69088541-3314-4593-9495-6569c4d4a413)
3. Rename the top directory to `EFI` and copy the contents to the USB drive  
    ![Copy Contents to USB Drive](https://github.com/user-attachments/assets/3b2e73aa-fa4c-4ec6-b1ee-c5d76453d198)
5. Follow the instructions on the Radxa Documentation to [Upgrade the BIOS](https://docs.radxa.com/en/x/x4/bios/update-bios)
6. Do a G3 power cycle (unplug the power cable, wait for 10 seconds, and plug it back in)

## Create an Ubuntu 24.04 LTS UKI Image with Full Firmware Support

{{< alert title="Note" color="info" >}}
- This guide assumes that you have checked out the [Kairos repo](https://github.com/kairos-io/kairos) and are working from the root of the repo.
- If you'd like to also have Kubernetes on the image, make sure set the `VARIANT=standard` and give one of the possible values for `K3S_VERSION` related to the Kairos version you're using.
{{< /alert >}}

Create the file `images/Dockerfile.full-firmware` with the following content:

```Dockerfile
FROM ubuntu:24.04
RUN apt-get update
RUN apt-get install -y --no-install-recommends \
    linux-image-generic-hwe-24.04
RUN apt-get clean && rm -rf /var/lib/apt/lists/*
```

Then, build the image:

```bash
docker build -t ubuntu-full-firmware -f images/Dockerfile.full-firmware ./images
```

Now we are going to use our newly created image and convert it to a Kairos image for Trusted Boot.

{{< alert title="Note" color="info" >}}
I'm using ttl.sh as the Docker registry. You can use any other registry you prefer, but this one is very useful for temporary images.
{{< /alert >}}

```bash
docker build --build-arg="RELEASE=1.0.0" \ # This should either be the version of Kairos that you're based on, or your own version
             --build-arg="BASE_IMAGE=ubuntu-full-firmware" \
             --build-arg="VARIANT=core" \ # If you choose standard, you need to set K3S_VERSION in the same way
             --build-arg="FLAVOR=ubuntu" \
             --build-arg="FLAVOR_RELEASE=24.04" \
             -t ttl.sh/kairos-radxa-uki:24h \
             -f images/Dockerfile.kairos-ubuntu ./images
```

---

```bash
docker build -t kairos-radxa -f images/Dockerfile.kairos-radxa ./images/
```

```bash
MY_ORG="Acme Corp"
# Generate the keys
docker run -v $PWD/keys:/work/keys -ti --rm quay.io/kairos/osbuilder-tools:latest genkey "$MY_ORG" --expiration-in-days 365 -o /work/keys
```

```bash
CONTAINER_IMAGE=ttl.sh/kairos-radxa:24h
docker run -ti --rm -v $PWD/build:/result \
                    -v $PWD/keys/:/keys \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    quay.io/kairos/osbuilder-tools:latest build-uki $CONTAINER_IMAGE -t iso -d /result/ -k /keys
```


## Create a bootable image and flash it to the Radxa X4

Follow the instructions on https://kairos.io/docs/installation/trustedboot/ to create a bootable image.

## Install LocalAI

1. Log into the machine with the user you created.
2. Download the [LocalAI binary](https://github.com/mudler/LocalAI/releases/download/v2.22.1/local-ai-Linux-x86_64)
3. Make it executable with `chmod +x local-ai-Linux-x86_64`
4. Run `./local-ai-Linux-x86_64` to start the LocalAI service

Now you can go to the IP:8080 of your Radxa X4 and install the models you need and chat with the LocalAI service.
