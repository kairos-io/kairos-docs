---
title: "Creating system extensions for Kairos"
date: 2024-11-25
linkTitle: "Creating Kairos system extensions"
author: Dimitris Karakasilis ([GitHub](https://github.com/jimmykarily), [LinkedIn](https://www.linkedin.com/in/dkarakasilis/))
---

The most secure way to install Kairos is in [trusted boot mode](https://kairos.io/docs/installation/trustedboot/). In this mode, the whole OS is measured and signed, making it impossible for a malicious actor to tamper with it. It's natural to ask, should there be another way to install Kairos then? The answer is, there are some prerequisites for Trusted boot to work (e.g. the existence of a TPM chip) and some limitations posed by the various firmwares. One such limitation is the maximum size of the efi file that the system can boot. This limit is different between implementations and we've seen it ranging from 800Mb to more than 1.3Gb. No matter what the limit is, eventually, a project may hit it. The reasons could be, additional drivers, more tools and binaries or dependencies in general.

One first step would be to ensure that there are no unnecessary files dangling in the OS image. But sometimes, this is not enough to make the final efi image small enough to boot on a specific device (or hypervisor).

In such cases, there is another concept that can help. That is the [systemd system extensions](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html). In their own words:

> System extension images may – dynamically at runtime — extend the /usr/ and /opt/ directory hierarchies with additional files

The system extensions are images signed with the same keys as your OS, which makes them tamper proof. They are "overlayed" at runtime and can be used to extract parts of the system to separate images, making the main OS image smaller and thus possible to boot but also easier to maintain. The lifecycle of the extensions is different from that of the OS, thus they can be built and deployed separately.

## Building a sysext for Kairos

A system extension can be created manually by using the systemd tooling ([systemd-sysext](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html), [systemd-repart](https://www.freedesktop.org/software/systemd/man/latest/systemd-repart.html)). The Kairos project offers one more option, using the [Auroraboot tool](https://github.com/kairos-io/AuroraBoot).

For the purposes of this document, let's use Auroraboot to create a system extension to package [k3s](https://k3s.io/) in a way that it can be overlayed on top of a Kairos core image (Kairos "core" images don't ship k3s).

Auroraboot `sysext` command uses the last layer of a container image to create a system extension. This is all explained in details [in the documentation](https://kairos.io/docs/advanced/sys-extensions/), so let's just create the necessary Dockerfile for the k3s extension we are building here.

```Dockerfile
FROM ubuntu AS builder

RUN apt update && apt install -y curl jq
WORKDIR /k3s

RUN <<EOF

# Create directories
mkdir -p usr/local/bin
mkdir -p usr/local/sbin
mkdir -p usr/local/lib/systemd/system/
mkdir -p usr/lib/extension-release.d/

# Download latest k3s
latest_version=$(curl -s https://api.github.com/repos/k3s-io/k3s/releases/latest | jq -r '.tag_name')
URL=https://github.com/k3s-io/k3s/releases/download/${latest_version}/k3s
curl -o usr/local/bin/k3s -fsSL ${URL}
chmod +x usr/local/bin/k3s
ln -s ./k3s usr/local/bin/kubectl
ln -s ./k3s usr/local/bin/ctr
ln -s ./k3s usr/local/bin/crictl

# Create service files
cat << K3SSERVICE > usr/local/lib/systemd/system/k3s.service
[Unit]
Description=Lightweight Kubernetes
Documentation=https://k3s.io
Wants=network-online.target
After=network-online.target

[Install]
WantedBy=multi-user.target

[Service]
Type=notify
EnvironmentFile=-/etc/default/%N
EnvironmentFile=-/etc/sysconfig/%N
EnvironmentFile=-/usr/local/lib/systemd/system/k3s.service.env
KillMode=process
Delegate=yes
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
TimeoutStartSec=0
Restart=always
RestartSec=5s
ExecStartPre=/bin/sh -xc '! /usr/bin/systemctl is-enabled --quiet nm-cloud-setup.service 2>/dev/null'
ExecStartPre=-/sbin/modprobe br_netfilter
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/k3s server
K3SSERVICE

cat << AGENTSERVICE > usr/local/lib/systemd/system/k3s-agent.service
[Unit]
Description=Lightweight Kubernetes
Documentation=https://k3s.io
Wants=network-online.target
After=network-online.target

[Install]
WantedBy=multi-user.target

[Service]
Type=notify
EnvironmentFile=-/etc/default/%N
EnvironmentFile=-/etc/sysconfig/%N
EnvironmentFile=-/usr/local/lib/systemd/system/k3s-agent.service.env
KillMode=process
Delegate=yes
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
TimeoutStartSec=0
Restart=always
RestartSec=5s
ExecStartPre=/bin/sh -xc '! /usr/bin/systemctl is-enabled --quiet nm-cloud-setup.service 2>/dev/null'
ExecStartPre=-/sbin/modprobe br_netfilter
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/k3s agent
AGENTSERVICE

# Create extensions-release file
name=k3s-"$latest_version"
printf "ID=_any\nARCHITECTURE=x86-64\n" > usr/lib/extension-release.d/extension-release."${name}"
printf "EXTENSION_RELOAD_MANAGER=1\n" >> usr/lib/extension-release.d/extension-release."${name}"
find . -type d -empty -delete
EOF

# Create just one layer with all the files that we need
FROM scratch
COPY --from=builder /k3s /
```

Build the image using docker:

```bash
docker build -t k3s-sysext .
```

If you don't have a set of keys already,
create one with the following Auroraboot command:

```bash
docker run --rm -v "$PWD"/keys:/keys quay.io/kairos/auroraboot:latest \
  genkey --output /keys
```

Build the system extension using Auroraboot:

```bash
docker run --rm \
  -v "$PWD"/keys:/keys \
  -v "$PWD"/system-extensions:/build/ \
  -v /var/run/docker.sock:/var/run/docker.sock \
  quay.io/kairos/auroraboot:latest sysext --private-key=/keys/db.key --certificate=/keys/db.pem --output=/build k3s k3s-sysext
```

## Creating a Kairos image

The following command will create a Kairos iso which embeds the system extension
we created in the steps above. The OS image itself will be signed with the same
set of keys as the system extension.

```bash
docker run --rm --privileged \
  -v $PWD/build:/result \
  -v $PWD/keys:/keys \
  -v $PWD/system-extensions:/system-extensions \
  quay.io/kairos/auroraboot build-uki \
    --output-dir /result \
    --overlay-iso /system-extensions \
    -k /keys \
    --output-type iso \
    oci:{{<oci variant="core">}}-uki
```

## Deploying Kairos

The ISO inside the `build` directory is ready to be booted on a system that
supports secure boot, either a VM or real hardware.

The process is described in the Kairos docs here:

https://kairos.io/docs/installation/trustedboot/#installation

The following config.yaml will ensure the k3s service starts automatically on boot:

```yaml
#cloud-config

users:
  - name: kairos
    passwd: kairos
    groups:
      - admin

stages:
    boot:
    - name: "Starting k3s"
      commands:
        - |
          systemctl enable k3s.service
          systemctl start k3s.service
```

After the installation has finished, we can check that k3s is indeed available:

```bash
# Make sure we get a login shell for root
sudo -i
systemd-sysext status
```

the output should look something like this:

```
HIERARCHY      EXTENSIONS SINCE
/usr/bin       none       -
/usr/include   none       -
/usr/lib       k3s        Thu 2024-11-28 14:46:40 UTC
/usr/local/bin k3s        Thu 2024-11-28 14:46:40 UTC
/usr/local/lib k3s        Thu 2024-11-28 14:46:40 UTC
/usr/sbin      none       -
/usr/share     none       -
/usr/src       none       -
```

## Conclusion

With the help of systemd system extensions we managed to extend a core image with
k3s. The system extension can be built and updated on a different pace than the OS itself.
It's also signed and checked by systemd making it tamper proof.

## Read more

- https://kairos.io/docs/advanced/sys-extensions/
