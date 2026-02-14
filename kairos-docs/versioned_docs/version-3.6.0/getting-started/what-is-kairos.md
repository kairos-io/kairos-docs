---
title: What is Kairos?
---

Kairos is a cloud-native Linux meta-distribution for running Kubernetes. It brings the power of the public cloud to your on-premises environment. With Kairos, you can build your own cloud with complete control and no vendor lock-in.

:::info Note
Kairos is a Cloud Native Computing Foundation ([CNCF](https://cncf.io)) sandbox project.
:::

Here are a few reasons why you should try Kairos:

- Build your own cloud on-premises with complete control and no vendor lock-in
- Provision nodes with your own image or use Kairos releases for added flexibility
- Use Kairos for a wide range of use cases, from Kubernetes applications to appliances and more
- Simple and streamlined day-2 operations (e.g. node upgrades)

## What can I do with Kairos?

With Kairos, you can easily spin up a Kubernetes cluster with the Linux distribution of your choice, and manage the entire cluster lifecycle with Kubernetes. Try Kairos today and experience the benefits of a unified, cloud-native approach to OS management.

With Kairos, you can:

- Spin up a Kubernetes cluster with any Linux distribution in just a few clicks
- Create an immutable infrastructure that stays consistent and free of drift with atomic upgrades
- Manage your cluster's entire lifecycle with Kubernetes, from building to upgrading
- Automatically create multi-node, single clusters that spans across regions for maximum flexibility and scalability

Try Kairos today and experience the benefits of a unified, cloud-native approach to OS management. Say goodbye to the hassle of managing multiple systems, and hello to a more streamlined and efficient way of working.

## Features

Our key features include are

- [Immutability](docs/architecture/immutable): ensure your infrastructure stays consistent with atomic upgrades
- [Trusted Boot](/docs/architecture/trustedboot): stay safe by limiting the operating systems allowed to boot on your systems
- [Container-based](/docs/architecture/container): manage your nodes as apps in containers for maximum flexibility and portability
- [P2P Mesh](/docs/architecture/network): self-coordinated, automated, no interaction Kubernetes deployments with Peer-2-Peer technology
- [Meta-Distribution](/docs/architecture/meta): choose your preferred Linux distribution. If we don't have it, you can probably build it yourself!

More features

- Easily create multi-node Kubernetes clusters with [K3s](https://k3s.io), and enjoy all of [K3s](https://k3s.io)'s features
- Upgrade manually via CLI or with Kubernetes, and use container registries for distribution upgrades
- Enjoy the benefits of an immutable distribution that stays configured to your needs
- Configure nodes with a single cloud-init config file for added simplicity
- Upgrade even in airgap environments with in-cluster container registries
- Extend your image at runtime or build time with Kubernetes Native APIs
- Coming soon: CAPI support with full device lifecycle management and more
- Create private virtual network segments with a full-mesh P2P hybrid VPN network that can stretch up to 10000 km

## More than a Linux distribution

Kairos is more than just an ISO, qcow2, or Netboot artifact. It allows you to turn any Linux distribution into a uniform and compliant distro with an immutable design. This means that any distro "converted" with Kairos will share the same common feature set and can be managed in the same way using Kubernetes Native API components. Kairos treats all OSes homogeneously and upgrades are distributed via container registries. Installations mediums and other assets required for booting bare metal or edge devices are built dynamically by Kairos' Kubernetes Native API components.

![livecd](https://user-images.githubusercontent.com/2420543/189219806-29b4deed-b4a1-4704-b558-7a60ae31caf2.gif)

## Goals

The Kairos ultimate goal is to bridge the gap between Cloud and Edge by creating a smooth user experience. There are several areas in the ecosystem that can be improved for edge deployments to make it in pair with the cloud.

The Kairos project encompasses all the tools and architectural pieces needed to fill those gaps. This spans between providing Kubernetes Native API components to assemble OSes, deliver upgrades, and control nodes after deployment.

Kairos is distro-agnostic, and embraces openness: The user can provide their own underlying base image, and Kairos onboards it and takes it over to make it Cloud Native, immutable that plugs into an already rich ecosystem by leveraging containers as distribution medium.

## Contribute

Kairos is an open source project, and any contribution is more than welcome! The project is big and narrows to various degrees of complexity and problem space. Feel free to join our chat, discuss in our forums and join us in the Office hours. Check out the [contribution guidelines](https://github.com/kairos-io/kairos/contribute) to see how to get started and our [governance](https://github.com/kairos-io/community/blob/main/GOVERNANCE.md).

We have an open roadmap, so you can always have a look on what's going on, and actively contribute to it.

Useful links:

- [Upcoming releases](https://github.com/kairos-io/kairos/issues?q=is%3Aissue+is%3Aopen+label%3Arelease)


## Community

You can find us at:

- [#Kairos-io at matrix.org](https://matrix.to/#/#kairos-io:matrix.org)
- [IRC #kairos in libera.chat](https://web.libera.chat/#kairos)
- [GitHub Discussions](https://github.com/kairos-io/kairos/discussions)

### Project Office Hours

Project Office Hours is an opportunity for attendees to meet the maintainers of the project, learn more about the project, ask questions, learn about new features and upcoming updates.

Office hours are happening weekly on Monday - 15:30 – 16:00pm UTC. [Meeting link](https://meet.jit.si/kairos-community-meetings-362341)

## Alternatives

There are other projects that are similar to Kairos which are great and worth to mention, and actually Kairos took to some degree inspiration from.
However, Kairos have different goals and takes completely unique approaches to the underlying system, upgrade, and node lifecycle management.

- [k3os](https://github.com/rancher/k3os)
- [Talos](https://github.com/siderolabs/talos)
- [FlatCar](https://flatcar-linux.org/)
- [CoreOS](https://getfedora.org/it/coreos?stream=stable)

## Development

### Building Kairos

Requirements: [Docker](https://www.docker.com/)

First we need to clone the repository

```bash
git clone https://github.com/kairos-io/kairos.git
cd kairos
```

Then we can build an OCI artifact which is the base of all things Kairos. Our ISOs, cloud images, upgrade artifacts are all OCI artifacts and they are managed like a normal OCI artifact. They can be pushed, tagged, labelled, build on top by using it as FROM in a Dockerfile, etc..

To build the base artifact we can do:
```bash
docker build -t myBaseKairos:v1.0.0 --build-arg VERSION=v1.0.0 --build-arg BASE_IMAGE=@baseImage -f images/Dockerfile .
```

Then we can build the ISO with the following command for a Kairos core image based on Ubuntu:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:v0.5.0 build-iso --output /output/ docker:myBaseKairos:v1.0.0 
```

That will generate an ISO file under the build dir that you can use.

## What's next?

- [Different ways to install Kairos](/docs/installation)
- [Upgrading](/docs/upgrade)