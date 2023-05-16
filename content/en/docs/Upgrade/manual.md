---
title: "Manual"
linkTitle: "Manual"
weight: 2
date: 2022-11-13
description: >
---

Upgrades can be run manually from the terminal.

Kairos images are released on [quay.io](https://quay.io/organization/kairos).

## List available versions

To see all the available versions:

```bash
$ sudo kairos-agent upgrade list-releases
v0.57.0
v0.57.0-rc2
v0.57.0-rc1
v0.57.0-alpha2
v0.57.0-alpha1
```

## Upgrade

To upgrade to the latest available version, run from a shell of a cluster node the following:

```bash
sudo kairos-agent upgrade
```

To specify a version, run:

```bash
sudo kairos-agent upgrade <version>
```

Use `--force` to force upgrading to avoid checking versions.

To specify a specific image, use the `--image` flag:

```bash
sudo kairos-agent upgrade --image <image>
```


To upgrade with a container image behind a registry with authentication, the upgrade command reads the following files in order to find about registry auth:

  - ${XDG_CONFIG_HOME}/.docker/config.json
  - If set, DOCKER_CONFIG environment variable which points to a file.
  - ${XDG_RUNTIME_DIR}/containers/auth.json for podman


See the [login docs for docker](https://docs.docker.com/engine/reference/commandline/login/) or the [login docs for podman](https://docs.podman.io/en/latest/markdown/podman-login.1.html) for more information.

You can also just generate that file yourself with the proper auth parameters like so:

```json
{
	"auths": {
		"registry.example.com": {
			"auth": "a2Fpcm9zOmh1bnRlcjIK"
		}
	}
}
```

The auths map has an entry per registry, and the auth field contains your username and password encoded as HTTP 'Basic' Auth.

NOTE: This means that your credentials are stored in plaintext. Have a look at the docker docs for the [credentials-store](https://docs.docker.com/engine/reference/commandline/login/#credentials-store)