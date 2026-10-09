---
title: "provider CLI (formerly kairosctl)"
sidebar_label: "provider CLI"
description: Learn how to use the Kairos provider CLI to register nodes, generate tokens, and manage VPN connections securely and efficiently.
sidebar_position: 3
date: 2022-11-13
---

:::warning `kairosctl` has been replaced
The separate `kairosctl` binary no longer exists. [kairos-io/kairos#4393](https://github.com/kairos-io/kairos/pull/4393) absorbed it into the provider, which is a strict superset of the commands it had. The last release that shipped a `kairosctl-*` asset was `provider-kairos` v2.17.0, in a repository that is now archived.

The same commands are now reached in two ways:

- on a node running a standard image, through the multi-call `kairos` binary: `kairos provider <command>`
- from a workstation, by running the `provider-kairos` binary straight out of the release tarball: `./provider-kairos <command>`
:::

The `provider-kairos` binary is published with every Kairos release. Use it from an external machine to generate network tokens and pair nodes on first boot.

```bash
curl -L https://github.com/kairos-io/kairos/releases/download/{{< KairosVersion >}}/provider-kairos-{{< KairosVersion >}}-linux-amd64.tar.gz -o - | tar -xvzf - -C .
```

`amd64`, `arm64` and `riscv64` Linux builds are published, plus a `-fips` variant of each. There is no macOS or Windows build.

```bash
# optionally, install the CLI locally
mv provider-kairos /usr/local/bin/provider-kairos
chmod +x /usr/local/bin/provider-kairos
```

On a node, the provider is installed at `/system/providers/agent-provider-kairos`, which is not on `PATH`. Reach it through the dispatcher instead:

```
kairos provider --help
NAME:
   kairos provider - kairos CLI to bootstrap, upgrade, connect and manage a kairos network

USAGE:
   kairos provider [global options] command [command options]

VERSION:
   {{< KairosVersion >}}

COMMANDS:
   recovery-ssh-server  Starts SSH recovery service
   register             Registers and bootstraps a node
   bridge               Connect to a kairos VPN network
   get-kubeconfig       Return a deployment kubeconfig
   role                 Set or list node roles
   create-config, c     Creates a pristine config file
   generate-token, g    Creates a new token
   validate             Validates a cloud config file
   version
   help, h              Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h     show help
   --version, -v  print the version
```

On a core image, or anywhere else with no provider installed, `kairos provider` prints an error saying so.

The examples below use the workstation form. Replace `./provider-kairos` with `kairos provider` to run them on a node.

## create-config

Generates a new Kairos configuration file which can be used as cloud-init, with a new unique EdgeVPN network token:

```
$ ./provider-kairos create-config
kairos:
  network_token: b3RwOgogIGRodDoKICAgIGludGVydmFsOiA5MjIzMzcyMDM2ODU0Nzc1ODA3CiAgICBrZXk6IEVCMzJJMlNXTjJCNFBHNEtCWTNBUVBBS0FWRTY0Q0VLVUlDTktTUFVWVU5BWTM0QklEQ0EKICAgIGxlbmd0aDogMzIKICBjcnlwdG86CiAgICBpbnRlcnZhbDogOTIyMzM3MjAzNjg1NDc3NTgwNwogICAga2V5OiBDMk1RRk5DWEFVRElPWjVHM1pZUUIzVEVHTzVXVEdQR1pZSEVQQkY3SFEyVUROUlZCTkxRCiAgICBsZW5ndGg6IDMyCnJvb206IGp6Q29kQVVOWUZSUklQU3JISmx4d1BVUnVxTGJQQnh4CnJlbmRlenZvdXM6IG5NckRCbllyVVBMdnFPV0Z2dWZvTktXek1adEJIRmpzCm1kbnM6IGpQUUhIbVZza2x6V29xbWNkeVlnbVhMSVFjTE1HUFN6Cm1heF9tZXNzYWdlX3NpemU6IDIwOTcxNTIwCg==
  offline: false
  reboot: false
  device: ""
  poweroff: false
```

Now you can use this in your configuration file to create new Kairos nodes:

```yaml
kairos:
  network_token: b3RwOgogIGRodDoKICAgIGludGVydmFsOiA5MjIzMzcyMDM2ODU0Nzc1ODA3CiAgICBrZXk6IEVCMzJJMlNXTjJCNFBHNEtCWTNBUVBBS0FWRTY0Q0VLVUlDTktTUFVWVU5BWTM0QklEQ0EKICAgIGxlbmd0aDogMzIKICBjcnlwdG86CiAgICBpbnRlcnZhbDogOTIyMzM3MjAzNjg1NDc3NTgwNwogICAga2V5OiBDMk1RRk5DWEFVRElPWjVHM1pZUUIzVEVHTzVXVEdQR1pZSEVQQkY3SFEyVUROUlZCTkxRCiAgICBsZW5ndGg6IDMyCnJvb206IGp6Q29kQVVOWUZSUklQU3JISmx4d1BVUnVxTGJQQnh4CnJlbmRlenZvdXM6IG5NckRCbllyVVBMdnFPV0Z2dWZvTktXek1adEJIRmpzCm1kbnM6IGpQUUhIbVZza2x6V29xbWNkeVlnbVhMSVFjTE1HUFN6Cm1heF9tZXNzYWdlX3NpemU6IDIwOTcxNTIwCg==
  offline: false
  reboot: false
  device: ""
  poweroff: false

stages:
  network:
    - name: "Setup users"
      authorized_keys:
        kairos:
          - github:yourhandle!
```

## generate-token

Generates a new EdgeVPN network token which can be used in a configuration file:

```
$ ./provider-kairos generate-token
b3RwOgogIGRodDoKICAgIGludGVydmFsOiA5MjIzMzcyMDM2ODU0Nzc1ODA3CiAgICBrZXk6IFhMMjRYUk1MTlFOQ1pJQTU0SVFLQ1laMk83SENQWEFBU1ZKN0tZSTQ3MzVaUkpKSktRSEEKICAgIGxlbmd0aDogMzIKICBjcnlwdG86CiAgICBpbnRlcnZhbDogOTIyMzM3MjAzNjg1NDc3NTgwNwogICAga2V5OiBMR1dMWFBTUllaU0ZERDdOT0pBNzdKV0ZWQjRHVkZBMjJIWlZPWU1VT0lNSFVYNFZXUURRCiAgICBsZW5ndGg6IDMyCnJvb206IFRtcUt5VnFHQ1ZZam9TRm9CTEVNRGVEdmJzelBkVEdoCnJlbmRlenZvdXM6IGttb3J4Q21sY2NjVVppWmdkSW5xTERvTGJtS3ZGdm9mCm1kbnM6IEZkWVdQc2R4aHdvWHZlb0VzSXNnVHRXbEJUbE9IVHJmCm1heF9tZXNzYWdlX3NpemU6IDIwOTcxNTIwCg==
```

And now:

```yaml
kairos:
  network_token: b3RwOgogIGRodDoKICAgIGludGVydmFsOiA5MjIzMzcyMDM2ODU0Nzc1ODA3CiAgICBrZXk6IFhMMjRYUk1MTlFOQ1pJQTU0SVFLQ1laMk83SENQWEFBU1ZKN0tZSTQ3MzVaUkpKSktRSEEKICAgIGxlbmd0aDogMzIKICBjcnlwdG86CiAgICBpbnRlcnZhbDogOTIyMzM3MjAzNjg1NDc3NTgwNwogICAga2V5OiBMR1dMWFBTUllaU0ZERDdOT0pBNzdKV0ZWQjRHVkZBMjJIWlZPWU1VT0lNSFVYNFZXUURRCiAgICBsZW5ndGg6IDMyCnJvb206IFRtcUt5VnFHQ1ZZam9TRm9CTEVNRGVEdmJzelBkVEdoCnJlbmRlenZvdXM6IGttb3J4Q21sY2NjVVppWmdkSW5xTERvTGJtS3ZGdm9mCm1kbnM6IEZkWVdQc2R4aHdvWHZlb0VzSXNnVHRXbEJUbE9IVHJmCm1heF9tZXNzYWdlX3NpemU6IDIwOTcxNTIwCg==
  offline: false
  reboot: false
  device: ""
  poweroff: false

stages:
  network:
    - name: "Setup users"
      authorized_keys:
        kairos:
          - github:yourhandle!
```

## rotate-token

Creates a new token and pushes it to the running network, so the nodes switch to it without a reinstall. Takes the same flags as `generate-token`.

## register

The `register` command can be used to register and drive installation of nodes via QR code with a `cloud-init` config file (with `--config`).

```
NAME:
    register -

USAGE:
    register [command options] [arguments...]

OPTIONS:
   --config value
   --device value
   --reboot
   --poweroff
   --log-level value
   --timeout value
```

When booting Kairos via ISO, the boot process ends up in displaying a QR code which can be parsed by `provider-kairos register` from another machine.

### Taking a screenshot

`register` by default takes a screenshot and tries to find a QR code in it:

```
./provider-kairos register
```

### Providing a QR code image/screenshot manually

It can be also be specified an image:

```
./provider-kairos register <file.png>
```

After the pairing is done, the node will start installation with the provided options.

A `--device` and a `--config` file are required in order to have a functional installation.

## bridge

Connect to the nodes in the VPN P2P network by creating a tun device on the host.

It needs a `--network-token`(`$NETWORK_TOKEN`) argument and exposes an API endpoint available at [localhost:8080](http://localhost:8080) to monitor the network status.

## get-kubeconfig

Returns the `kubeconfig` of the cluster. It talks to the network API, so run it either from a node or with `bridge` running in another terminal.

## role

Sets or lists node roles:

```
./provider-kairos role list
./provider-kairos role set <UUID> master
```

The UUID comes from `kairos agent uuid` on the target node, and a role must be set before that node joins the network.

## validate

The `validate` command can be used to validate a cloud config file.

```
NAME:
   kairos provider validate - Validates a cloud config file

USAGE:
   kairos provider validate [command options] [arguments...]

DESCRIPTION:

   The validate command expects a configuration file as its only argument. Local files and URLs are accepted.


OPTIONS:
   --help, -h  show help
```
