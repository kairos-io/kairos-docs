---
authors:
  - mauro-morales
  - dimitris-karakasilis
description: kairos-agent, immucore, kairos-sdk, kairos-init, and kcrypt-discovery-challenger have moved into kairos-io/kairos. Why we did it, what the new build pipeline looks like, and what actually happens to five repos' worth of git history.
slug: 2026/08/21/one-repo-one-pipeline-one-version
tags:
  - kairos
title: "One Repo, One Pipeline, One Version"
---

If you've built Kairos from source in the last few days, you've noticed: `kairos-agent`, `immucore`, `kairos-sdk`, `kairos-init`, and `kcrypt-discovery-challenger` are gone. Not deleted — moved. They now live inside [kairos-io/kairos](https://github.com/kairos-io/kairos), as `agent/`, `immucore/`, `sdk/`, `kairos-init/`, and `kcrypt/`.

**TL;DR, if you just need to keep building:**

- The five repos are archived, not deleted. Their code, full git history, and existing published tags all still work — see below if you want proof.
- Using the SDK: import `github.com/kairos-io/kairos/sdk/...` (e.g. `sdk/bus`, `sdk/collector`, `sdk/machine`) instead of `github.com/kairos-io/kairos-sdk`. Code pinned to old `kairos-sdk` tags keeps building unchanged.
- Using kairos-init: same container image, same tag pattern — `quay.io/kairos/kairos-init:vX.Y.Z` — just built from the monorepo now.
- The next `kairos-init` tag will jump from `v0.16.x` to something like `v4.x.x`. That is **not** four major versions of breaking change — see "About that version jump" below before you panic.
- Everything else here is the why, the pipeline, and the git-history receipts, for anyone who wants them.

{/* truncate */}

## The problem this actually solves

Kairos has never shipped as a single thing. A user running Ubuntu Kairos 3.5 was told to move to kairos-init 2.6. Running `--version` on the agent gave 2.2. Three numbers, one product, and no way to tell which of them was "your" version.

That wasn't a labeling problem — it was a real coordination cost. `kairos-init` alone was maintaining four minor lines at once in July, because each one tracked a different Kairos release under the hood. The mapping between components already existed; only maintainers could read it. We [wrote up the case for a single shared version number](https://github.com/kairos-io/kairos/issues/4301) in detail, and partway through that discussion the obvious question came up: why keep the mapping in a table at all, when the fix is to stop having five things to map between?

So: monorepo. Not because monorepos are fashionable, but because it's the most direct way to make "one version" mechanically true instead of a promise five release pipelines have to keep independently.

## What actually moved, and how

Each component came in with [`git subtree add`](https://github.com/kairos-io/kairos/commit/1b6014b33929163a64ccad5fdf242a0a70bd7d70), one PR per component — [kairos-sdk](https://github.com/kairos-io/kairos/pull/4343), then [agent, immucore, kairos-init, and kcrypt together](https://github.com/kairos-io/kairos/pull/4344). The five source repos are archived, with a banner pointing here.

Nothing published from them stops working. Every Go module tag (`go get github.com/kairos-io/kairos-agent/v2@v2.31.1`) still resolves through the Go module proxy forever, because the proxy caches it independently of the source repo's state. Every container tag on `quay.io` stays pullable. Archived just means read-only on GitHub, not gone.

## Does the git history survive?

We checked, rather than assumed. Short answer: yes, but with one real wrinkle worth knowing about.

`git subtree add` grafts the entire source repo as a second parent of the merge commit — it doesn't rewrite or truncate anything. We verified this per component by walking the ancestry of the commit each subtree merge points at:

| Component | Commits in the original repo | Commits reachable from the graft point |
|---|---|---|
| `kairos-agent` → `agent/` | 2,031 | 2,030 |
| `immucore` → `immucore/` | 648 | 645 |
| `kairos-sdk` → `sdk/` | 922 | 921 |
| `kairos-init` → `kairos-init/` | 505 | 504 |
| `kcrypt-discovery-challenger` → `kcrypt/` | 347 | 344 |

(The handful missing per component are the "add archive notice" commits made on each repo after the graft — nothing from before it.) Every one of those commits is a real, permanent, unreachable-by-`git gc` part of `kairos-io/kairos`'s history now.

`git blame` finds it without help. Blame a line in `agent/internal/agent/agent.go` today and it correctly walks past the merge into `kairos-agent`'s original commit from 2022, author and all.

The wrinkle: `git log -- agent/some/file.go` does *not* walk through automatically. `git subtree add` merges the foreign tree in at a prefix; it doesn't rewrite the foreign history's paths to match, so git's default path-history simplification — which drives `git log <path>` and GitHub's "History" button on a file — doesn't connect the two sides on its own. If you want the pre-move commit log for something now under `agent/`, go to the graft commit directly:

```sh
git log 14f0d3bf68b60c86efbfd1dd857a0d9087bac7b1 -- some/file.go
```

(Swap in the commit named in `agent/`'s "Add 'agent/' from commit '...'" merge — [immucore](https://github.com/kairos-io/kairos/commit/00b8fb5c11595dc019be749293222be920cb3155), [sdk](https://github.com/kairos-io/kairos/commit/1b6014b33929163a64ccad5fdf242a0a70bd7d70), [kairos-init](https://github.com/kairos-io/kairos/commit/108c45182d318da0c118513e4b3567f021380b04), [kcrypt](https://github.com/kairos-io/kairos/commit/eb51205c693c09bbd7f3db8e8295abc8128637b1) each have their own.) Or just clone the archived repo — it isn't going anywhere either.

So: nothing was lost. Something did get a little harder to find, and now you know where to look.

## The pipeline finally looks like one

This is the part we're most glad to be rid of. Before the move, a change to Kairos touched up to six separate CI systems that didn't know about each other: `kairos`'s own `binaries.yaml`, `image-master*.yaml`, `uki.yaml`, `lint.yaml`, and `unit-tests.yaml`, plus whatever each of `kairos-agent`, `immucore`, `kairos-sdk`, `kairos-init`, and `kcrypt-discovery-challenger` ran on their own. A red build in `kairos-init` didn't stop a green `kairos` release from shipping against it. Finding out *why* something broke meant checking six Actions tabs.

`master.yaml` retires all five of the `kairos`-side files above and replaces them with one dependency graph:

```
unit-tests, lint, build-binaries
        └──▶ build-images
                  ├──▶ build-iso        ──▶ qemu-tests-core / -standard / -uki
                  └──▶ build-iso-arm            │
                                                 ▼
                                          promote-images
```

Here's a run of it, in progress:

![Kairos master.yaml pipeline graph](https://github.com/user-attachments/assets/a924f4d6-8a23-4ec7-91b8-33540cf086ca)

The safety property is the part that's easy to miss looking at the graph: `build-images` doesn't push straight to `:master`. It pushes to `:master-scratch`, the ISO and qemu jobs test *that*, and only `promote-images` — after every qemu job is green, arm build included — copies the manifest across to `:master`. A broken push leaves `:master-scratch` broken and `:master` untouched, instead of shipping a red build to the tag everything else pulls from.

The tag-triggered `release.yaml` mirrors the same shape for `v*` tags: scratch tag, qemu-gate, promote to the release tag and `:latest`, then attach binary archives to the GitHub Release. One honest gap: `release-legacy.yaml` still runs alongside it for now, because it builds a k3s/k0s per-version ISO matrix the new pipeline doesn't produce yet. That's a tracked follow-up, not a silent omission.

## Where things get released, concretely

One tag on `kairos-io/kairos`, e.g. `v4.3.0`, now produces everything: the `kairos-agent`, `immucore`, `kcrypt-discovery-challenger`, `provider-kairos`, and `kairos-installer` binaries, plus `kairos-init`, all built from `VERSION := git describe --tags`, all linked with the same `-X .../internal/version.Version=$(VERSION)`. Every one of them reports `v4.3.0` when you ask. That's [#4301](https://github.com/kairos-io/kairos/issues/4301)'s ask, done — not as a policy anyone has to remember to follow, but as a Makefile variable everything shares because it's now one `git describe` away.

## About that version jump

If you build your own images against `kairos-init`, you're about to see it go from `v0.16.3` to something like `v4.3.0` in one release. That number, on its own, looks like a scare jump — four majors in one bump usually means "expect everything to be different."

It doesn't mean that here. It's the same code, the same maintainers, the same review process, doing what would have shipped as `v0.16.4` or `v0.17.0` under the old numbering — just carrying the shared Kairos version instead of its own independent one, for exactly the reason in the first section: so you stop having to know that `kairos-init 0.16.3` and `Kairos 4.2.0` were ever "the same release" in disguise. Check the changelog for what actually changed, not the size of the version jump — the jump itself carries no compatibility signal, this once.

## Try it

Clone `kairos-io/kairos`, and `agent/`, `immucore/`, `sdk/`, `kairos-init/`, and `kcrypt/` are all right there, building from the same `go.mod`. If something looks wrong, the tracking issue is [#4301](https://github.com/kairos-io/kairos/issues/4301) and the pipeline work is ongoing in the open — come poke at it.
