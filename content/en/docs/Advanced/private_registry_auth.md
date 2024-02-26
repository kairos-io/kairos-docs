---
title: "Private registries authentication"
linkTitle: "Private registries authentication"
weight: 2
date: 2023-08-08
---


As the source for install or upgrade can be an OCI image and sometimes those are behind a private repository, Kairos
implements the default basic authentication used by docker for private registries.

To install/upgrade with a container image behind a registry with authentication, Kairos reads the following files in order to find about registry auth:

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