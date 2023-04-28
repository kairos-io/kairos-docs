---
title: "LocalAI"
linkTitle: "LocalAI"
weight: 4
description: > 
    This section describe examples on how to deploy Kairos with k3s and LocalAI
---

{{% alert title="Warning" %}}
This tutorial will download an AI model which is around 4Gib.

Keep in mind that AI models are performance hungry. Performance on a VM can be poor depending on your host CPU. To get the best performance, use a bare-metal machine.
{{% /alert %}}

Welcome to the guide on using LocalAI with Kairos and K3s on your nodes!

But first, what is [LocalAI](https://github.com/go-skynet/LocalAI)?

LocalAI is a self-hosted, community-driven simple local OpenAI-compatible API written in go. Can be used as a drop-in replacement for OpenAI, running on CPU with consumer-grade hardware. Supports ggml compatible models, for instance: LLaMA, alpaca, gpt4all, vicuna, koala, gpt4all-j, cerebras.
This means that you can have the power of an AI model in your Edge-Kubernetes cluster, and it can all be easily done thanks to GPT4ALL models, LocalAI and Kairos!

To get started, you'll need to use the [provider-kairos](https://github.com/kairos-io/provider-kairos) artifacts, which include k3s. Follow the [Installation](/docs/installation) documentation, and use the following configuration:

```yaml
#cloud-config

hostname: localai-{{ trunc 4 .MachineID }}
users:
- name: kairos
  passwd: kairos
  ssh_authorized_keys:
    - github:mauromorales

k3s:
  enabled: true

bundles:
  - targets:
      - run://quay.io/kairos/community-bundles:localai_latest
localai:
  serviceType: LoadBalancer
```

There are a few things to note in this configuration file:

- In the `k3s` block, we set it as `enabled: true` because we want Kairos to run k3s for us.
- In the `bundles` block, we add a target pointing to the community bundle of LocalAI.
- We add a `localai` block, where we specify the `serviceType: LoadBalancer` so we can access LocalAI's API outside the cluster.

And that's it! You should now have LocalAI and K3s set up on your Kairos node.

The first thing you want to check is which models you have available. By default, the LocalAI Kairos bundle downloads the `ggml-gpt4all-j.bin` model available from [gpt4all](https://github.com/nomic-ai/gpt4all). 

{{% alert title="Warning" %}}
Remember to change the IP with your own.
{{% /alert %}}

```shell
$ curl http://192.168.122.177:8080/v1/models
{"object":"list","data":[{"id":"ggml-gpt4all-j.bin","object":"model"}]}
```

With the name of the model, we can now give it a go with:

```shell
$ curl http://192.168.122.177:8080/v1/completions -H "Content-Type: application/json" -d '{
     "model": "ggml-gpt4all-j.bin",
     "prompt": "Is there anybody out there?",                                                                                                                                                                                
     "temperature": 0.7
  }'
{"model":"ggml-gpt4all-j.bin","choices":[{"text":"As an AI language model, I do not have the ability to determine whether there is anybody out there or not. However, I can say that the concept of \"out there\" is a philosophical and cultural concept that refers to the idea that there are other beings or entities beyond our own world. Some people believe in the existence of extraterrestrial life, while others do not."}]}
```

And voilà! There you have it, a GPT model running on your k3s node.
