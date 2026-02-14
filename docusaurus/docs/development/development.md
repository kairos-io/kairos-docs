---
title: "Development notes"
sidebar_label: "Development"
sidebar_position: 1
date: 2022-11-13
description: Learn how to contribute to Kairos by exploring its development practices, debugging tools, and supported hardware.
---

Here you can find development notes intended for maintainers and guidance for new contributors.

## Repository structure

Kairos uses Docker as a build system instead of Makefiles. This ensures that despite the environment you should be able to build `Kairos` seamlessly. To track specific packages, like [Immucore](https://github.com/kairos-io/immucore) or the [Kairos' Agent](https://github.com/kairos-io/kairos-agent) which follow their own versioning and cadence, the [Kairos Framework](https://github.com/kairos-io/kairos-framework) is used. Using [luet](https://luet.io), the Framework includes a snapshot of multiple versions built for Kairos.

- [The Kairos repository](https://github.com/kairos-io/kairos) - contains the build definitions for releasing Kairos artifacts and testing changes to Kairos.
- [The kairos-framework repository](https://github.com/kairos-io/kairos-framework) - provides a snapshot of the required binaries for a kairos flavor. This includes the agent, immucore, kcrypt, default OEM cloud configs, etc...
- [The kairos-agent repository](https://github.com/kairos-io/kairos-agent/) contains the `kairos-agent` code which is the Operations interface. IT deals with installing, upgrading, reseting and so on.
- [The provider-kairos repository](https://github.com/kairos-io/provider-kairos) contains the kairos provider component which uses the SDK to bring up a Kubernetes cluster with `k3s`.
- [The packages repository](https://github.com/kairos-io/packages) contains package source specifications used by `kairos-framework`.

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
  quay.io/kairos/auroraboot:v0.5.0 build-iso --output /output/ docker:myBaseKairos:v1.0.0 
```

You can see some example of builds in either the [kairos-init repo](https://github.com/kairos-io/kairos-init/blob/main/.github/workflows/test.yml), which builds a series of OCI containers of different base images, variants and platforms or on the [Kairos repo](https://github.com/kairos-io/kairos/tree/master/.github/workflows) itself which generates not only different types of platforms and variants and base images but also generates different types of artifacts, like ISOs, Trusted Boot ISOs, Trusted Boot upgrade artifacts, raw disk images and so on.

For more information on kairos-init, see the [kairos factory documentation](../Reference/kairos-factory)

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
