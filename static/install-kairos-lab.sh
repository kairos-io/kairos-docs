#!/bin/sh
set -eu

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

TAG="$(curl -fsSL https://api.github.com/repos/kairos-io/kairos-lab/releases/latest | grep '"tag_name"' | cut -d '"' -f 4)"
VERSION="${TAG#v}"
TMP="$(mktemp -d)"

curl -fL "https://github.com/kairos-io/kairos-lab/releases/download/${TAG}/kairos-lab_${VERSION}_linux_${ARCH}.tar.gz" -o "$TMP/kairos-lab.tar.gz"
tar -xzf "$TMP/kairos-lab.tar.gz" -C "$TMP"
sudo install -m 0755 "$TMP/kairos-lab" /usr/local/bin/kairos-lab
rm -rf "$TMP"
