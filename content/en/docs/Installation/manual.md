---
title: "Manual installation"
linkTitle: "Manual installation"
weight: 2
date: 2022-11-13
description: Install Kairos manually
---

{{% alert title="Note" %}}

After the installation, the password login is disabled, users, and SSH keys to log in must be configured via cloud-init.

{{% /alert %}}


## Cloud Configuration

Kairos uses yip a subset of cloud-init to configure a node. Here's a simple example:

```yaml
#cloud-config

# Define the user accounts on the node.
users:
- name: "kairos"                       # The username for the user.
  passwd: "kairos"                      # The password for the user.
  ssh_authorized_keys:                  # A list of SSH keys to add to the user's authorized keys.
  - github:mudler                       # A key from the user's GitHub account.
  - "ssh-rsa AAA..."                    # A raw SSH key.

# Enable K3s on the node.
k3s:
  enabled: true                         # Set to true to enable K3s.
```

What do these settings do?

- The `#cloud-config` at the top is not a comment. Make sure to start your configuration file with it.
- `users`: This block defines the user accounts on the node. In this example, it creates a user named `kairos` with the password `kairos` and adds two SSH keys to the user's authorized keys.
- `k3s`: This block enables K3s on the node.

[Check out the full configuration reference]({{< relref "../reference/configuration" >}}).

Save this file as config.yaml and pass it to the kairos agent during the installation process.

{{% alert title="Warning" color="warning" %}}
The command is disruptive and will erase any content on the drive.
{{% /alert %}}

```bash
sudo kairos-agent manual-install --device "auto" config.yaml
```

This will configure the node as a single-node Kubernetes cluster and set the default password and SSH keys as specified in the configuration file.
