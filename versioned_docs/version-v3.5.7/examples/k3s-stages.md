---
title: "Run stages along with K3s"
sidebar_label: "Run stages along with K3s"
description: This section describes a method to run stages with k3s.
---

:::info Info
This tutorial is based on Debian Bookworm. Unit file configurations vary across distributions, and we are not able to test them all, but they should be easily adaptable from this tutorial.
:::

# Introduction

Some use cases require a stage to run after the K3s servers are up, such as applying manifests to the Kubernetes cluster, sending health checks, or any other use case. Using systemd units, we are able to run a stage once a service is started, which can be used for K3s and K3s-server to run steps after the K3s server is up and ready to accept requests.

# Requirements

 - A custom image that adds a systemd unit file to run our stage

# Steps

 - Build the custom derivative artifact
 - Build an iso from that artifact
 - Install the iso
 - Check that the stage runs and works


### Building the custom derivative

We will keep this short as there are more docs that go more in-depth into building your derivatives than this tutorial such as the [Customizing page](/docs/v3.5.7/advanced/customizing/).

The main step is to create an image that has the systemd units we need to run our stages.


```dockerfile
FROM quay.io/kairos/debian:bookworm-standard-amd64-generic-v3.2.1-k3sv1.29.9-k3s1

# Add unit files
# This can be adapted to any service running on the system, such as k3s-server to run a stage when the server is ready
RUN <<EOF cat >> /etc/systemd/system/k3s-ready.service
[Unit]
Description=Kairos k3s booted stage runner (k3s)
After=k3s.service

[Service]
Type=oneshot
# provider-kairos.bootstrap.after.k3s-ready is run when k3s is up
ExecStart=kairos-agent run-stage provider-kairos.bootstrap.after.k3s-ready
TimeoutSec=30

[Install]
# Start this service (to run the stage) when the k3s service is ready
WantedBy=k3s.service
EOF

# Enable services. early service is the one on the initramfs
RUN systemctl enable k3s-ready.service
```
We use a systemd unit to hook into the lifecycle of the k3s service and run our stage when needed. Crucially, the `WantedBy=k3s.service` line allows our service to be automatically started when k3s is ready.

Then we generate a new artifact using that dockerfile:
```bash
$ docker build -t k3s-stage-kairos .
[+] Building 0.6s (7/7) FINISHED                                                                         docker:default
 => [internal] load build definition from Dockerfile                                                               0.1s
 => => transferring dockerfile: 793B                                                                               0.0s
 => [internal] load metadata for quay.io/kairos/debian:bookworm-standard-amd64-generic-v3.2.1-k3sv1.29.9-k3s1      0.2s
 => [internal] load .dockerignore                                                                                  0.1s
 => => transferring context: 2B                                                                                    0.0s
 => [1/3] FROM quay.io/kairos/debian:bookworm-standard-amd64-generic-v3.2.1-k3sv1.29.9-k3s1@sha256:6601bbdfb4c5d2  0.0s
 => CACHED [2/3] RUN <<EOF cat >> /etc/systemd/system/k3s-ready.service                                            0.0s
 => CACHED [3/3] RUN systemctl enable k3s-ready.service                                                            0.0s
 => exporting to image                                                                                             0.0s
 => => exporting layers                                                                                            0.0s
 => => writing image sha256:08b48d7fa78ad75755e47b18d4401c06405174bfc047f43352c13ee84662fd4f                       0.0s
 => => naming to docker.io/library/k3s-stage-kairos           
```

### Build an iso from that artifact

Again, this tutorial does not cover this part deeply as there already are docs that provide a deep insight into custom images such as the the [AuroraBoot page](/docs/v3.5.7/reference/auroraboot/).

```bash
$ docker run -v "$PWD"/build-iso:/tmp/auroraboot -v /var/run/docker.sock:/var/run/docker.sock --rm -ti quay.io/kairos/auroraboot --set container_image="docker://k3s-stage-kairos" --set "disable_http_server=true" --set "disable_netboot=true" --set "state_dir=/tmp/auroraboot"
2:38PM INF Pulling container image 'k3s-stage-kairos' to '/tmp/auroraboot/temp-rootfs' (local: true)
2:38PM INF Generating iso 'kairos' from '/tmp/auroraboot/temp-rootfs' to '/tmp/auroraboot/build'
```


### Install the iso

Then we burn the resulting ISO to a DVD or USB stick and boot it normally. 

We can check if our newly implemented stage is run correctly with k3s:

```yaml
#cloud-config
k3s:
  enabled: true

users:
- name: kairos
  # Change to your pass here
  passwd: kairos
  groups:
  - admin

stages:
  'provider-kairos.bootstrap.after.k3s-ready':
    - name: "Create /tmp/k3s-ready file"
      commands:
      - "touch /tmp/k3s-ready"
```

### Check that the service is enabled and works

Once the system has been installed, the `k3s-ready` service is run after the k3s service has been started and running. After running, it should be in the status `Inactive`, and the `/tmp/k3s-ready` file should exist once k3s has started.

