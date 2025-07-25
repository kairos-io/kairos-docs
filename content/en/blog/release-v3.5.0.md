---
title: "Kairos release v3.5.0"
date: 2025-07-25
linkTitle: "Kairos release v3.5.0"
description: "Kairos release v3.5.0"
author: Kairos Team ([GitHub](https://github.com/kairos-io))
---
<h1 align="center">
  <br>
     <img width="184" alt="kairos-white-column 5bc2fe34" src="https://user-images.githubusercontent.com/2420543/215073247-96988fd1-7fcf-4877-a28d-7c5802db43ab.png">
    <br>
<br>
</h1>

# Kairos 3.5.0: A Milestone for the Kairos Ecosystem

We're excited to announce the release of Kairos 3.5.0! This release represents a significant milestone for the broader Kairos ecosystem, marking the completion of several key features across multiple projects that work together to improve the overall Kairos experience.

## Meet the Kairos Operator

The biggest addition to the Kairos ecosystem is the **Kairos operator** - a standalone Kubernetes operator that provides a native way to manage upgrades and operations on Kairos nodes. While this operator can work with previous Kairos versions, 3.5.0 marks the point where we consider it mature enough to be the recommended approach for Kubernetes-based management.

The operator provides two custom resources:

- **NodeOp**: For generic operations on Kubernetes nodes (Kairos or not). It allows mounting the host's root filesystem to perform operations or run scripts.

- **NodeOpUpgrade**: A Kairos-specific custom resource for upgrading Kairos nodes. It automatically creates a NodeOp with the appropriate upgrade script and configuration.

This means you can now manage your Kairos nodes using familiar Kubernetes patterns. The operator automatically detects Kairos nodes and labels them with `kairos.io/managed: true`, making it easy to target Kairos nodes specifically in hybrid clusters.

To get started with the operator, simply deploy it to your cluster:

```bash
kubectl apply -k https://github.com/kairos-io/kairos-operator/config/default
```

Then trigger an upgrade by creating a NodeOpUpgrade resource:

```yaml
apiVersion: operator.kairos.io/v1alpha1
kind: NodeOpUpgrade
metadata:
  name: kairos-upgrade
  namespace: default
spec:
  image: quay.io/kairos/ubuntu:22.04-standard-amd64-generic-v3.5.0-k3s-v1.33.2-k3s1
  nodeSelector:
    matchLabels:
      kairos.io/managed: "true"
  concurrency: 1
  stopOnFailure: true
```

For more details on using the operator, check out our [Kairos Operator documentation](/docs/upgrade/kairos-operator/).

The Kairos operator opens up new possibilities for node management. You can now:

- Perform custom operations on nodes using NodeOp resources
- Control upgrade concurrency and failure handling
- Apply configuration changes after installation
- Reset nodes with custom configurations
- Handle trusted boot upgrades through Kubernetes

The operator provides fine-grained control over deployment strategies, allowing you to implement canary deployments, rolling updates, or bulk operations depending on your needs.

## Enhanced AuroraBoot Experience

Another significant milestone is the completion of the API-based workflow in [AuroraBoot](https://github.com/kairos-io/AuroraBoot), our tool for building bootable images. While AuroraBoot has long provided a WebUI for easy image building, the new API-based flow enables automation of these operations. This means you can now integrate image building into your CI/CD pipelines and infrastructure automation workflows.

The API workflow complements the existing WebUI, giving you both the ease of use for manual operations and the power of automation for production environments.

## Configuration Path Migration Reminder

While [the configuration path change](https://github.com/kairos-io/kairos/issues/2233) from `/etc/elemental/config.yaml` to `/etc/kairos/config.yaml` has been moved to v4.0.0, we want to remind users to start migrating their configurations now. This change will align our configuration paths with the Kairos branding and provide a cleaner, more consistent experience.

If you're using the old path, we recommend updating your configurations to use the new location (`/etc/kairos/config.yaml`) to prepare for deprecation. The old path will continue to work for now, but migrating early will ensure a smooth transition.

## What's Next

The completion of these ecosystem features represents a significant step toward more integrated and automated Kairos workflows. We're excited to see how the community uses these new capabilities to build more sophisticated deployment and management workflows.

We're already working on the next milestone - [Kairos v3.6.0](https://github.com/kairos-io/kairos/issues/2990). Check out the ticket to see what's coming next.

As always, we encourage you to try out the new features and share your feedback. Whether you're upgrading existing clusters, automating image builds, or deploying new ones, these tools should make your day-to-day operations smoother and more predictable.

For a complete list of changes in this release, visit the [v3.5.0 release page on GitHub](https://github.com/kairos-io/kairos/releases/tag/v3.5.0). For detailed upgrade instructions and examples, visit our [upgrade documentation](/docs/upgrade/). If you run into any issues or have questions, join the conversation in our [Slack](https://slack.cncf.io/#kairos) or [GitHub Discussions](https://github.com/kairos-io/kairos/discussions). If you want to participate in the development process, you can always join our [office hours](https://kairos.io/community/) - the calendar is available on our community page.

Happy upgrading! 