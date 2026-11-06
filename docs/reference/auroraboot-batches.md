---
title: "AuroraBoot batches"
sidebar_label: "AuroraBoot batches"
sidebar_position: 1.5
description: How AuroraBoot runs a command on many nodes in rolling batches.
---

When you send a command from AuroraBoot to a group, to the nodes that match a label, or to several nodes picked on the Nodes page, AuroraBoot runs it as a batch. By default a batch sends the command to every online node at once, so stopping at the first failure can only cancel the nodes that have not received it yet. To roll a command out gradually, set the number of nodes at a time. AuroraBoot then starts that many nodes, starts the next one each time a node finishes, and by default starts no more after the first failure. With one node at a time, a bad artifact reaches only the first node it fails on. Each batch keeps a record of what happened on every node, so you can see later why it stopped.

This page describes batches in AuroraBoot releases after v0.29.0. It assumes AuroraBoot is running as a server (`auroraboot web`, or the Docker Compose setup from the AuroraBoot repository) and that your nodes are registered with it.

## Rollout settings

The command dialog shows a **Rollout** section when a command goes to more than one node. The same settings are fields of the API request.

| In the dialog | API field | Default | What it does |
|---|---|---|---|
| Nodes at a time | `concurrency` | empty or `0`: every node at once | How many nodes run the command at the same time. The next node starts when one finishes. |
| Stop on the first failure | `stopOnFailure` | on | After a node fails, the nodes that have not received the command are canceled. Nodes already running it finish. |
| Wait for a node to come back | `rebootTimeoutSeconds` | 10 minutes (`600`) | For `upgrade`, `reset` and `reboot`: how long a node may take to come back after its reboot. A node that has not come back by then counts as failed. |

The dialog shows the timeout only for commands that reboot the node. It also shows it when the command goes to a single node, because a command sent to a group with one node is still a batch.

## When a node counts as finished

For a command that reboots the node, the agent reports success as soon as it has scheduled the reboot. That says nothing about whether the new system boots, so AuroraBoot waits for the node to come back before it counts the node as done and starts the next one.

| Command | Done | Failed |
|---|---|---|
| `upgrade` | The node comes back on the active system. | The command reports a failure, the node comes back on the passive or recovery system, or it does not come back in time. |
| `reset` | The node comes back on the active system after the reset. | Same as `upgrade`. |
| `reboot` | The node comes back on any boot entry other than passive or recovery. | Same as `upgrade`. A plain reboot boots the active system, so a node that comes back on passive or recovery could not boot it. |
| `exec`, `apply-cloud-config`, `extension`, `upgrade-recovery` | The command reports success. | The command reports a failure, or the node stops sending heartbeats before it reports. |

A node comes back when it sends a heartbeat from a boot that started after the reboot, or when it registers again. A reset reboots twice, first into the reset and then into the active system, and the timeout applies to each of the two reboots.

AuroraBoot does not wait for reboots it did not start. If an `exec` script reboots the node, the batch counts the node as done when the script reports success.

## Offline nodes and nodes that stop responding

AuroraBoot does not wait for a node that is offline when the batch reaches it. It starts the next online node instead and tries the offline one again each time a slot frees up. When only offline nodes are left to start and no other node is still running, they are marked `skipped`. A skipped node is not a failure and does not stop the batch.

A node that received its command but then goes offline, or sends no heartbeat for two minutes, is marked `timed_out` once the batch timeout has passed since it started. A node that keeps sending heartbeats while it runs a long `exec` keeps its place until it reports. Stopping the batch does not release it, because the node already has its command.

## Node states

Each node in a batch is in one of these states:

| State | Meaning |
|---|---|
| `waiting` | The node has not started yet. It has no command until its turn comes. |
| `running` | The node received its command, or will at its next connection. |
| `rebooting` | The command succeeded and AuroraBoot is waiting for the node to come back. |
| `done` | The node finished successfully. |
| `failed` | The command failed, or the node came back on the passive or recovery system. |
| `timed_out` | The node did not come back in time, or stopped sending heartbeats. |
| `skipped` | The node was offline when the batch reached it. |
| `canceled` | The batch stopped before the node started, or the node or its command was deleted. |

The last five are final. A final state does not change, even if the node does something later. For example, a node that timed out and comes back an hour later stays `timed_out` in the batch. When that node is the one that stopped the batch, the banner on the batch page notes when it came back.

A batch that nobody stops stays `running` until every node is in a final state. It then ends as `completed` when no node failed, or as `failed` when nodes failed with stop on failure turned off.

A batch becomes `stopped` at the moment a failure or a person stops it, even while nodes that already had their command are still `running` or `rebooting`. Those nodes settle later and the phase stays `stopped`. The batch's finish time (`finishedAt` in the API) is set only when every node is in a final state, so check that field, not the phase, to know whether all work on the nodes is over.

## Following, stopping and repeating a batch

After you send a command to several nodes, the UI opens the new batch. The **Batches** page in the sidebar lists every batch, newest first. The page of a group and the page of a node list their recent batches.

The batch page shows the command and its arguments, the settings, the number of nodes in each state, and one row per node with its state and a message such as "did not come back within 10 minutes". When the batch stopped, a banner says which node stopped it and why.

**Stop batch** stops a running batch. It works like a stop on failure: nodes that have not received their command are canceled, and nodes already running it finish.

A stopped batch cannot be resumed. When a batch is no longer running and has nodes that ended `failed`, `timed_out`, `skipped` or `canceled`, the batch page offers **Start a new batch for the N remaining nodes**. This opens the command dialog with the same command, arguments and settings, and lets you leave out nodes, such as the one that failed.

A node can take part in only one batch at a time. While a node is waiting, running or rebooting in a batch, AuroraBoot rejects a new batch that includes it, and it rejects an `upgrade`, `reset` or `reboot` sent to that node on its own. This holds for a stopped batch too, until the nodes that were already running finish.

## API

The examples use the admin password as a bearer token. With the Docker Compose setup, read it with `docker compose exec auroraboot cat /data/secrets/admin-password`.

Upgrade every node of a group to an artifact built by AuroraBoot, one node at a time:

```bash
curl -X POST "$AURORABOOT_URL/api/v1/groups/$GROUP_ID/commands" \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
        "command": "upgrade",
        "args": {"source": "artifact:'"$ARTIFACT_ID"'"},
        "concurrency": 1,
        "rebootTimeoutSeconds": 900
      }'
```

Send a command to nodes picked by label or by ID with `POST /api/v1/nodes/commands`. The `selector` takes `groupID`, `labels` or `nodeIDs`:

```bash
curl -X POST "$AURORABOOT_URL/api/v1/nodes/commands" \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
        "selector": {"labels": {"site": "store-12"}},
        "command": "reboot",
        "concurrency": 2
      }'
```

Both endpoints return the batch record. They answer `400` when no node matches or a setting is negative, and `409` with the IDs of the busy nodes in `nodeIDs` when a node is still taking part in another batch.

To follow and stop batches:

| Request | What it does |
|---|---|
| `GET /api/v1/batches` | Lists batches, newest first. Filter with `groupID` or `nodeID`, and page with `limit` (default 50, at most 200) and `offset`. |
| `GET /api/v1/batches/{id}` | Returns one batch with a row per node. |
| `POST /api/v1/batches/{id}/stop` | Stops a running batch. |

The Go client in `github.com/kairos-io/AuroraBoot/pkg/client` has the same calls. AuroraBoot serves the full API reference at `/api/v1/openapi.yaml` and `/api/v1/openapi.json`.

### Changes for API clients of v0.29.0 and earlier

- The group and bulk command endpoints return one batch record. They used to return an array of commands.
- `failFast` is gone. A request that still sends it has the field ignored and gets stop on failure, which is on by default. Send `"stopOnFailure": false` to keep going after a failure.
- `GET /api/v1/commands/batches/{batchID}` is gone. Use `GET /api/v1/batches/{id}`.
- Batches created before the upgrade are not shown.

## Recommended settings

### Artifact downloads in a batch

When a node upgrades to an artifact built by AuroraBoot, the agent on the node downloads the image from AuroraBoot. If AuroraBoot cannot be reached or answers with a server error, the agent retries a few times before it reports a failure. With the defaults it gives up after about 35 seconds. A download that still fails fails the command, and with stop on failure that stops the batch.

If AuroraBoot can restart while a batch runs, let the nodes wait longer than a restart. Set the retries in the `phonehome` section of the node's cloud-config, for example in the cloud-config of the artifact:

```yaml
#cloud-config
phonehome:
  artifact_download_retries: 6
  artifact_download_retry_interval: 10s
```

The wait doubles after each retry, up to one minute, so this example waits about four minutes in total.

### Local Docker Compose

In a local setup, one machine runs AuroraBoot and serves the image to every node, and the nodes are often virtual machines on the same machine.

- Use 1 or 2 nodes at a time. AuroraBoot builds the image of an artifact once and serves the same file to every node, but parallel downloads still share the disk and network of one machine.
- Keep stop on failure on, so one broken artifact does not reach every node.
- If your virtual machines boot slowly while others are busy, raise the come-back timeout instead of treating slow nodes as failed.
- The default download retries are enough. Raise them if you restart AuroraBoot while nodes are upgrading, so the wait covers the restart.

### Production

- Upgrade one node at a time with a new artifact, so a bad image stops at the first node. After it has worked on a few nodes, use larger batches for the rest of the fleet.
- Keep stop on failure on for `upgrade`, `reset` and `reboot`. Turn it off only for commands where some failures are expected and should not hold back the rest, such as an `exec` that collects diagnostics.
- Set the come-back timeout longer than your slowest node takes to reboot and boot the new image. Bare metal machines with a long firmware start may need 20 or 30 minutes instead of 10.
- If AuroraBoot can restart during a rollout, for example during a rolling update in Kubernetes, raise the download retries as shown above, so the total wait is longer than a restart.
