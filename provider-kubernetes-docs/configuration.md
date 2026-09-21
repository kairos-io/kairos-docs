---
title: "Configuration"
linkTitle: "Configuration"
weight: 2
description: The cluster block the provider reads, the kubeadm fields it passes through, and the keys it ignores.
sidebar_position: 2
---

Everything the provider reads lives in the `cluster:` block of the node's cloud-config. Kairos parses the cloud-config and hands the provider that block; the provider validates it, merges its defaults, and converges the node.

The provider reads a deliberate subset of the keys available to it. Anything outside that subset is ignored rather than forwarded to kubeadm. This page is the subset.

## The cluster block

```yaml
cluster:
  cluster_token: "a-long-high-entropy-correlation-string"
  control_plane_host: "192.168.1.10"
  role: init
  providerConfig:
    cluster_root_path: "/"
  config: |
    # kubeadm v1beta4 documents, see below
```

### cluster_token

Required. A cluster-wide correlation value, not key material. The provider derives no credential from it; kubeadm's own generators produce every token and key the cluster uses.

It is rejected at ingest if it is empty, whitespace only, or shorter than 16 characters. Below roughly 128 bits of estimated entropy the provider logs a one-time warning and continues. There is no character-set restriction. It is never logged. Treat it as confidential anyway: see [Security](../security).

### control_plane_host

Required. The API server address this node uses. A bare host gets `:6443` appended. What it means depends on the role:

| Role | Meaning |
|------|---------|
| `init` | This node's own advertise address, or the stable cluster endpoint if you have one. |
| `controlplane` | The address the joining node reaches the existing control plane at. For a highly available cluster this is the shared endpoint, not any one node. |
| `worker` | Same as `controlplane`. |

### role

Required. One of `init`, `controlplane`, `worker`.

`init` runs `kubeadm init`. It refuses to run if a control plane already answers at the endpoint, so a stray `init` node cannot destroy a live cluster.

`controlplane` joins as an additional stacked-etcd control plane. It needs a certificate key and a non-empty `controlPlaneEndpoint`; an empty endpoint is a hard failure at this role.

`worker` joins as a worker.

### providerConfig.cluster_root_path

Optional, defaults to `/`. The filesystem root the provider operates under. It is where the provider looks for `etc/kubernetes/...`, `var/lib/kubelet` and the rest. The reset path validates it (absolute, no traversal) before it removes anything.

`providerConfig` is a string-to-string map and `cluster_root_path` is the only key the provider reads from it.

### ca_certs

Optional. A list of CA certificates in PEM form, used when you join a control plane the provider did not bootstrap. The provider derives the SPKI pin from the PEM, so you do not have to precompute a hash.

This is a key of the `cluster:` block itself, not of the inner `config:` string. If you supply both `ca_certs` and explicit `caCertHashes`, the two are cross-validated and a mismatch is a hard error.

### cluster_config_path

Optional. Names the file Kairos writes the final cluster configuration to. The provider honors it only when its directory part is exactly `/usr/local/cloud-config`. Anything else, including a relative path or one containing `..`, is rejected with `reason: ClusterConfigOverrideRejected` and nothing is created for you. See [Trusted boot](../trusted-boot), where this matters most.

## The config block

`config:` is a raw YAML string holding kubeadm documents. The provider models the kubeadm **v1beta4** schema directly rather than importing `k8s.io/kubernetes`, so the key names are upstream kubeadm's. v1beta3 is not supported.

Everything the provider reads from it:

```yaml
config: |
  clusterConfiguration:
    kubernetesVersion: v1.37.0
    controlPlaneEndpoint: "k8s-api.example.test:6443"
    imageRepository: registry.k8s.io
    networking:
      podSubnet: "10.244.0.0/16"
      serviceSubnet: "10.96.0.0/12"
      dnsDomain: cluster.local
    apiServer:
      certSANs:
        - "k8s-api.example.test"
        - "10.0.0.10"
  initConfiguration:
    localAPIEndpoint:
      advertiseAddress: "10.0.0.10"
      bindPort: 6443
    nodeRegistration:
      name: cp-init
      criSocket: "unix:///run/containerd/containerd.sock"
      kubeletExtraArgs:
        - name: node-ip
          value: "10.0.0.10"
      taints: []
  joinConfiguration:
    discovery:
      bootstrapToken:
        token: "abcdef.0123456789abcdef"
        apiServerEndpoint: "k8s-api.example.test:6443"
        caCertHashes:
          - "sha256:the-ca-spki-pin"
      file:
        kubeConfigPath: "/path/to/discovery.conf"
    controlPlane:
      certificateKey: "a-fresh-certificate-key"
      localAPIEndpoint:
        advertiseAddress: "10.0.0.11"
        bindPort: 6443
```

`clusterConfiguration` and `initConfiguration` apply to `role: init`. `joinConfiguration` applies to `controlplane` and `worker`; its `controlPlane` section applies to `controlplane` only.

### Defaults and things the provider adds

`dnsDomain` defaults to `cluster.local` and `criSocket` to `unix:///run/containerd/containerd.sock` when you leave them out.

`controlPlaneEndpoint` defaults to `control_plane_host` with `:6443` appended if no port is present. A value you set wins over the derived one.

The provider adds both the `control_plane_host` and the `controlPlaneEndpoint` host, with ports stripped, to `apiServer.certSANs`, so TLS to the endpoint validates. Anything you list there is kept.

Bootstrap tokens and the certificate key used by `--upload-certs` are generated at runtime. Do not put `bootstrapTokens` in `initConfiguration`.

For a control-plane join, `joinConfiguration.controlPlane.localAPIEndpoint` takes precedence over `initConfiguration.localAPIEndpoint` for the advertise address and bind port. Set it to the joining node's own routable IP, which matters on a multi-homed node. The control plane that mints the join material cannot know that address, so `mint-join` leaves a placeholder unless you pass `--advertise-address`.

### Rules the provider enforces

Token discovery requires `caCertHashes` or a `ca_certs` value it can derive them from. The provider refuses to emit a join config without a CA anchor, and it never sets `unsafeSkipCAVerification`. A CA-embedded discovery file (`discovery.file.kubeConfigPath`) is the other accepted anchor.

`kubernetesVersion` must be inside the supported window and must match the kubeadm binary in the image you booted. Both are hard errors, checked before anything destructive runs. Bumping it to the next minor is what triggers an upgrade: see [Upgrades](../upgrades).

`bindPort` defaults to kubeadm's 6443. If you move it, `controlPlaneEndpoint`, `control_plane_host` and every joiner's `apiServerEndpoint` have to carry the same port. The provider's local API health probe follows `bindPort`, and its reachability probe dials `control_plane_host` literally.

`imageRepository` defaults to kubeadm's `registry.k8s.io`. The images bundled in the OS image cover that repository only, so setting a mirror means kubeadm looks for references the bundle does not carry and pulls them. See [Air-gapped installs](../air-gapped).

## Keys the provider ignores

Anything in `config:` that is not listed above is dropped, not forwarded to kubeadm. The most common surprise is `kubeletConfiguration`: a document by that name in `config:` has no effect. The provider emits its own `KubeletConfiguration`, and only to pin `clusterDNS` when you set a custom `serviceSubnet`. To change kubelet behavior, use `initConfiguration.nodeRegistration.kubeletExtraArgs`, or ship a systemd drop-in for `kubelet.service` in a derived image.

Two keys of the `cluster:` block itself are also not read: `import_local_images` and `local_images_path`. The provider imports the bundle in the OS image and nothing else.

`env` is parsed but not applied. Variables set there reach neither the provider nor kubeadm, containerd or the kubelet. Configure proxies for containerd and the kubelet through their systemd units.

## Proxy environment

The provider passes `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY`, and their lowercase spellings, from its own process environment to `kubeadm` and `kubectl`. Nothing else from that environment is passed on. Other names such as `ALL_PROXY` are not.

kubeadm copies these values verbatim into the control-plane static pods and the kube-proxy DaemonSet, where anyone who can read those objects can read them. Do not put credentials in a proxy URL.

## Joining a control plane the provider did not bootstrap

This is a supported topology. Supply the trust anchor yourself, in one of three ways: `ca_certs` plus a bootstrap token, a bootstrap token with explicit `caCertHashes`, or a CA-embedded discovery file. CA pinning is mandatory in all three.

The path is exercised end to end in the provider's CI: a control plane is stood up with plain `kubeadm init`, which the provider never touches, and a worker then joins through the provider using only the operator-supplied CA PEM.
