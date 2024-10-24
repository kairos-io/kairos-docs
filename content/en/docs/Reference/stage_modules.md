---
title: "Stage modules"
linkTitle: "Stage modules"
weight: 3
date: 2024-09-19
---

For each stage in the cloud-init file, various modules are available that
implement different functionality each. This page describes what each one does
and how to use it.

The order in this document is also [the order in which they are executed](https://github.com/kairos-io/kairos-agent/blob/fbb64f2a826f3fcf9584ed65d59e5bd8eb0c26e8/pkg/cloudinit/cloudinit.go#L44).

### `dns`

A way to configure the `/etc/resolv.conf` file.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup dns"
      dns:
        nameservers:
          - 8.8.8.8
          - 1.1.1.1
        search:
          - foo.bar
        options:
          - ..
        path: "/etc/resolv.conf.bak"
```

### `downloads`

Download files to specified locations

```yaml
#cloud-config

stages:
  boot:
    - downloads:
        - path: /tmp/out
          url: "https://www...."
          permissions: 0700
          owner: 0
          group: 0
          timeout: 0
          owner_string: "root"
        - path: /tmp/out
          url: "https://www...."
          permissions: 0700
          owner: 0
          group: 0
          timeout: 0
          owner_string: "root"
```

### `git`

Pull git repositories, using golang native git (no need of git in the host).

```yaml
#cloud-config

stages:
  boot:
    - git:
        url: "git@gitlab.com:.....git"
        path: "/oem/cloud-config-files"
        branch: "main"
        auth:
          insecure: true
          private_key: |
            -----BEGIN RSA PRIVATE KEY-----
            -----END RSA PRIVATE KEY-----
```

### `ensure_entities`

A `user` or a `group` in the [entity](https://github.com/mudler/entities) format to be configured in the system

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup users"
      ensure_entities:
        -  path: /etc/passwd
           entity: |
             kind: "user"
             username: "foo"
             password: "x"
             uid: 0
             gid: 0
             info: "Foo!"
             homedir: "/home/foo"
             shell: "/bin/bash"
```

### `directories`

A list of directories to be created on disk. Runs before `files`.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup folders"
      directories:
        - path: "/etc/foo"
          permissions: 0600
          owner: 0
          group: 0
```

### `files`

A list of files to write to disk.

```yaml
#cloud-config
stages:
  boot:
    - files:
      - path: /tmp/bar
        encoding: "b64" # "base64", "gz", "gzip", "gz+base64", "gzip+base64", "gz+b64", "gzip+b64"
        content: |
                  #!/bin/sh
                  echo "test"
        permissions: 0777
        owner: 1000
        group: 100
        # or
        # owner_string: "user:group", or "user"
```

### `commands`

A list of arbitrary commands to run after file writes and directory creation.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup something"
      commands:
        - echo 1 > /bar
```

### `delete_entities`

A `user` or a `group` in the [entity](https://github.com/mudler/entities) format to be pruned from the system

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup users"
      delete_entities:
        -  path: /etc/passwd
           entity: |
             kind: "user"
             username: "foo"
             password: "x"
             uid: 0
             gid: 0
             info: "Foo!"
             homedir: "/home/foo"
             shell: "/bin/bash"
```

### `hostname`

A string representing the machine hostname. It sets it in the running system, updates `/etc/hostname` and adds the new hostname to `/etc/hosts`.
Templates can be used to allow dynamic configuration. For example in mass-install scenario it could be needed (and easier) to specify hostnames for multiple machines from a single cloud-init config file.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup hostname"
      hostname: "node-{{ trunc 4 .MachineID }}"
```

### `sysctl`

Kernel configuration. It sets `/proc/sys/<key>` accordingly, similarly to `sysctl`.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup exception trace"
      systctl:
        debug.exception-trace: "0"
```

### `users`

A map of users and user info to set. Passwords can also be encrypted.

The `users` parameter adds or modifies the specified list of users. Each user is an object which consists of the following fields. Each field is optional and of type string unless otherwise noted.
In case the user already exists, only the `password` and `ssh-authorized-keys` are evaluated. The rest of the fields are ignored.

- **name**: Required. Login name of user
- **gecos**: GECOS comment of user
- **passwd**: Hash of the password to use for this user. Unencrypted strings are supported too.
- **homedir**: User's home directory. Defaults to /home/*name*
- **no-create-home**: Boolean. Skip home directory creation.
- **primary-group**: Default group for the user. Defaults to a new group created named after the user.
- **groups**: Add user to these additional groups. Kairos creates an `admin` group by default which is also added to the sudoers file. Add a user to the `admin` group if you want them to have `sudo` access.
- **no-user-group**: Boolean. Skip default group creation.
- **ssh-authorized-keys**: List of public SSH keys to authorize for this user
- **system**: Create the user as a system user. No home directory will be created.
- **no-log-init**: Boolean. Skip initialization of lastlog and faillog databases.
- **shell**: User's login shell.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup users"
      users:
        bastion:
          passwd: "strongpassword"
          homedir: "/home/foo
```

### `authorized_keys`

A list of SSH authorized keys that should be added for each user.
SSH keys can be obtained from GitHub user accounts by using the format github:${USERNAME}, similarly for GitLab with gitlab:${USERNAME}.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup exception trace"
      authorized_keys:
        mudler:
          - "github:mudler"
          - "ssh-rsa: ..."
```

### `modules`

A list of kernel modules to load.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup users"
      modules:
        - nvidia
```

### `timesyncd`

Sets the `systemd-timesyncd` daemon file (`/etc/system/timesyncd.conf`) file accordingly. The documentation for `timesyncd` and all the options can be found [here](https://www.freedesktop.org/software/systemd/man/timesyncd.conf.html).

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup NTP"
      systemctl:
        enable:
          - systemd-timesyncd
      timesyncd:
        NTP: "0.pool.org foo.pool.org"
        FallbackNTP: "us.pool.ntp.org"
    - name: "Restart NTP service so it gets the new config"
      commands:
        - systemctl restart systemd-timesyncd
```

### `systemctl`

A list of systemd services to `enable`, `disable`, `mask` or `start`.

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup users"
      systemctl:
        enable:
          - systemd-timesyncd
          - cronie
        mask:
          - purge-kernels
        disable:
          - crond
        start:
          - cronie
```

### `environment_file`

A string to specify where to set the environment file

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup users"
      environment_file: "/home/user/.envrc"
      environment:
        FOO: "bar"
```

### `environment`

A map of variables to write in `/etc/environment`, or otherwise specified in `environment_file`

```yaml
#cloud-config

stages:
  boot:
    - name: "Setup users"
      environment:
        FOO: "bar"
```

### `systemd_firstboot`

Runs [`systemd-firstboot`](https://www.freedesktop.org/software/systemd/man/latest/systemd-firstboot.html) with the arguments specified.

```yaml
#cloud-config

debug: true

stages:
  boot:
    - name: "Run systemd-firstboot"
      systemd_firstboot:
        hostname: "myhostname"
```

### `datasource`

Sets to fetch user data from the specified cloud providers. It populates
provider specific data into `/run/config` folder and the custom user data
is stored into the provided path.

```yaml
#cloud-config

stages:
  boot:
    - name: "Fetch cloud provider's user data"
      datasource:
        providers:
          - "aws"
          - "digitalocean"
        path: "/etc/cloud-data"
```

### `layout`

Sets additional partitions on disk free space, if any, and/or expands the last
partition. All sizes are expressed in MiB only and default value of `size: 0`
means all available free space in disk. This plugin is useful to be used in
oem images where the default partitions might not suit the actual disk geometry.

```yaml
#cloud-config

stages:
  boot:
    - name: "Repart disk"
      layout:
        device:
          # It will partition a device including the given filesystem label
          # or partition label (filesystem label matches first) or the device
          # provided in 'path'. The label check has precedence over path when
          # both are provided.
          label: "COS_RECOVERY"
          path: "/dev/sda"
        # Only last partition can be expanded and it happens after all the other
        # partitions are created. size: 0 means all available free space
        expand_partition:
          size: 4096
        add_partitions:
          - fsLabel: "COS_STATE"
            size: 8192
            # No partition label is applied if omitted
            pLabel: "state"
          - fsLabel: "COS_PERSISTENT"
            # default filesystem is ext2 if omitted
            filesystem: "ext4"
```

You can also set custom partitions within the `kairos-install.pre.before` stage. In the following example we will do a
custom partition in disk `/dev/vda`.


{{% alert title="Warning" %}}
You're responsible to make sure the sizes of the partitions fit properly within the disk. Issues of space will be highlighted by
the agent, but they will not fail the installation process unless you pass the `--strict` flag.
{{% /alert %}}

{{% alert title="Warning" %}}
In the case of multiple devices, make sure you don't choose `auto` to determine on which device to install but instead to point
the installation to the device where you are creating the custom partitions.
{{% /alert %}}

```shell
#cloud-config

install:
  # Make sure the installer won't delete our custom partitions
  no-format: true

stages:
  kairos-install.pre.before:
  - if:  '[ -e /dev/vda ]'
    name: "Create partitions"
    commands:
      - |
        parted --script --machine -- /dev/vda mklabel msdos
    layout:
      device:
        path: /dev/vda
      expand_partition:
        size: 0 # All available space
      add_partitions:
        # all sizes bellow are in MB
        - fsLabel: COS_OEM
          size: 64
          pLabel: oem
        - fsLabel: COS_RECOVERY
          size: 8500
          pLabel: recovery
        - fsLabel: COS_STATE
          size: 18000
          pLabel: state
        - fsLabel: COS_PERSISTENT
          pLabel: persistent
          size: 25000
          filesystem: "ext4"
```
