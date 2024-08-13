---
title: "Our First Hackweek"
date: 2024-08-13
linkTitle: "Our First Hackweek"
description: "Our First Hackweek"
author: Mauro Morales ([Twitter](https://twitter.com/mauromrls)) ([GitHub](https://github.com/mauromorales))
---

Last week was a special week. We had our first hackweek! With everyone in the team connecting from their own corners of the world, Belgium, Greece, Italy and Spain, we came together not in person, but through a shared passion for hacking. Unlike typical team-building events, this hackweek was all about individual exploration — each team member diving into their own projects, driven by personal curiosity and the opportunity to experiment.

Over the course of the week, we set aside our usual tasks to focus entirely on these self-driven projects, tackling challenges we rarely have time to address or exploring new avenues. In this post, I’ll share a glimpse of some of the projects we worked on.

During the first day we got together to brainstorm. Many good ideas came from each of us on what to work on. It lifts my spirit to see that our project while very stable, still has lots of avenues to explore and that everyone in our team is keen on making Kairos a better project.

## Kairos Kiosk & Quiz App by Dimitris

Since we have some upcoming events where we will have a booth, we were thinking of a way to break the ice, start conversations with people and keep them engaged.

One idea was to set up a Kairos Kiosk with an app that quizzes people passing by with questions that introduce them to the ideas behind Kairos. Those who answer correctly will receive a prize. This approach makes it feel like a game while also serving as a conversation starter, depending on the quiz questions.

We had a look and couldn't find an open source tool that would allow us to build such a quiz. Since I have been out of web development for quite some time, I thought it would be a refreshing project. I took the fastest road to success, using tools I was already familiar with, like [gin-gonic](https://gin-gonic.com/), [gorm](https://gorm.io/) and [SQLite](https://www.sqlite.org/).

For the front end I used [tailwindcss](https://tailwindcss.com/) because I'm hearing that's what the cool kids use these days. Since I'm terribly rusty in CSS, I had ChatGPT helping me out (actually doing most of the work at the front end).

The result of this effort is this repository: https://github.com/jimmykarily/quizmaker

Future plans include:

- improve the README
- make it configurable so other teams can use their own logo and text
- create an easy way to collect results
- create an easy deployment method (kustomization / helm chart / other)

![image](https://private-user-images.githubusercontent.com/433958/357165119-cbad99c7-71b6-4454-9d41-f44f12d2aaf9.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjM0ODg1MTMsIm5iZiI6MTcyMzQ4ODIxMywicGF0aCI6Ii80MzM5NTgvMzU3MTY1MTE5LWNiYWQ5OWM3LTcxYjYtNDQ1NC05ZDQxLWY0NGYxMmQyYWFmOS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjQwODEyJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI0MDgxMlQxODQzMzNaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02ZDM2NTg2YzZmNzMzMzE5YjJhZmE4ZDUyM2UzYWNjZmRjZDQ4NTA4NzhlNGE1NzQ5MmY1OGJkOTI5M2FmY2U0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZhY3Rvcl9pZD0wJmtleV9pZD0wJnJlcG9faWQ9MCJ9.lya3AQtAb1usRx63HsTTyDQrf29MUkmiKRm4Mu6kuKw)

I'm hoping to have it in good shape to be used in one of our upcoming events. Stay tuned!

## Raspberry Pi 5 & Docs Flavor Picker by Mauro

As for me, I first decided to try to install Kairos on a Raspberry Pi 5. I wasn't sure where to start since I'm not an expert on how ARM boards boot a system. So I opened a new session with ChatGPT and went on a mission to understand how such systems boot. While I cannot call this experiment a success, since my Raspberry is not properly booting, I did learn a lot and feel much more confident to tackle some booting issue with these boards in the future. I decided not to pursue this further because the Kernel is not ready for it, but I put my learnings on a blog post.

I decided to use the rest of the week to do some major change on our docs by introducing a Flavor Picker, where you can choose which Kairos Flavor (e.g. Ubuntu, openSUSE, etc) you prefer to read the docs and all scripts will show the selected flavor so that you don't have to be changing them manually but just copy and paste. A blog post about this change is also on the works.

## Conclusion

While we each worked independently, the results of our individual efforts have already begun to ripple through the Kairos project, influencing our roadmap and inspiring new directions for future development. This hackweek wasn’t about team building — it was about giving each person the space to innovate on their own terms, and the results speak for themselves.

The projects we embarked on, whether big or small, demonstrated the power of focused, independent exploration. We’re excited to see how these initial ideas will evolve as we continue to develop and refine them in the coming months. This hackweek has shown us that sometimes, the best way to move forward is to give everyone the freedom to explore their own path, and we’re eager to see where those paths will lead Kairos next.