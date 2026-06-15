---
title: "Providers"
sidebar_label: "Providers"
sidebar_position: 7
description: Understand Kairos providers, how they integrate with kairos-agent, and how provider-kairos fits into the architecture.
---

Kairos providers are plugin binaries used to extend node behavior through lifecycle events.

In practice, many users use providers for Kubernetes bootstrap, but providers are not limited to Kubernetes. A provider gives you a mechanism to react to lifecycle events and execute your own logic for system components.

## Why providers exist

Providers let Kairos keep a modular architecture:

- **Core images** stay minimal and do not include Kubernetes providers.
- **Standard images** include a Kubernetes provider and related integrations.
- Additional behavior can be added without changing the core agent architecture.

Examples of what a provider can do:

- Bootstrap a component during install/first boot.
- Register custom lifecycle hooks.
- Attach networking/coordination components.
- Expose provider-specific CLI behavior.

## How provider integration works

Provider integration is event-driven.

- `kairos-agent` initializes a provider bus and auto-loads provider binaries with the `agent-provider` prefix from standard provider directories.
- Providers subscribe to known Kairos events and respond to them.
- Communication is done through the same plugin framework used by Kairos components (`go-pluggable`).

Reference implementation points in source code:

- Agent bus initialization and provider autoload:
  - [kairos-agent/internal/bus/bus.go](https://github.com/kairos-io/kairos-agent/blob/main/internal/bus/bus.go)
- Agent startup and event publishing:
  - [kairos-agent/main.go](https://github.com/kairos-io/kairos-agent/blob/main/main.go)
- Provider event registration:
  - [provider-kairos/internal/provider/start.go](https://github.com/kairos-io/provider-kairos/blob/main/internal/provider/start.go)
- Plugin framework used by agent/provider:
  - [mudler/go-pluggable](https://github.com/mudler/go-pluggable)

## Lifecycle semantics (important)

Provider hooks map to specific lifecycle events.

- A bootstrap event is tied to bootstrap/install flow.
- If you bootstrap Kubernetes with `provider-kairos`, that bootstrap event is not the event you use for normal upgrade cycles.
- For post-service orchestration patterns (for example running steps after k3s is up), use dedicated stages/services as shown in [Run stages along with K3s](/docs/examples/k3s-stages/).

For provider-related stage names, see [Cloud-init architecture](/docs/architecture/cloud-init/).

## Official and community providers

There are multiple providers in the ecosystem.

- **Officially maintained by Kairos**: `provider-kairos`
- **Community-maintained**: additional providers can be developed and maintained outside the core Kairos organization

The official `provider-kairos` currently includes:

- Kubernetes support for `k3s` and `k0s`.
- Edge networking capabilities through EdgeVPN for peer-to-peer coordination use cases.

Related docs:

- [P2P Network architecture](/docs/architecture/network/)
- [Single-node p2p](/docs/examples/single-node-p2p/)
- [Multi-node p2p](/docs/examples/multi-node-p2p/)
- [Multi-node p2p HA](/docs/examples/multi-node-p2p-ha/)
- [Multi-node p2p HA with KubeVIP](/docs/examples/multi-node-p2p-ha-kubevip/)
- [P2P end-to-end example](/docs/examples/p2p_e2e/)

## Core vs standard, from a provider perspective

- **Core**: no Kubernetes provider selected.
- **Standard**: a Kubernetes provider is included. In the official path, this means `provider-kairos` with either `k3s` or `k0s`.

For concrete build flags and examples, see:

- [Kairos Factory](/docs/reference/kairos-factory/)
- [Choosing Kubernetes Distribution](/docs/examples/choosing-kubernetes-distribution/)

## Configuration and runtime hooks

Provider behavior is configured through cloud-config provider sections and integrated with Kairos stages.

- Provider config keys: [Configuration reference](/docs/reference/configuration/#provider-configs)
- Provider-related lifecycle stages: [Cloud-init architecture](/docs/architecture/cloud-init/)
