---
title: "AuroraBoot fleet server"
sidebar_label: "Fleet server"
sidebar_position: 1
description: Manage Kairos nodes remotely with the AuroraBoot fleet server - dashboard, REST API, node registration, groups, labels and remote commands
---

The **fleet server** is the long-running mode of AuroraBoot. You start it with
`auroraboot web`, and it gives you a dashboard, a REST API, a node manager, a
SecureBoot key store and a netboot server from the same binary that builds your
images.

It is how you manage Kairos nodes remotely without SSH. Nodes built by
AuroraBoot register themselves on first boot and appear in the Nodes list, and
from there you send them commands: upgrade, upgrade the recovery partition,
apply a cloud-config, reboot, factory reset, or run a shell command.

:::info
This page covers the fleet server. For the one-shot CLI (`build-iso`,
`build-uki`, `netboot` and the other subcommands), see the
[AuroraBoot reference](/docs/reference/auroraboot/).
:::

## When to use it

AuroraBoot runs in two ways, from one binary:

| | One-shot CLI | Fleet server |
|---|---|---|
| Command | `auroraboot build-iso`, `auroraboot netboot`, ... | `auroraboot web` |
| Lifetime | Runs, does the job, exits | Stays up |
| State | None | Database, artifacts, keys, registered nodes |
| Good for | A quick build, a one-off netboot, a scripted pipeline | A fleet you manage over time |

You do not need the fleet server to build an image or to netboot a machine. Use
it when you want the nodes to stay visible after they are installed, and when
you want to act on them later.

## Getting started

```bash
git clone https://github.com/kairos-io/AuroraBoot
cd AuroraBoot
docker compose up --build -d
```

On the first start, AuroraBoot generates an admin password and a node
registration token. The compose file keeps `/data` in a named volume, so read
them from inside the container:

```bash
docker compose exec auroraboot cat /data/secrets/admin-password
docker compose exec auroraboot cat /data/secrets/registration-token
```

Open `http://localhost:9099` and sign in. The welcome wizard goes through the
three steps: build an artifact, deploy it, manage the nodes that come online.

:::warning Set the external URL
If you reach the UI from another machine, set `AURORABOOT_URL` to an address
that the **nodes** can resolve, before you start the stack. With it unset,
AuroraBoot falls back to the container hostname, which nodes cannot resolve, so
they cannot phone home. The host part of this URL is also the netboot server
address that the Deploy dialog reports.
:::

### Settings

| Flag | Environment variable | Default | What it does |
|---|---|---|---|
| `--listen` | | `:8080` | HTTP listen address. The compose file publishes it on `9099` |
| `--data-dir` | | `./data` | Where the database, artifacts, keys and secrets live |
| `--db` | | SQLite under `--data-dir` | Database DSN. PostgreSQL is supported |
| `--url` | `AURORABOOT_URL` | | External URL of this instance, written into the cloud-config of every artifact it builds |
| | `AURORABOOT_ADMIN_PASSWORD` | generated | Overrides the admin password |
| | `AURORABOOT_REG_TOKEN` | generated | Overrides the registration token |

## Node registration

Every artifact the fleet server builds carries a `phonehome` cloud-config
stage with the server URL and the registration token. The node registers itself
on first boot and then sends a heartbeat, so you do not have to touch it.

To register a node that was **not** built by this server, run the install script
on it. It writes the same configuration to `/oem/phonehome.yaml`:

```bash
curl -sSL https://auroraboot.example.com/api/v1/install-agent \
  | REGISTRATION_TOKEN=<token> AURORABOOT_GROUP=production sh
```

`AURORABOOT_GROUP` is optional and puts the node straight into a group.

### Rate limits

The endpoints a node drives, which are registration, heartbeat and command
polling, are rate limited **by default**, so one misbehaving node or one leaked
registration token cannot flood the server. Registration is limited per client
IP, heartbeat and command polling per node. Admin, UI and API traffic is never
rate limited.

| Flag | Environment variable | Default |
|---|---|---|
| `--node-rate-limit` | `AURORABOOT_NODE_RATE_LIMIT` | 5 requests/sec per node |
| `--node-rate-limit-burst` | `AURORABOOT_NODE_RATE_LIMIT_BURST` | 20 |
| `--register-rate-limit` | `AURORABOOT_REGISTER_RATE_LIMIT` | 0.5 requests/sec per client IP |
| `--register-rate-limit-burst` | `AURORABOOT_REGISTER_RATE_LIMIT_BURST` | 20 |
| `--disable-rate-limit` | `AURORABOOT_DISABLE_RATE_LIMIT` | off |

The rate is the sustained refill. The burst is how many requests one identity
may make in the same instant. Left unset, the burst is the larger of 20 and one
second of the configured rate, so a higher rate also raises the peak.

Two cases need attention:

- **A rack behind one NAT address.** All of those nodes share a single per-IP
  registration bucket. Raise `--register-rate-limit`, or turn rate limiting off
  for that deployment.
- **Token brute force.** The per-IP limiter runs before the token check, so it
  also throttles invalid tokens. Pair a low `--register-rate-limit` with a low
  `--register-rate-limit-burst` to leave no free instant allowance. The per-IP
  key is the address the server sees, honouring `X-Forwarded-For` behind a
  trusted proxy, so treat it as a speed bump. The registration token is the
  access control.

## Groups and labels

A node carries two independent ways to select it:

- A **group**, which is a single named membership such as `production` or
  `edge-site-2`. A node belongs to one group at a time, and the install script
  can set it at registration with `AURORABOOT_GROUP`.
- **Labels**, which are free-form key/value pairs, like Kubernetes labels. A
  node can carry any number of them.

Both are set from the UI or the API (`PUT /api/v1/nodes/{nodeID}/group` and
`PUT /api/v1/nodes/{nodeID}/labels`), and both are selectors when you send a
command. A bulk command takes a selector with a group ID, a set of labels, or
an explicit list of node IDs.

## Remote commands

| Command | What it does | When it takes effect |
|---|---|---|
| `upgrade` | Upgrades the active partition to a new image or artifact | The node reboots into the new image |
| `upgrade-recovery` | Replaces the recovery partition. The active partition is untouched | Immediately, no reboot |
| `apply-cloud-config` | Writes a cloud-config to the OEM partition (`/oem`) | On the **next boot** |
| `reboot` | Restarts the node after a short delay | Immediately |
| `reset` | Factory reset: wipes the state partitions and re-runs first-boot provisioning | The node reboots into the reset entry, and reports the outcome when it registers again |
| `exec` | Runs a shell command on the node and captures the output | Immediately |
| `extension` | Installs, enables or removes a system extension on the node | Immediately |

The node also answers `unregister`, which stops its phone-home service and
removes its files. The UI sends it when you delete a node.

A command is queued, not pushed. The node picks it up on its next poll, or over
its WebSocket connection when it is online, and reports back. Each command moves
through `Pending`, `Delivered`, `Running` and then `Completed` or `Failed`. A
command that is never collected ends as `Expired`.

Send a command to one node, to a group, or to a selection:

```bash
# one node
curl -X POST https://auroraboot.example.com/api/v1/nodes/<nodeID>/commands \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"command":"upgrade","args":{"version":"v3.5.0"}}'

# a whole group
curl -X POST https://auroraboot.example.com/api/v1/groups/<groupID>/commands \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"command":"upgrade-recovery"}'

# a selection by label
curl -X POST https://auroraboot.example.com/api/v1/nodes/commands \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"selector":{"labels":{"role":"worker"}},"command":"reboot"}'
```

## Security

### Authentication

The API has three identities, and they do not overlap:

| Identity | Credential | Can reach |
|---|---|---|
| Admin (the UI, the API, the Cluster API provider) | The admin password, as `Authorization: Bearer <password>` | Everything |
| A registering node | The registration token | `POST /api/v1/nodes/register` only |
| A registered node | Its own API key, issued at registration | Its own heartbeat, its own command queue, and the container image of an artifact it was told to install |

A node key is bound to the node that owns it: the server rejects a request
whose path names a different node, so one registered node cannot act on
another. Raw build files (ISO, UKI, raw disk, netboot) are admin-only.

Serve the fleet server over TLS. The admin password and the registration token
are bearer secrets, and the node API keys travel the same way.

### Restrict what a node will accept

**`exec` runs arbitrary shell commands as root on the node.** Whoever holds the
admin password owns every node that accepts `exec`. `reset` wipes persistent
data, and `apply-cloud-config` can rewrite the node's configuration.

The control is on the node, not on the server. Every artifact the builder
produces bakes an explicit `allowed_commands` list into its cloud-config, and
the node refuses anything that is not on it. The default is the safe set:

```yaml
#cloud-config
phonehome:
  url: "https://auroraboot.example.com"
  registration_token: "<token>"
  allowed_commands:
    - upgrade
    - upgrade-recovery
    - reboot
    - unregister
```

`exec`, `reset`, `apply-cloud-config` and `extension` are off unless you tick
them in the Artifact Builder, or pass them through
`AURORABOOT_ALLOWED_COMMANDS` when you run the install script. Enable them only
on fleets that need them, and treat a fleet that accepts `exec` as a fleet whose
root is the admin password.

An empty `allowed_commands` list is valid and means the node accepts no
commands at all. It has to be configured from the AuroraBoot UI: the install
script falls back to the safe defaults when the variable is empty.

## How it relates to the rest of Kairos

- **[kairos-operator](/operator-docs/)** manages nodes that are already part of a
  Kubernetes cluster, from inside that cluster, through `NodeOp` and
  `NodeOpUpgrade` custom resources. The fleet server manages nodes from outside,
  over HTTP, whether or not they run Kubernetes. The operator is also an
  optional build backend for the fleet server, with `--builder=operator`, which
  makes it create `OSArtifact` resources instead of building in-process.
- **The Cluster API provider** talks to the fleet server as an admin client to
  provision machines, which is why admin traffic is exempt from the node rate
  limits.

## API reference

The REST API mirrors the UI one to one. A running instance serves:

- Swagger UI at `/api/docs`
- The OpenAPI document at `/api/v1/openapi.json` and `/api/v1/openapi.yaml`

There is also a Go client in
[`pkg/client`](https://github.com/kairos-io/AuroraBoot/tree/main/pkg/client).
