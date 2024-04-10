# :book: Kairos documentation

The Kairos documentation uses [docsy](https://docsy.dev).

## Prerequisites

The following software is needed to preview the documentation changes locally.

* Hugo [v0.115.0](https://gohugo.io/installation/) (make sure to use the extended version!)
* nodeJs [v16+](https://nodejs.org/en/download/)

## Test your changes

After cloning the repo (with submodules), just run `make serve` to test the website locally.

```
$> git clone https://github.com/kairos-io/kairos-docs
$> cd kairos-docs
$> make serve
```

To run the website locally in other platforms, e.g. MacOS:

```
$> HUGO_PLATFORM=macOS-64bit make serve
```

**Note**: If the `make serve` command does not work for you, try to start hugo directly with the command `hugo server -D`.
