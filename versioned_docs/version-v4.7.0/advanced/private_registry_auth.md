---
title: "Private registries authentication"
sidebar_label: "Private registries authentication"
sidebar_position: 2
date: 2023-08-08
---

As the source for install or upgrade can be an OCI image and sometimes those are behind a private container registry, Kairos
implements the default basic authentication used by docker for private registries.

To install/upgrade with a container image behind a registry with authentication, Kairos reads the following files in order to find about registry auth. You can also pass credentials for a single install or upgrade in cloud-config with the `registry-auth` option, described [below](#explicit-credentials-in-cloud-config):

- ${XDG_CONFIG_HOME}/.docker/config.json
- If set, DOCKER_CONFIG environment variable which points to a directory [as per the docs](https://docs.docker.com/reference/cli/docker/#environment-variables).
- ${XDG_RUNTIME_DIR}/containers/auth.json for podman

:::info Note
If you are using `sudo` to perform the upgrade, you have a couple of options:
- You can create the file `/root/.docker/config.json` with your credentials.
- You can use `sudo --preserve-env` to give `sudo` access to the relevant environment variables.
:::
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

## Explicit credentials in cloud-config

Instead of relying on the host's Docker or Podman files, you can set `registry-auth` under `install` for installs or under `upgrade` for upgrades:

```yaml
#cloud-config
install:
  source: "oci:registry.example.com/kairos/system:version"
  registry-auth:
    username: "REGISTRY_USERNAME"
    password: "REGISTRY_PASSWORD"

upgrade:
  system:
    source: "oci:registry.example.com/kairos/system:next-version"
  registry-auth:
    username: "REGISTRY_USERNAME"
    password: "REGISTRY_PASSWORD"
```

Use one of these forms per operation:

- `username` and `password`
- `auth`, a base64 encoded `username:password`
- `identity-token`
- `registry-token`

Kairos does not run a login command or create a credential file for these values. Keys that contain `auth` directly under `install` or `upgrade` are rejected, so use `registry-auth`.

The credentials apply only to the registry of that operation's source image. Pulls from other registries use the default keychain. Each operation takes one set of credentials, so use the keychain files if different registries need different logins.

If the explicit credentials fail, the operation fails. Kairos does not fall back to the host keychain. To use the default keychain behavior, set `registry-auth: {}` or `registry-auth: null`, or leave the option out.

:::caution
Cloud-config can be copied to the installed system. Treat `username`, `password`, `auth`, and the tokens as plaintext credentials. Base64 encoding does not encrypt the value, and this option does not add encrypted credential storage.
:::

### Credentials from a file

To keep the secret out of cloud-config, set `file` under `registry-auth` with the path to a YAML file:

```yaml
install:
  registry-auth:
    file: "/run/secrets/registry-auth.yaml"

upgrade:
  registry-auth:
    file: "/run/secrets/registry-auth.yaml"
```

The file holds one YAML object with the same lowercase fields as above:

```yaml
username: "REGISTRY_USERNAME"
password: "REGISTRY_PASSWORD"
```

Keep these rules in mind:

- Use `file` on its own. Other fields next to it are rejected.
- The file must exist and be readable before install or upgrade starts. The `before-install` and `before-upgrade` hooks run too late to create it.
- Use restricted permissions such as `0600`.
- Only the path is kept in cloud-config. The file is not copied to the installed system, so supply it again for later upgrades if it was temporary.
- A missing, unreadable, empty, or invalid file fails the operation. It does not fall back to the keychain.

### Insecure registries with explicit credentials

For a registry with a self-signed certificate, you can combine the credentials with `allow-insecure-registries` in the same operation block:

```yaml
upgrade:
  allow-insecure-registries: true
  registry-auth:
    username: "REGISTRY_USERNAME"
    password: "REGISTRY_PASSWORD"
```

This also allows plain HTTP and turns off certificate verification. Keep the default secure setting when the registry has a trusted certificate.

## Insecure registries

The source for an install or upgrade can be an OCI image. If the registry is served over plain HTTP, or presents an untrusted or self-signed TLS certificate, pass the `--allow-insecure-registries` flag to `kairos-agent`:

```bash
# Upgrade from an image on a plain-HTTP or self-signed-cert registry
kairos-agent upgrade --source oci:my-registry.internal:5000/kairos/ubuntu:24.04 --allow-insecure-registries

# Install from such a registry
kairos-agent install --allow-insecure-registries
```

You can also set it in the cloud config, under `install` for installs and under `upgrade` for upgrades:

```yaml
#cloud-config
install:
  allow-insecure-registries: true
upgrade:
  allow-insecure-registries: true
```

:::caution
Disabling TLS verification removes protection against man-in-the-middle attacks. Use it only in controlled environments (such as a local registry you operate), not against public registries.
:::
