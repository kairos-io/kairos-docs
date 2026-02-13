---
title: "Development notes"
linkTitle: "Development"
weight: 1
date: 2022-11-13
description: Learn how to contribute to Kairos by exploring its development practices, debugging tools, and supported hardware.
---

Here you can find development notes intended for maintainers and guidance for new contributors.

## Repository structure

Kairos uses Docker as its primary build system, allowing you to build Kairos images seamlessly in any environment—there is no need for a top-level Makefile. However, individual components within Kairos may use their own build systems or Makefiles as needed.

The main Kairos build process is managed by [kairos-init](https://github.com/kairos-io/kairos-init), a tool that transforms a typical (non-immutable) OS image into a Kairos image. Within kairos-init, you'll find all the essential building blocks that make up a Kairos system, such as [immucore](https://github.com/kairos-io/immucore), the [kairos-agent](https://github.com/kairos-io/kairos-agent), and more. Each of these components is included at a specific, pinned version, since they are developed and released on their own schedule. The combination of these pinned versions is what defines a particular Kairos release.

- [The Kairos repository](https://github.com/kairos-io/kairos) - contains the build definitions for releasing Kairos artifacts and testing changes to Kairos.
- [The kairos-agent repository](https://github.com/kairos-io/kairos-agent/) contains the `kairos-agent` code which is the Operations interface. IT deals with installing, upgrading, reseting and so on.
- [The provider-kairos repository](https://github.com/kairos-io/provider-kairos) contains the kairos provider component which uses the SDK to bring up a Kubernetes cluster with `k3s`.

## Build Kairos

To build a Kairos OS you only need Docker and the Dockerfile from the Kairos repo [under `images/Dockerfile`](https://github.com/kairos-io/kairos/blob/master/images/Dockerfile)

Building Kairos is a 2 step process, on the first one we generate the OCI artifact with the actual system on it. That's the heart of Kairos, everything on Kairos comes from an OCI artifact. Then the second step is converting that image into a consumable artifact like an ISO or a Raw Disk image.

To build the OCI artifact you can run a docker build with a given base image that you want your artifact to be based on and a version for internal tracking, for example:

```bash
docker build -t kairosDev:v1.0.0 --build-arg VERSION=v1.0.0 --build-arg BASE_IMAGE=@baseImage -f images/Dockerfile .
```

To build a Kairos ISO, you just call AuroraBoot with the generated OCI artifact:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:v0.5.0 build-iso --output /output/ oci:myBaseKairos:v1.0.0 
```

You can see some example of builds in either the [kairos-init repo](https://github.com/kairos-io/kairos-init/blob/main/.github/workflows/test.yml), which builds a series of OCI containers of different base images, variants and platforms or on the [Kairos repo](https://github.com/kairos-io/kairos/tree/master/.github/workflows) itself which generates not only different types of platforms and variants and base images but also generates different types of artifacts, like ISOs, Trusted Boot ISOs, Trusted Boot upgrade artifacts, raw disk images and so on.

For more information on kairos-init, see the [kairos factory documentation](../Reference/kairos-factory.md)

## New controllers

Kairos-io adopts [operator-sdk](https://github.com/operator-framework/operator-sdk).

To install `operator-sdk` locally you can use the `kairos` repositories:

1. Install Luet:
   `curl https://luet.io/install.sh | sudo sh`
2. Enable the Kairos repository locally:
   `luet repo add kairos --url quay.io/kairos/packages --type docker`
3. Install operator-sdk:
   `luet install -y utils/operator-sdk`

### Create the controller

Create a directory and let's init our new project it with the operator-sdk:

```bash

$ mkdir kairos-controller-foo
$ cd kairos-controller-foo
$ operator-sdk init --domain kairos.io --repo github.com/kairos-io/kairos-controller-foo

```

### Create a resource

To create a resource boilerplate:

```
$ operator-sdk create api --group <groupname> --version v1alpha1 --kind <resource> --resource --controller
```

### Convert to a Helm chart

operator-sdk does not have direct support to render Helm charts (see [issue](https://github.com/operator-framework/operator-sdk/issues/4930)), we use [kubesplit](https://github.com/spectrocloud/kubesplit) to render Helm templates by piping kustomize manifests to it. `kubesplit` will split every resource and add a minimal `helm` templating logic, that will guide you into creating the Helm chart.

If you have already enabled the `kairos` repository locally, you can install `kubesplit` with:

```
$ luet install -y utils/kubesplit
```

### Test with Kind

Operator-sdk will generate a Makefile for the project. You can add the following and edit as needed to add kind targets:

```
CLUSTER_NAME?="kairos-controller-e2e"

kind-setup:
	kind create cluster --name ${CLUSTER_NAME} || true
	$(MAKE) kind-setup-image

kind-setup-image: docker-build
	kind load docker-image --name $(CLUSTER_NAME) ${IMG}

.PHONY: test_deps
test_deps:
	go install -mod=mod github.com/onsi/ginkgo/v2/ginkgo
	go install github.com/onsi/gomega/...

.PHONY: unit-tests
unit-tests: test_deps
	$(GINKGO) -r -v  --covermode=atomic --coverprofile=coverage.out -p -r ./pkg/...

e2e-tests:
	GINKGO=$(GINKGO) KUBE_VERSION=${KUBE_VERSION} $(ROOT_DIR)/script/test.sh

kind-e2e-tests: ginkgo kind-setup install undeploy deploy e2e-tests
```
