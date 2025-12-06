---
authors:
- mauro-morales
slug: spos-panel-at-kubecon-paris-2024
tags:
- kairos
title: SPOS Panel at KubeCon Paris 2024
---

I recently had the opportunity to attend KubeCon 2024. You can find my recap at the [Spectro Cloud Blog](https://www.spectrocloud.com/blog/kubecon-paris-edge-ai-and-la-vie-en-cloud-native), but I'd like to add some additional information about the Special Purpose Operating System Panel in which we participated.

The panel was scheduled for the last day of KubeCon, which I think probably hurt the attendance since many people had already left. Nevertheless, according to the scheduling tool, 351 people were planning to attend.

On set, we had Sean McGinnis from AWS representing Bottlerocket, Danielle Tal from Microsoft representing Flatcar, Felipe Huici from Unikraft representing Unikraft, Justin Haynes from Google representing COS and myself from Spectro Cloud representing Kairos. The panel was moderated by Thilo Fromm also from Microsoft, who did a fantastic job keeping everyone engaged. In the audience we also had representatives from Talos and EveOS. Most of us are part of the Special Purpose Operating System Work Group under the CNCF TAG Runtime.

We started with a short introduction about what SPOSes are, and it was refreshing to hear that the audience had a good idea. If you head to the [CNCF Work Group page](https://tag-runtime.cncf.io/wgs/spos/charter/), you will see that we use the following definition:

> Special Purpose Operating Systems are designed to run well defined workloads with minimal boilerplate of dependencies suited for niche use cases.

In the case of Kairos, our specialization focuses on Day-2 operations on Edge devices, but not excluding other setups including Kubernetes. This means that in our OS we try to pack everything users will need to keep their devices secure, remotely manageable and as lean as possible.

Next, we presented a slide called Landscape which had one axis going from Highly Specialized to Flexible/Customizable. In my opinion this is misleading because as I previously mentioned Kairos is highly specialized, however it is also very flexible and customizable. My best example for this is that we are the only SPOS which can be based on different Linux distributions. If you are looking for such a specialized solution but come from Alpine, Debian, Fedora, openSUSE, Ubuntu or Rocky Linux, you don't have to give up your existing OS know-how because there's a Kairos version for you.

The landscape analogy still fits, but instead of having to fit the different SPOSes into made up groups, I think of it as consisting of areas like Kubernetes, Edge Computing, AI, Data Centers, etc. and each of the different SPOSes being specialized in one or more of these areas. On a completely different axis, we could define the flexibility and customization for each individual SPOS. For example, Talos, has an opinionated API to handle the OS, so we could consider it more rigid, while all other projects that give ssh access would be on the other end of the spectrum. And this can be applied to different topics, like configuration management, Kubernetes distribution, etc. That rigidity or flexibility is not necessarily good or bad but better depending on what you are trying to achieve.

The rest of the time was dedicated for Q&A.

Last but not least, let me reiterate like I did in the Spectro Cloud post that, these panels and similar initiatives are important because they help users understand why these projects exist and get an idea of why we have different options and how that makes us a stronger community instead of rivals.

<iframe width="560" height="315" src="https://www.youtube.com/embed/uD-T9LdfvrM" title="Special Purpose Operating Systems: The Next Step in OS Evolution or One-Trick Ponies?" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>