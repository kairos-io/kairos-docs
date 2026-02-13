---
title: A Minimal Single-Node Kubernetes with Kubeadm
linkTitle: A Minimal Single-Node Kubernetes with Kubeadm
description: Learn how to build a Kairos image for a single-node Kubernetes cluster using the provider-kubeadm.
---


Kairos is all about giving you the power to customize your operating system just the way you need it—declaratively, reproducibly, and predictably. Today, we're walking through how to build and boot a Kairos image using the [provider-kubeadm](https://github.com/kairos-io/provider-kubeadm) to set up a Kubernetes cluster with `kubeadm`.

This guide is focused on a simple use case: booting a **single-node Kubernetes cluster** with role `init`, version `v1.30.0`.

---

## 🧱 What Is `provider-kubeadm`?

The [provider-kubeadm](https://github.com/kairos-io/provider-kubeadm) is a binary for Kairos that integrates with Kubernetes' `kubeadm` bootstrap process. It translates the familiar `kubeadm` configuration into a Kairos-compatible cloud-init YAML, wrapping everything in a reproducible and declarative boot process.

With this provider, we can fully define Kubernetes cluster parameters—including API server args, scheduler, networking, and etcd configuration—right inside a Kairos `#cloud-config` block.

---

## 🔧 Building the Image

We start with a Kairos base image—here, Ubuntu 24.04 Core—and layer on everything `kubeadm` needs: containerd, kubelet, kubectl, and the kubeadm binary. Also we will download and set the agent-provide-kubeadm to handle the `kubeadm` configuration.

Here's the Dockerfile used to construct the image:

```Dockerfile
FROM quay.io/kairos/ubuntu:24.04-core-amd64-generic-v3.4.2

# Add Kubernetes apt repository
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
RUN echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list

# Install required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    socat \
    conntrack \
    containerd \
    runc \
    kubelet \
    kubeadm \
    kubectl \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
# Copy the provider into place
RUN mkdir -p /system/providers && curl -L https://github.com/kairos-io/provider-kubeadm/releases/download/v4.7.0-rc.4/agent-provider-kubeadm-v4.7.0-rc.4-linux-amd64.tar.gz | tar -xz -C /system/providers/
```

Or with the modern [Kairos Factory](./kairos-factory) method:

```Dockerfile
FROM quay.io/kairos/kairos-init:latest AS kairos-init

FROM ubuntu:24.04
ARG VERSION=1.0.0
RUN --mount=type=bind,from=kairos-init,src=/kairos-init,dst=/kairos-init /kairos-init --version "${VERSION}"
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
RUN echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list

# Install required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    socat \
    conntrack \
    containerd \
    runc \
    kubelet \
    kubeadm \
    kubectl \
 && apt-get clean && rm -rf /var/lib/apt/lists/* 
RUN mkdir -p /system/providers && curl -L https://github.com/kairos-io/provider-kubeadm/releases/download/v4.7.0-rc.4/agent-provider-kubeadm-v4.7.0-rc.4-linux-amd64.tar.gz | tar -xz -C /system/providers/
```

---

## ☁️ The Cloud-Config

Here's the heart of the system—a Kairos-compatible `#cloud-config` YAML. This config installs the OS, sets up kernel and containerd parameters, and passes the full `kubeadm` configuration block to the `provider-kubeadm`.

```yaml
#cloud-config
install:
  device: auto
  auto: true
  reboot: true

cluster:
  cluster_token: "random_token"
  control_plane_host: "1.1.1.1"
  role: init
  config: |
    clusterConfiguration:
      apiServer:
        extraArgs:
          advertise-address: 0.0.0.0
          anonymous-auth: "true"
          audit-log-maxage: "30"
          audit-log-maxbackup: "10"
          audit-log-maxsize: "100"
          audit-log-path: /var/log/apiserver/audit.log
          authorization-mode: RBAC,Node
          default-not-ready-toleration-seconds: "60"
          default-unreachable-toleration-seconds: "60"
          disable-admission-plugins: AlwaysAdmit
          enable-admission-plugins: AlwaysPullImages,NamespaceLifecycle,ServiceAccount,NodeRestriction
          profiling: "false"
          secure-port: "6443"
          tls-cipher-suites: TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,...
        extraVolumes:
          - hostPath: /var/log/apiserver
            mountPath: /var/log/apiserver
            name: audit-log
            pathType: DirectoryOrCreate
        timeoutForControlPlane: 10m0s
      controllerManager:
        extraArgs:
          feature-gates: RotateKubeletServerCertificate=true
          profiling: "false"
          terminated-pod-gc-threshold: "25"
          use-service-account-credentials: "true"
      etcd:
        local:
          dataDir: /etc/kubernetes/etcd
          extraArgs:
            listen-client-urls: https://0.0.0.0:2379
      kubernetesVersion: v1.30.0
      networking:
        podSubnet: 192.168.0.0/16
        serviceSubnet: 192.169.0.0/16

    initConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          event-qps: "0"
          feature-gates: RotateKubeletServerCertificate=true
          protect-kernel-defaults: "true"
          read-only-port: "0"

    joinConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          event-qps: "0"
          feature-gates: RotateKubeletServerCertificate=true
          protect-kernel-defaults: "true"
          read-only-port: "0"

    kubeletConfiguration:
      authentication:
        anonymous: {}
        webhook: { cacheTTL: 0s }
        x509: {}
      authorization:
        webhook:
          cacheAuthorizedTTL: 0s
          cacheUnauthorizedTTL: 0s
      cpuManagerReconcilePeriod: 0s
      logging:
        flushFrequency: 0
        options:
          json:
            infoBufferSize: "0"
        verbosity: 0

stages:
  initramfs:
    - name: pre-kubeadm
      sysctl:
        net.ipv4.conf.default.rp_filter: 0
        net.ipv4.conf.all.rp_filter: 0
        net.bridge.bridge-nf-call-ip6tables: 1
        net.bridge.bridge-nf-call-iptables: 1
        net.ipv4.ip_forward: 1
        kernel.panic: "10"
        kernel.panic_on_oops: "1"
        vm.overcommit_memory: "1"
      modules:
        - br_netfilter
        - overlay
      files:
        - path: /etc/containerd/config.toml
          permissions: "0644"
          content: |
            [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
              SystemdCgroup = true
            [plugins."io.containerd.grpc.v1.cri"]
              sandbox_image = "registry.k8s.io/pause:3.8"
        - path: /etc/hosts
          permissions: "0644"
          content: |
            127.0.0.1 localhost
      users:
        kairos:
          passwd: kairos
          groups:
            - sudo
      commands:
        - ln -s /etc/kubernetes/admin.conf /run/kubeconfig
        - mkdir -p /etc/kubernetes/manifests
```

* `cluster.role` is set to `init`, so this node bootstraps the control plane. For a multi-node setup, change this to `join` and provide discovery options.

## 🔄 What’s Next?

This is a minimal setup, but it lays the groundwork for more advanced clusters. From here, you can:

* Customize the CNI (via the containerd config or an additional stage),
* Inject manifests into `/etc/kubernetes/manifests`,
* Scale to multiple nodes with `join` configurations and token-based discovery.

And, of course, all of this benefits from the immutability and reproducibility that Kairos brings to the OS layer.

---

If you want to see more examples or contribute to the `provider-kubeadm`, check out the [GitHub repo](https://github.com/kairos-io/provider-kubeadm) or hop into our community channels.

Let us know how you're bootstrapping Kubernetes with Kairos—we'd love to feature your use case!
