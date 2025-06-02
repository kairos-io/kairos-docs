---
title: "Takeover"
linkTitle: "Takeover"
description: Learn how to enable Trusted Boot support in Kairos, which combines FDE, Secure Boot, and Measured Boot to protect your system from tampering and cold attacks.
weight: 7
date: 2022-11-13
---

Kairos supports takeover installations. Here are a few summarized steps:

- From the dedicated control panel (OVH, Hetzner, etc.), boot in *rescue* mode
- [Install docker](https://docs.docker.com/engine/install/debian/) and run for example:

```bash
export DEVICE=/dev/sda
export IMAGE={{<oci variant="core">}}
cat <<'EOF' > config.yaml
#cloud-config
users:
- name: "kairos"
  passwd: "kairos"
  groups:
    - admin
  ssh_authorized_keys:
  - github:mudler
EOF
export CONFIG_FILE=config.yaml
docker run --privileged -v $PWD:/data -v /dev:/dev -ti $IMAGE kairos-agent manual-install --device $DEVICE --source dir:/ /data/$CONFIG_FILE
```

{{% alert title="Note" color="warning" %}}

`--source` flag refers to the source of installation. If you want to install from the pulled docker image you can set the `--source` flag to `dir:/` to use the root dir of the image as install source. Otherwise you can point it to an oci image with the `oci:` prefix.

{{% /alert %}}


- Switch back to *booting* from HD and reboot.
