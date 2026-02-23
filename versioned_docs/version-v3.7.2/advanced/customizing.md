---
title: "Customizing the system image"
sidebar_label: "Customization"
sidebar_position: 2
description: Learn how to customize Kairos images to suit your needs
---

:::info Note
This guide focuses on customizing Kairos images. For a complete guide on creating custom cloud images from scratch, including when and how to apply these customizations, see [Creating Custom Cloud Images](/docs/v3.7.2/advanced/creating_custom_cloud_images/).
:::

Kairos is an open source, container-based operating system. To modify Kairos and add a package, you'll need to build a container image from the [Kairos images](/docs/v3.7.2/reference/image_matrix/). Here's an example with Docker which adds `figlet`:

```dockerfile
FROM {{< oci variant="standard" kairosVersion="v3.7.2" k3sVersion="v1.35.0+k3s3" >}}

RUN zypper in -y figlet

RUN export VERSION="my-version"
RUN envsubst '${VERSION}' </etc/os-release
```

After creating your Dockerfile, you can build your own image by running the following command:

```bash
$ docker build -t docker.io/<yourorg>/myos:0.1 .
Sending build context to Docker daemon  2.048kB
Step 1/3 : FROM {{< oci variant="standard" kairosVersion="v3.7.2" k3sVersion="v1.35.0+k3s3" >}}
 ---> 897dc0cddf91
Step 2/3 : RUN zypper install -y figlet
 ---> Using cache
 ---> d57ff48546e7
Step 3/3 : RUN MY_VERSION="my-version" >> /etc/os-release
 ---> Running in b7bcb24969f5
Removing intermediate container b7bcb24969f5
 ---> ca21930a4585
Successfully built ca21930a4585
Successfully tagged <your-org>/myos:0.1
```

Once you have built your image, you can publish it to Docker Hub or another registry with the following command:

```bash
$ docker push <your-org>/myos:0.1
The push refers to repository [docker.io/<your-org>/myos]
c58930881bc4: Pushed
7111ee985500: Pushed
...
```

You can use your custom image when [upgrading nodes manually](/docs/v3.7.2/upgrade/manual/), [with Kubernetes](/docs/v3.7.2/upgrade/kubernetes/) or [specifying it in the cloud-config during installation](/docs/v3.7.2/examples/core/). Here's how to do it manually with the `kairos-agent` command:

```
node:/home/kairos # kairos-agent upgrade --image docker.io/<your-org>/myos:0.1
INFO[2022-12-01T13:49:41Z] kairos-agent version v0.0.1
INFO[2022-12-01T13:49:42Z] Upgrade called
INFO[2022-12-01T13:49:42Z] Applying 'before-upgrade' hook
INFO[2022-12-01T13:49:42Z] Running before-upgrade hook
INFO[2022-12-01T13:49:42Z] deploying image docker.io/oz123/myos:0.1 to /run/initramfs/cos-state/cOS/transition.img
INFO[2022-12-01T13:49:42Z] Creating file system image /run/initramfs/cos-state/cOS/transition.img
INFO[2022-12-01T13:49:42Z] Copying docker.io/oz123/myos:0.1 source...
INFO[0000] Unpacking a container image: docker.io/oz123/myos:0.1
INFO[0000] Pulling an image from remote repository
...
INFO[2022-12-01T13:52:33Z] Finished moving /run/initramfs/cos-state/cOS/transition.img to /run/initramfs/cos-state/cOS/active.img 
INFO[2022-12-01T13:52:33Z] Upgrade completed
INFO[2022-12-01T13:52:33Z] Upgrade completed

node:/home/kairos # which figlet
which: no figlet in (/sbin:/usr/sbin:/usr/local/sbin:/root/bin:/usr/local/bin:/usr/bin:/bin)
node:/home/kairos # reboot

```

Now, reboot your OS and ssh again to it to use figlet:

```
$ ssh -l kairos node:
Welcome to Kairos!

Refer to https://kairos.io for documentation.
kairos@node2:~> figlet kairos rocks!
 _         _                                _        _
| | ____ _(_)_ __ ___  ___   _ __ ___   ___| | _____| |
| |/ / _` | | '__/ _ \/ __| | '__/ _ \ / __| |/ / __| |
|   < (_| | | | | (_) \__ \ | | | (_) | (__|   <\__ \_|
|_|\_\__,_|_|_|  \___/|___/ |_|  \___/ \___|_|\_\___(_)
```

## Customizing the Kernel

Kairos allows you to customize the kernel and initrd as part of your container-based operating system. If you are using a glibc-based distribution, such as OpenSUSE or Ubuntu, you can use the distribution's package manager to replace the kernel with the one you want, and then rebuild the initramfs with `dracut`.

Here's an example of how to do this:

```bash
# Replace the existing kernel with a new one, depending on the base image it can differ
apt-get install -y ...

# Create the kernel symlink
kernel=$(ls /boot/vmlinuz-* | head -n1)
ln -sf "${kernel#/boot/}" /boot/vmlinuz

# Regenerate the initrd, in openSUSE we could just use "mkinitrd"
kernel=$(ls /lib/modules | head -n1)
dracut -v -f "/boot/initrd-${kernel}" "${kernel}"
ln -sf "initrd-${kernel}" /boot/initrd

# Update the module dependencies
kernel=$(ls /lib/modules | head -n1)
depmod -a "${kernel}"
```

After you have modified the kernel and initrd, you can use the kairos-agent upgrade command to update your nodes, or [within Kubernetes](/docs/v3.7.2/upgrade/kubernetes/).


## Customizing the file system hierarchy using custom mounts.


### Bind mounts

For clusters that needs to mount network block storage you might want to add
custom mount point that bind mounted to your system. For example, when using
Ceph file system, the OS mounts drives to `/var/lib/ceph` (for example).

To achieve this you need to add the key `bind_mounts` to the `install` section
you pass the install, and specify a list of one or more bind mounts path.

```
install:
  auto: true
  device: "auto"
  # changes persist reboot  - mount as BIND
  bind_mounts:
  - /var/lib/ceph
...
```

To do this after installation, simply add a cloud config file in the `/oem` folder, for instance, to make `/var/lib/docker` persistent:

```yaml
#cloud-config

stages:
  rootfs:
  - name: "user_custom_mount"
    environment_file: "/run/cos/custom-layout.env"
    environment:
       CUSTOM_BIND_MOUNTS: "/var/lib/docker"
```

### Ephemeral mounts

One can also specifying custom mounts which are ephemeral. These are writable,
however changes are discarded at boot (like `/etc/` already does).
```
install:
  auto: true
  device: "auto"
  # changes persist reboot  - mount as BIND
  bind_mounts:
  - /var/lib/ceph
  ephemeral_mounts:
  - /opt/scratch/
...
```
Note, that these paths should exist in the container file-system used to create the ISO.
See [ISO customization](/docs/v3.7.2/advanced/customizing/) above.


## Customizing the file system hierarchy using cloud-config.

For cases in which there is specific disk or mount needs, 
we can leverage cloud-config to do very specific things that may not be covered by the custom mount facility that we mention above.

For example, if we wanted to mount an extra disk into a specific path in the root that doesn't exists we could do it with a config like this:

```
#cloud-config

install:
  auto: true
  reboot: true
  device: /dev/vda

stages:
  after-install-chroot: # Creates the data dir after install inside the final system chroot
    - &createdatadir
      name: "Create data dir"
      commands:
        - mkdir -p /data
    # Formats the disk ONLY after-install and just once. Extra checks can be added here, so we don't reformat it
    # This can also go in the after-install stage, but its just important to do it just once
    - name: "Format /dev/vdb"
      commands:
        - mkfs.ext4 -F /dev/vdb
  # Creates the data dir after reset inside the final system chroot, just in case it's not there
  after-reset-chroot:
    - <<: *createdatadir
  # Creates the data dir after upgrade inside the final system chroot, just in case it's not there
  after-upgrade-chroot:
    - <<: *createdatadir
  initramfs:
    # Mounts the disk under the /data dir during initramfs on each boot, with RW. Extra options can be added to the mount here
    - name: "Mount /dev/vdb under /data"
      commands:
        - mount -o rw /dev/vdb /data
```

This would leverage the `kairos-agent` stages `after-install-chroot`, `after-upgrade-chroot` and `after-reset-chroot` to
create a new folder in the rootfs, format the given disk and mount it during the `initramfs` stage.

This works because during the `after-install-chroot`, `after-upgrade-chroot` and `after-reset-chroot` stages we run any commands
inside the final system with a chroot AND we have RW access during that time. We could use those same stages to install extra packages for example,
but in this case we use it to create an extra path. Remember that once we have installed, the system is inmmutable, so we won't be able to create
any new paths in the root filesystem during runtime, even when using cloud-config. Only ephemeral and persistent paths are RW during runtime.
