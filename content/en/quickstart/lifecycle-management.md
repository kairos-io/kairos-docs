---
title: "Lifecycle Management"
linkTitle: "Lifecycle Management"
versionBanner: "false"
weight: 2
draft: true
description: |
---

If you followed the [quickstart]({{< ref "index.md" >}}), you can use that system to upgrade to the new image. Make sure the VM is running, then SSH into it:

```bash
ssh kairos@IP
```

Run an upgrade using your image:

```bash
sudo kairos-agent upgrade --source oci:ttl.sh/my-hadron:0.2.0
```

Reboot the system:

```bash
sudo reboot
```

Once the system is back up, SSH in again:

```bash
ssh kairos@IP
```

Validate that the new version is running:

```bash
cat /etc/kairos-release | grep KAIROS_VERSION
```

You should see the version you assigned during the build, for example:

```
KAIROS_VERSION="v0.2.0"
```

Finally, check resource usage with `bottom`:

```bash
btm
```

For example, you might see something like `0.9GiB/1.9GiB`.