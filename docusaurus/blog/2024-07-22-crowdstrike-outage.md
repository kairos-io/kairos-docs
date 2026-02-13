---
authors:
- mauro-morales
slug: crowdstrike-outage
tags:
- kairos
title: 'The Importance of Resilient Infrastructure: How Kairos Could Have Mitigated
  the CrowdStrike Outage'
---



The recent CrowdStrike update fiasco that wreaked havoc across industries, causing BSODs and crippling critical systems, starkly highlights the need for resilient and immutable infrastructure. If affected organizations had adopted an immutable OS like Kairos, their systems would have shown greater resilience against such widespread disruptions.

## TL;DR

CrowdStrike's faulty update led to massive system crashes. Kairos's immutable and decentralized architecture offers a robust alternative, ensuring system integrity and swift recovery in such scenarios.

<!--truncate-->


## CrowdStrike Update: What Went Wrong

On July 19, 2024, a flawed update from CrowdStrike led to a significant number of Windows machines experiencing BSODs (Blue Screen of Death). This impacted operations across airlines, banks, broadcasters, and more. The issue arose from a misconfiguration in a file responsible for screening named pipes, leading to system crashes with a specific stop code. The resolution involved manual intervention on each affected device (imagine addressing this on a big flee of edge devices!), highlighting the vulnerability of traditional IT infrastructures to such disruptions.

## How Kairos Ensures Resilience

Kairos, offers a fundamentally more resilient approach:

- **Immutable Infrastructure**: Helps ensure that system states are consistent and unchangeable, significantly reducing the risk of configuration drift and unauthorized changes that could introduce vulnerabilities.

- **Decentralized Deployment**: Allows each node to operate independently. This decentralization means that an issue affecting one node does not necessarily propagate across the entire network.

- **Rapid Recovery**: Kairos’s architecture allows for quick rollback to previous stable states, minimizing downtime. In the case of the CrowdStrike incident, affected systems could have been swiftly reverted to their last known good state.

- **Enhanced Security**: By leveraging a secure boot process and a read-only root filesystem, Kairos minimizes attack vectors. Any attempt to alter system files or configurations would be futile, thereby protecting the system's integrity. Since the update came from CrodStrike, this would not have played a role in this specific incident, but it is still worth mentioning.

## Reflecting on the xz Utils Backdoor Incident

To draw a parallel, let’s recall the xz Utils backdoor incident. Kairos handled it with efficiency, demonstrating the robustness of our approach. When a backdoor was found in xz Utils, affecting versions 5.6.0 and 5.6.1, Kairos's response was swift and effective. We identified that only Kairos Tumbleweed versions 3.0.1 and 3.0.2 were affected, removed the compromised artifacts, and provided clear guidance for remediation.

## Conclusion

The CrowdStrike incident underscores the necessity for resilient, immutable infrastructure in today’s digital landscape. Kairos offers a proven solution, designed to withstand such disruptions and ensure continuity of operations. By adopting Kairos, organizations can protect themselves from similar future incidents, ensuring their systems remain secure, stable, and operational.

For a detailed understanding of our approach and how we handled the xz Utils backdoor, refer to our detailed [post on the incident](/blog/2024/04/02/xz-utils-backdoor/).

Stay resilient, stay secure.
