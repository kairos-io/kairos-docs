---
title: "Installing system-upgrade-controller (Deprecated)"
sidebar_label: "System Upgrade Controller (Deprecated)"
sidebar_position: 4
date: 2024-10-02
description: Install the system-upgrade-controller (deprecated - use Kairos operator instead)
---

:::warning Deprecated
The system-upgrade-controller approach is deprecated. We recommend using the [Kairos operator](/docs/operator/) instead, which provides a more integrated and Kairos-specific way to manage upgrades and operations.
:::
To upgrade Kairos with Kubernetes using the legacy approach, it is necessary to have [system-upgrade-controller](https://github.com/rancher/system-upgrade-controller) deployed on the target cluster.

[The upstream documentation](https://github.com/rancher/system-upgrade-controller#deploying) on how to install the system-upgrade-controller, is this command:

```
kubectl apply -k github.com/rancher/system-upgrade-controller
```

This command requires the `git` command to be available in order to clone the remote repository. Kairos images, generally, don't include git. You will need to run this command from a machine which has `git` available and access to the cluster with a valid KUBECONFIG file.

Alternatively, from withing the Kairos node, you can deploy the following `Job` which will clone the system-upgrade controller repository to the `/home/kairos` directory:

```
apiVersion: batch/v1
kind: Job
metadata:
  name: git
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: git
          image: alpine/git
          command: ["git", "clone", "--branch", "v0.14.1", "https://github.com/rancher/system-upgrade-controller", "/homedir/system-upgrade-controller"]
          volumeMounts:
            - name: homedir
              mountPath: /homedir
      volumes:
        - name: homedir
          hostPath:
            path: /home/kairos
            type: Directory
```

(make sure you checkout the desired branch/release)

Then, from the `/home/kairos` directory, you can run this command to deploy the system-upgrade-controller:

```
kubectl apply -k system-upgrade-controller
```
