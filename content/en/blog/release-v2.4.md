---
title: "Kairos release v2.4"
date: 2023-09-19
linkTitle: "Kairos release v2.4"
description: "Kairos release v2.4"
author: Dimitris Karakasilis ([LinkedIn](https://www.linkedin.com/in/jimmykarily/)) ([GitHub](https://github.com/jimmykarily))
---
<h1 align="center">
  <br>
     <img width="184" alt="kairos-white-column 5bc2fe34" src="https://user-images.githubusercontent.com/2420543/215073247-96988fd1-7fcf-4877-a28d-7c5802db43ab.png">
    <br>
<br>
</h1>

After some bumps, v2.4.0 is finally out and it comes with a ton of improvements and bug fixes.

Among other changes:

- our release artifacts are now named in a way that is more consistent and makes it easier to identify them
- fixed various issues on raspberry pi, including serial console, auto expansion of last partition and more
- consolidated all configuration to the kairos-config (`/etc/elemental/config.yaml` is no longer used)
- merged the `kairos-io/kairos` and `kairos-io/provider-kairos` release pipelines. From now on, `kairos-io/kairos` will be the canonical location for all artifacts, "standard" and "core".

If you find these changes interesting, check out [the full changelog](https://github.com/kairos-io/kairos/releases/tag/v2.4.0).

(Don't forget to read the "Known issues" section!)

We want to thank everyone who participated in this release, with code contributions, reviews, bug reports, comments, debugging output or just by showing up [in our meetings](https://calendar.google.com/calendar/u/0/embed?src=c_6d65f26502a5a67c9570bb4c16b622e38d609430bce6ce7fc1d8064f2df09c11@group.calendar.google.com&ctz=Europe/Rome). Stay awesome and keep it coming!
