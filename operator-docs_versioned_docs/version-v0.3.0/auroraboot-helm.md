---
title: "Installing AuroraBoot alongside the operator"
linkTitle: "AuroraBoot Helm chart"
weight: 2
date: 2026-07-30
description: Deploy the AuroraBoot web UI next to the Kairos operator using the official Helm chart
---

The AuroraBoot Helm chart installs the AuroraBoot web UI into the same cluster as the Kairos operator and wires the two together so artifact builds are delegated to the operator via `OSArtifact` custom resources. The chart is designed to be installed with a single required value: the hostname the UI will be reached at.

## What you get

- A `Deployment` running `auroraboot web --builder=operator`, so every build the UI kicks off becomes an `OSArtifact` on the cluster instead of running in the AuroraBoot pod itself.
- A `Service` (`ClusterIP` on port 80) plus an `Ingress` bound to the hostname you provide.
- A `ServiceAccount` and a namespaced `Role`/`RoleBinding` granting AuroraBoot access to `OSArtifact` CRs, the `Secret`s the operator consumes, and read access to the exporter `Pod`s and `Job`s it produces.
- A `PersistentVolumeClaim` mounted at `/var/lib/auroraboot` for the SQLite store, keys, generated secrets, and built artifacts.
- A `Secret` holding the node registration token. It is generated on first install and preserved across upgrades via `lookup`.
- A pod-template checksum annotation that rolls the deployment automatically when the registration token changes, so `helm upgrade --set registrationToken.value=...` is a one-command rotation.

Upload traffic between the operator's exporter pods and AuroraBoot is routed over the cluster-internal Service DNS, so it does not traverse the ingress.

## Prerequisites

- A Kubernetes cluster with `kubectl` and `helm` (v3.8+).
- The [Kairos operator](../installation/) installed and its `OSArtifact` CRD registered. This chart does not install the operator.
- An ingress controller in the cluster (nginx, traefik, etc.), unless you plan to reach the UI via `kubectl port-forward` only.
- Optional: `cert-manager` if you want the chart to request TLS certificates for you.

## Install

The chart lives in the [AuroraBoot repository](https://github.com/kairos-io/AuroraBoot) under `deploy/helm/auroraboot`. Point Helm at either the local path (for development) or the published OCI artifact (for releases).

```bash
git clone https://github.com/kairos-io/AuroraBoot.git
cd AuroraBoot

helm install ab deploy/helm/auroraboot \
  -n kairos-operator --create-namespace \
  --set host=auroraboot.example.com
```

Replace `auroraboot.example.com` with the hostname your users will type in the browser. DNS for that name must resolve to your ingress controller's external address (a LoadBalancer IP, MetalLB VIP, or a node port), not to the cluster API server IP.

Once released, the same command works against the OCI-published chart:

```bash
helm install ab oci://ghcr.io/kairos-io/charts/auroraboot \
  --version <version> \
  -n kairos-operator --create-namespace \
  --set host=auroraboot.example.com
```

## Common overrides

The chart's `values.yaml` documents every knob. The ones most commonly touched:

| Value | Default | Purpose |
| --- | --- | --- |
| `host` | `""` (required) | Hostname the UI is reached at. Also becomes the base of `--url` used in node cloud-configs. |
| `image.repository` | `quay.io/kairos/auroraboot` | Container image. Override to sideload a local image (e.g. into kind). |
| `image.tag` | `""` (falls back to `Chart.AppVersion`) | Pin a specific AuroraBoot release. |
| `ingress.className` | `""` (cluster default) | Set to `nginx`, `traefik`, etc. if your cluster has no default IngressClass. |
| `ingress.tls.enabled` | `false` | Adds a TLS block to the `Ingress`. When `true`, `--url` uses `https://`. |
| `ingress.tls.issuerName` | `""` | Sets `cert-manager.io/cluster-issuer` (or `cert-manager.io/issuer` when `issuerKind: Issuer`). |
| `ingress.tls.existingSecret` | `""` | Reference a pre-created TLS `Secret` instead of provisioning one via cert-manager. |
| `persistence.size` | `20Gi` | Size of the data PVC. |
| `persistence.storageClass` | `""` | Pin a StorageClass. Empty uses the cluster default. |
| `builder.namespace` | `""` (release namespace) | Where `OSArtifact` CRs are created. Set only if the operator lives in a different namespace. |
| `builder.uploadURL` | `""` (auto: Service DNS) | Cluster-internal URL exporter pods upload artifacts to. Auto-derived; only override in unusual topologies. |
| `registrationToken.value` | `""` (auto-generated) | Provide an explicit token or leave empty to have the chart generate and persist one. |

## Enabling TLS via cert-manager

If you have cert-manager installed, the chart can provision a certificate for you:

```bash
helm install ab deploy/helm/auroraboot \
  -n kairos-operator --create-namespace \
  --set host=auroraboot.example.com \
  --set ingress.tls.enabled=true \
  --set ingress.tls.issuerName=letsencrypt-prod
```

Assumes a `ClusterIssuer` named `letsencrypt-prod` exists. For a namespaced `Issuer`, add `--set ingress.tls.issuerKind=Issuer`.

If you already have a TLS `Secret` in the release namespace, reference it directly:

```bash
--set ingress.tls.enabled=true --set ingress.tls.existingSecret=auroraboot-tls
```

## Reaching the UI without an ingress controller

For a quick smoke test, disable the ingress and use `port-forward`:

```bash
helm install ab deploy/helm/auroraboot \
  -n kairos-operator --create-namespace \
  --set host=localhost \
  --set ingress.enabled=false

kubectl -n kairos-operator port-forward svc/ab-auroraboot 8080:80
```

Then open `http://localhost:8080`.

The URLs AuroraBoot embeds in cloud-configs still come from `--url`, which the chart derives from `host`. For a real deployment (where nodes actually phone home) you need a hostname reachable from those nodes; localhost/port-forward is only useful for eyeballing the UI.

## Kind quickstart

kind clusters do not ship with an ingress controller or a LoadBalancer implementation. Two approaches:

**Full ingress path** (matches production shape):

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - {containerPort: 80,  hostPort: 80,  protocol: TCP}
      - {containerPort: 443, hostPort: 443, protocol: TCP}
```

```bash
kind create cluster --name kairos --config kind-config.yaml

kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/deploy-ingress-nginx.yaml
kubectl wait -n ingress-nginx --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=90s

kubectl apply -k https://github.com/kairos-io/kairos-operator/config/default

helm install ab deploy/helm/auroraboot \
  -n kairos-operator --create-namespace \
  --set host=auroraboot.local \
  --set ingress.className=nginx
```

Add `127.0.0.1 auroraboot.local` to `/etc/hosts` and browse to `http://auroraboot.local`.

**Sideloading a locally built image** (for iterating on AuroraBoot itself):

```bash
# In the AuroraBoot checkout
make build-docker                    # produces auroraboot:local
kind load docker-image auroraboot:local --name kairos

helm upgrade ab deploy/helm/auroraboot -n kairos-operator \
  --reuse-values \
  --set image.repository=auroraboot \
  --set image.tag=local
```

The chart's default `pullPolicy: IfNotPresent` is what you want. kind uses the sideloaded image instead of pulling from a registry.

## Registration token lifecycle

The chart creates a `Secret` named `<release>-<chart>-registration` holding the token nodes present when they phone home to enroll.

Fetch the current token:

```bash
kubectl -n kairos-operator get secret ab-auroraboot-registration \
  -o jsonpath='{.data.token}' | base64 -d
```

Rotate it:

```bash
helm upgrade ab deploy/helm/auroraboot -n kairos-operator \
  --reuse-values \
  --set registrationToken.value="$(openssl rand -hex 32)"
```

The pod template annotation changes with the new token, which triggers a rolling restart automatically. Already-enrolled nodes are unaffected: they use their per-node API key, not the registration token. Only new enrollments need the new token.

You can also rotate via the AuroraBoot settings API at runtime; the resolver on the pod treats the env-supplied token as a seed rather than a hard override, so a runtime rotation survives pod restarts. On the next `helm upgrade` with a different `registrationToken.value`, the new seed wins and overwrites both the on-disk token and the seed marker.

## Upgrading

```bash
helm upgrade ab deploy/helm/auroraboot -n kairos-operator --reuse-values
```

`--reuse-values` preserves everything you set at install time so you only need to pass the values you want to change. When bumping the AuroraBoot version, override `image.tag`:

```bash
helm upgrade ab deploy/helm/auroraboot -n kairos-operator \
  --reuse-values --set image.tag=<new-version>
```

## Uninstalling

```bash
helm uninstall ab -n kairos-operator
```

The `PersistentVolumeClaim` intentionally survives so built artifacts and the SQLite store are not silently discarded. Reclaim it if you no longer need the data:

```bash
kubectl -n kairos-operator delete pvc ab-auroraboot
```

## Troubleshooting

**Ingress has no `ADDRESS`.** No ingress controller is running. Install one (nginx or traefik are common choices), or use `port-forward` as above.

**`flag provided but not defined: -builder`.** The container image predates the operator-builder work. Pull a recent `quay.io/kairos/auroraboot` tag, or if you sideloaded a locally built image, rebuild it from `main`.

**`ImagePullBackOff` on kind with a sideloaded image.** kind's containerd sometimes holds a stale layer for a re-used tag. Either bump the tag on each rebuild or delete the image from every node before reloading:

```bash
for node in $(kind get nodes --name kairos); do
  docker exec "$node" crictl rmi docker.io/library/auroraboot:local
done
kind load docker-image auroraboot:local --name kairos
kubectl -n kairos-operator rollout restart deployment/ab-auroraboot
```

**Nodes can hit the UI at `localhost:9000` but not at the LAN hostname.** `kubectl port-forward` binds to `127.0.0.1` by default. Restart it with `--address 0.0.0.0` or an explicit interface IP so it accepts connections from other machines on your network.
