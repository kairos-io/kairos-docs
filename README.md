# :book: Kairos documentation

The Kairos documentation uses [docsy](https://docsy.dev).

> **Found a bug, or want to request a feature?** Open it on
> [kairos-io/kairos](https://github.com/kairos-io/kairos/issues), including
> issues about this repository. Every Kairos issue lives in one place, so you
> never have to work out which repository to file against.

## Prerequisites

The following software is needed to preview the documentation changes locally.

* Hugo [v0.105.0+](https://gohugo.io/installation/)
* nodeJs [v16+](https://nodejs.org/en/download/)

## Test your changes

After cloning the repo (with submodules), just run `make serve` to test the website locally.

```
$> git clone --recurse-submodule https://github.com/kairos-io/kairos-docs
$> cd kairos-docs
$> npm run prepare
$> make serve
```

If you have a local copy already checked out, sync the submodules:

```
$> git submodule update --init --recursive --depth 1
```

To run the website locally in other platforms, e.g. MacOS:

```
$> HUGO_PLATFORM=macOS-64bit make serve
```

**Note**: If the `make serve` command does not work for you, try to start hugo directly with the command `hugo server -D`.
