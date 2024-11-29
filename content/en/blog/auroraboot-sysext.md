---
title: "Creating system extensions for Kairos"
date: 2024-11-25
linkTitle: "Creating Kairos system extensions"
author: Dimitris Karakasilis ([GitHub](https://github.com/jimmykarily), [LinkedIn](https://www.linkedin.com/in/dkarakasilis/))
---

In this guide, you'll learn how to extend Kairos OS functionality using system extensions while maintaining security through trusted boot. We'll walk through creating a system extension that adds Kubernetes capabilities (k3s) to a Kairos core image. This approach allows you to keep your base OS image small and secure while dynamically adding features at runtime. Whether you're dealing with firmware size limitations or want to maintain separate lifecycles for different components, system extensions provide a powerful solution that doesn't compromise on security.

## Understanding Trusted Boot in Kairos

The most secure way to install Kairos is in [trusted boot mode](https://kairos.io/docs/installation/trustedboot/). In this mode, the whole OS is measured and signed, making it impossible for a malicious actor to tamper with it.

### Limitations and Challenges

You might wonder - should there be another way to install Kairos? The answer lies in some practical limitations:

- Trusted boot requires specific hardware support (like a TPM chip)
- Different firmware implementations have varying size limits for EFI files
- We've observed these limits ranging from 800MB to more than 1.3GB
- Projects can hit these limits when adding:
  - Additional drivers
  - Extra tools and binaries
  - Other dependencies

### Addressing Size Constraints

One first step would be to ensure that there are no unnecessary files in the OS image. However, optimization alone isn't always enough to make the final EFI image small enough to boot on specific devices or hypervisors.

This is where [systemd system extensions](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html) come into play. In their own words:

> System extension images may – dynamically at runtime — extend the /usr/ and /opt/ directory hierarchies with additional files

The following diagram illustrates how system extensions overlay on top of the base OS:

TODO: Change the link to the image
![System Extensions Architecture](https://raw.githubusercontent.com/kairos-io/kairos-docs/refs/heads/2872-sysext-blog-post/assets/img/k3s-sysext.png)

The system extensions are images signed with the same keys as your OS, which makes them tamper proof. They are "overlayed" at runtime and can be used to extract parts of the system to separate images, making the main OS image smaller and thus possible to boot but also easier to maintain. The lifecycle of the extensions is different from that of the OS, thus they can be built and deployed separately.

## Building a sysext for Kairos

A system extension can be created manually by using the systemd tooling ([systemd-sysext](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html), [systemd-repart](https://www.freedesktop.org/software/systemd/man/latest/systemd-repart.html)). The Kairos project offers one more option, using the [Auroraboot tool](https://github.com/kairos-io/AuroraBoot).

For the purposes of this document, let's use Auroraboot to create a system extension to package [k3s](https://k3s.io/) in a way that it can be overlayed on top of a Kairos core image (Kairos "core" images don't ship k3s).

{{% alert title="Note" %}}
This guide was tested with Auroraboot v0.3.3. While newer versions should work similarly, command syntax might vary slightly. You can check what the latest Auroraboot version is with:
```bash
docker run --rm quay.io/kairos/auroraboot:latest --version
```

You can specify a particular Auroraboot version by using a tagged image, for example: `quay.io/kairos/auroraboot:v0.3.3`.
{{% /alert %}}

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
  -v "$PWD"/overlay-iso:/build/ \
  -v /var/run/docker.sock:/var/run/docker.sock \
  quay.io/kairos/auroraboot:latest sysext --private-key=/keys/db.key --certificate=/keys/db.pem --output=/build k3s k3s-sysext

# Fix directory permissions
docker run -e USERID=$(id -u) -e GROUPID=$(id -g) --entrypoint /usr/bin/sh -v "$PWD"/overlay-iso:/overlay-iso --rm quay.io/kairos/auroraboot:latest -c 'chown -R $USERID:$GROUPID /overlay-iso'
```

## Creating a Kairos config

The following config.yaml will ensure the k3s service starts automatically on boot:

```bash
cat << EOF > overlay-iso/config.yaml
#cloud-config

install:
  auto: true
  reboot: true

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
EOF
```

## Creating a Kairos image

The following command will create a Kairos iso which embeds the system extension
we created in the steps above. The OS image itself will be signed with the same
set of keys as the system extension.

```bash
docker run --rm --privileged \
  -v $PWD/build:/result \
  -v $PWD/keys:/keys \
  -v $PWD/overlay-iso:/overlay-iso \
  quay.io/kairos/auroraboot build-uki \
    --output-dir /result \
    --overlay-iso /overlay-iso \
    -k /keys \
    --output-type iso \
    oci:{{<oci variant="core">}}-uki
```

## Deploying Kairos

The ISO inside the `build` directory is ready to be booted on a system that supports secure boot, either a VM or real hardware.
The process is described in the Kairos docs here: https://kairos.io/docs/installation/trustedboot#installation

The config we created above will ensure that installation starts automatically and the machine is shutdown after it's done.

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

## Alternative Use Cases and Approaches

While this guide focused on k3s, system extensions can be used for various other purposes:

1. **Driver Management**
   - GPU drivers for specific hardware
   - Network interface drivers
   - Storage drivers for specialized hardware

2. **Development Tools**
   - Compiler toolchains
   - Debug tools
   - Monitoring agents

3. **Application Stacks**
   - Container runtimes (Docker, containerd)
   - Database engines
   - Web servers

4. **Alternative Orchestrators**
   - Nomad
   - Docker Swarm
   - K0s

Each of these can be packaged as separate system extensions, allowing you to:
- Keep the base image minimal and secure
- Update components independently
- Mix and match functionality based on needs
- Maintain different signing keys for different extension types

## Conclusion

This guide demonstrated how to leverage systemd system extensions to extend Kairos OS
functionality while maintaining security through trusted boot. We successfully:
- Created a system extension to add k3s capabilities
- Built and signed the extension with the same keys as the OS
- Integrated it with a core Kairos image
- Deployed the combined system securely

System extensions solve the practical challenges of firmware size limitations while
enabling modular, secure OS customization. This approach allows independent
lifecycle management of components and maintains the security benefits of trusted
boot, making it an ideal solution for production environments where both
flexibility and security are crucial.

## Read more

- https://kairos.io/docs/advanced/sys-extensions/
