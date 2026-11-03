---
title: "Deploy a k0s Cluster Step by Step"
sidebar_label: "k0s cluster step by step"
description: A complete beginner-friendly walkthrough to bootstrap a multi-node Kubernetes cluster with the k0s provider, choosing exactly which nodes act as controllers and which as workers.
slug: /examples/k0s-cluster
---

This guide walks you through deploying a complete Kubernetes cluster with Kairos and the [k0s](https://k0sproject.io/) provider, from downloading an image to retrieving a working `kubeconfig`. Unlike the [P2P self-coordinating setup](/docs/installation/p2p), here **you decide explicitly which nodes are controllers and which are workers** — the role of each node is determined by the configuration file you give it at install time.

By the end you will have:

- One controller node (optionally more, for a highly available control plane)
- One or more worker nodes
- A `kubeconfig` to manage the cluster from your own machine

## How roles work with the k0s provider

Each Kairos node gets its role from which block you enable in its cloud-config. There is no election or autodiscovery in this flow — the config *is* the role assignment:

| Block in cloud-config | Role of the node | k0s service started |
|---|---|---|
| `k0s:` | Controller (control plane) | `k0scontroller` |
| `k0s-worker:` | Worker | `k0sworker` |

Enable exactly one of the two blocks per node.

If you are cross-reading the [upstream k0s documentation](https://docs.k0sproject.io/stable/k0s-multi-node/): its `k0s install controller/worker ... --start` steps are handled for you by Kairos — the config block selects which service runs, and anything you put in `args:` is passed to the `k0s controller` or `k0s worker` command. Everything else (tokens, ports, k0s behavior) works exactly as upstream documents.

:::warning Controllers don't run workloads by default
A plain k0s controller does **not** run a kubelet. It won't show up in `kubectl get nodes` and won't schedule any pods — this is expected k0s behavior, not a broken install. If you want a controller to also act as a worker (common in small clusters), add `--enable-worker` to its args, as shown below.
:::

## What you need

- Two or more machines (bare metal or VMs) on the same network, each with at least 2GB of RAM and 40GB of disk
- A Kairos **standard** image that bundles k0s. Standard images are published for every release, e.g. `quay.io/kairos/opensuse:leap-15.6-standard-amd64-generic-v3.5.0-k0s-v1.33.3-k0s.0`. ISOs are available from the [Kairos releases page](https://github.com/kairos-io/kairos/releases) — pick an artifact with `standard` and `k0s` in its name.
- A way to boot the machines with the image and a cloud-config: see the [Installation](/docs/installation/) section. The simplest path is booting the ISO and using [manual](/docs/installation/manual) or [automated](/docs/installation/automated) installation.

## Step 1: Install the first controller

Create a cloud-config for the node you want as your (first) controller. This is the only node you boot for now.

```yaml
#cloud-config

hostname: controller-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k0s:
  enabled: true
```

If you want this controller to also schedule workloads (a good fit for a 2–3 machine cluster), enable the embedded worker:

```yaml
k0s:
  enabled: true
  args:
    - --enable-worker
```

Install the node with this config and let it reboot into the installed system.

:::tip Single node?
If this machine will be your entire cluster, use `args: ["--single"]` instead and stop here — see the [single-node example](/docs/examples/single-node).
:::

## Step 2: Verify the controller and create join tokens

SSH into the controller (`ssh kairos@<CONTROLLER_IP>`) and check that k0s is up:

```bash
sudo k0s status
```

You should see `Role: controller` and a running process. Now create the tokens the other nodes will use to join. Tokens are role-specific:

```bash
# One token for the worker nodes
sudo k0s token create --role=worker

# Only if you plan to add more controllers (Step 4)
sudo k0s token create --role=controller
```

Each command prints a long base64 string. Copy them somewhere safe — you'll paste them into the configs of the joining nodes.

:::info
Tokens are credentials: anyone holding one can join a node to your cluster. Treat them like passwords and prefer short-lived tokens (`--expiry 1h`) if the machines join right away.
:::

## Step 3: Join the workers

For every worker node, use this cloud-config. Note the block is `k0s-worker`, and the token is the one created with `--role=worker`:

```yaml
#cloud-config

hostname: worker-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k0s-worker:
  enabled: true
  args:
    - --token-file /etc/k0s/token

write_files:
- path: /etc/k0s/token
  permissions: "0600"
  content: |
    <WORKER_TOKEN> # the output of `k0s token create --role=worker` on the controller
```

The same config (with the same token) works for all workers — the hostname template gives each machine a unique name. Install each worker and let it reboot; it will connect to the controller and register itself.

## Step 4 (optional): Add more controllers for high availability

To make the control plane highly available, join additional controller nodes. Use an **odd total number of controllers** (1, 3, 5, ...) so etcd can keep quorum.

The config for a joining controller uses the `k0s` block — same as the first controller — plus the token created with `--role=controller`:

```yaml
#cloud-config

hostname: controller-{{ trunc 4 .MachineID }}
users:
- name: kairos # Change to your own user
  passwd: kairos # Change to your own password
  groups:
    - admin # This user needs to be part of the admin group
  ssh_authorized_keys:
    - github:<YOUR_GITHUB_USER> # replace with your github user

k0s:
  enabled: true
  args:
    - --token-file /etc/k0s/token

write_files:
- path: /etc/k0s/token
  permissions: "0600"
  content: |
    <CONTROLLER_TOKEN> # the output of `k0s token create --role=controller` on the first controller
```

:::info Production tip
In production, put a load balancer in front of the controllers instead of pointing everything at the first controller's IP. See the [k0s control plane HA documentation](https://docs.k0sproject.io/stable/high-availability/) for the details, and our [KubeVIP example](/docs/examples/multi-node-p2p-ha-kubevip/) for a self-hosted virtual IP approach.
:::

## Step 5: Verify the cluster and get the kubeconfig

On the controller, check that all workers registered:

```bash
sudo k0s kubectl get nodes
```

```
NAME              STATUS   ROLES    AGE     VERSION
worker-9a3f       Ready    <none>   2m      v1.33.3+k0s
worker-c81d       Ready    <none>   1m      v1.33.3+k0s
```

Remember: controllers only appear in this list if they were installed with `--enable-worker` (workers showing `ROLES: <none>` is also normal — k0s doesn't label them). To list the control plane itself, ask etcd on any controller:

```bash
sudo k0s etcd member-list
```

```
{"members":{"controller-27a0":"https://192.168.122.55:2380"}}
```

Every controller that joined in Step 4 shows up here — this is the way to verify a highly available control plane.

To manage the cluster from your own machine, export an admin kubeconfig from the controller:

```bash
sudo k0s kubeconfig admin > kubeconfig
```

Copy it over (e.g. `scp kairos@<CONTROLLER_IP>:kubeconfig .`), replace the `https://localhost:6443` server address inside it with the controller's IP if needed, and point `kubectl` at it:

```bash
export KUBECONFIG=$PWD/kubeconfig
kubectl get nodes
```

## Troubleshooting

- **The controller doesn't show up in `kubectl get nodes`** — expected unless it runs with `--enable-worker` or `--single`. See the warning at the top of this page.
- **A node didn't join** — on the affected node, check the service logs: `sudo systemctl status k0scontroller` or `sudo systemctl status k0sworker`, and `sudo k0s status`. The most common causes are a wrong or expired token, a token created for the wrong role, or the controller's ports not being reachable (6443 for the Kubernetes API, 8132 for konnectivity, 9443 for the controller join API).
- **Wrong role token** — worker nodes need a `--role=worker` token, joining controllers need a `--role=controller` token. They are not interchangeable.
- **Config didn't apply** — verify the cloud-config landed on the node: `sudo cat /oem/90_custom.yaml`.

## Next steps

- Deploy workloads automatically at boot with [Kubernetes manifests](/docs/reference/configuration#kubernetes-manifests)
- Explore all `k0s` and `k0s-worker` options in the [configuration reference](/docs/reference/configuration#provider-configs)
- Prefer nodes that discover each other and assign roles automatically? See the [P2P self-coordinating setup](/docs/installation/p2p)
- Learn how providers work under the hood in the [providers architecture page](/docs/architecture/providers)
