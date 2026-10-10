---
title: Toolchain information
sidebar_position: 99
---


# Hadron Toolchain Image

Hadron provides a **toolchain container image** (`ghcr.io/kairos-io/hadron-toolchain:<tag>`) intended to be the *canonical*, reproducible build environment for extending Hadron.




In practice, the toolchain image is a ready-to-use SDK that contains:

- A **musl-based cross toolchain** (built via *mussel*) and the build metadata Hadron uses (target triple, flags).
- A curated set of build utilities (autotools, cmake, pkg-config, python, make, binutils, etc.).
- Kernel “misc” metadata (version/config) to enable building kernel-adjacent artifacts (e.g., out-of-tree modules) that must match Hadron’s shipped kernel.

This is the image you should use in examples and downstream extensions when you need to:
- compile software from source for Hadron,
- ensure consistent flags/LTO/size optimizations,
- build kernel modules against the exact kernel config/version that Hadron ships.

:::info Version pinning
kernel modules and some low-level integrations must match the *exact* kernel release/config Hadron ships. The NVIDIA example explicitly calls this out (see `examples/add-packages/Dockerfile.nvidia`).
:::

---

## What’s inside the toolchain (high-level)

The toolchain image contains, at minimum:

### Compiler + core toolchain
- GCC toolchain
- binutils
- musl headers/runtime pieces needed for building
- make

### Build systems and helpers (selected highlights)
- `bash`
- autotools: `autoconf`, `automake`, `m4`, `libtool`-adjacent support
- `cmake`
- `pkg-config`
- `python`
- `perl`
- compression / archiving: `xz`, `gzip`, `zstd`, etc.
- system-level helpers used by many builds: `coreutils`, `findutils`, `diffutils`, `gawk`, `sed`
- networking / fetching: `curl`, CA certs
- file sync: `rsync`
- kernel-adjacent tools: `kmod` (useful for module-related workflows)

### Kernel build metadata (important for module builds)
The toolchain includes `/usr/share/kernel-misc` copied from the `kernel-misc` stage:

- `/usr/share/kernel-misc/kernel-version` with the kernel version string (e.g., `6.19.2`)
- `/usr/share/kernel-misc/kernel-release` with the kernel release string (e.g., `6.19.2-hadron`)
- `/usr/share/kernel-misc/kernel-config` with the kernel config used to build Hadron’s kernel
- `/usr/share/kernel-misc/Module.symvers` with the exported symbols from Hadron’s kernel build (constructed as part of the build workflow)

This is used by examples to download the correct upstream kernel sources and prepare them for external module builds.
In the case of `Module.symvers`, this is needed to ensure the correct symbol versions are used when building against Hadron’s kernel, very useful for out-of-tree modules like NVIDIA’s driver.

---

## Default environment variables exported by the toolchain

The `toolchain` stage sets the following defaults:

### Targeting / triplets
- `VENDOR="hadron"`
- `ARCH="x86-64"`
- `BUILD_ARCH="x86_64"`
- `TARGET=${BUILD_ARCH}-${VENDOR}-linux-musl`
- `BUILD=${BUILD_ARCH}-pc-linux-musl`

These are used to consistently drive autotools/cmake/meson builds for Hadron’s musl target.

### Configure defaults (autotools)
- `COMMON_CONFIGURE_ARGS="--quiet --prefix=/usr --host=${TARGET} --build=${BUILD} --enable-lto --enable-shared --disable-static"`

Use this when invoking `./configure` to standardize:
- prefix (`/usr`)
- host/build triplets
- LTO and shared builds
- avoids static-by-default output

### Size/LTO defaults
- `CFLAGS="-Os -pipe -fomit-frame-pointer -fno-unroll-loops -fno-asynchronous-unwind-tables -ffunction-sections -fdata-sections -flto=auto"`
- `LDFLAGS="-Wl,--gc-sections -Wl,--as-needed -flto=auto"`

These are tuned for:
- small binaries (`-Os`, section GC)
- reasonable runtime linking behavior (`--as-needed`)
- LTO where supported (`-flto=auto`)

### Binutils wrappers for LTO
- `AR="gcc-ar"`
- `NM="gcc-nm"`
- `RANLIB="gcc-ranlib"`

These ensure binutils tooling cooperates with LTO objects.

### Misc build helpers
- `M4="/usr/bin/m4"`
- `COMMON_MESON_FLAGS="--prefix=/usr --libdir=lib --buildtype=minsize -Dstrip=true"`

Use `$COMMON_MESON_FLAGS` when invoking `meson setup` to standardize prefix, libdir, and size optimizations.

### Convenience links + runtime quirks handled
The toolchain stage also:
- links `/bin/sh -> /bin/bash`
- links `/usr/bin/cc -> /usr/bin/gcc`
- ensures `/tmp` exists
- writes a minimal `/etc/passwd` so builds that query user info don’t fail

This are all compatibility helpers to avoid common build failures and ensure a smooth experience when using the toolchain image as a build environment.

---

## Recommended extension pattern (used by the examples)

The examples under `examples/add-packages/` follow a consistent approach:

1. **Builder stage** based on the toolchain image:
    - `FROM ghcr.io/kairos-io/hadron-toolchain:<tag> AS builder`
2. Build and install into a **staging root**:
    - `DESTDIR=/output make install ...`
3. Export results in one of two ways:
    - **Scratch “payload” image**:
        - `FROM scratch AS default`
        - `COPY --from=builder /output/ /`
    - **Layered Hadron extension image**:
        - `FROM ghcr.io/kairos-io/hadron:<tag> AS hadron-extension`
        - `COPY --from=builder /output/ /`

This keeps build-time dependencies out of the final artifact and makes it easy to:
- use the result as a layer in another image, or keep your layer versioned in a remote registry
- feed `/output` into sysext tooling (e.g., via Auroraboot) depending on your deployment model.

---

## Practical tips

- **Pin toolchain tag to the Hadron tag you extend**.
    - If you extend `ghcr.io/kairos-io/hadron:vX.Y.Z`, prefer `ghcr.io/kairos-io/hadron-toolchain:vX.Y.Z`.
- If you build **kernel modules**, always use:
    - `/usr/share/kernel-misc/kernel-release`
    - `/usr/share/kernel-misc/kernel-config`
    - `/usr/share/kernel-misc/Module.symvers` (as provided/constructed by your workflow)

The NVIDIA example demonstrates a robust module build flow using these inputs.