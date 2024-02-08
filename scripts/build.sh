#!/bin/bash
set -e

BASE_URL="${BASE_URL:-https://kairos.io}"
root_dir="${ROOT_DIR:-$(pwd)}"

binpath="${root_dir}/bin"
publicpath="${root_dir}/public"
export PATH=$PATH:$binpath

if [ -z "$(type -P hugo)" ];
then
    [[ ! -d "${binpath}" ]] && mkdir -p "${binpath}"
    wget https://github.com/gohugoio/hugo/releases/download/v"${HUGO_VERSION}"/hugo_extended_"${HUGO_VERSION}"_"${HUGO_PLATFORM}".tar.gz -O "$binpath"/hugo.tar.gz
    tar -xvf "$binpath"/hugo.tar.gz -C "${binpath}"
    rm -rf "$binpath"/hugo.tar.gz
    chmod +x "$binpath"/hugo
fi

rm -rf "${publicpath}" || true
[[ ! -d "${publicpath}" ]] && mkdir -p "${publicpath}"

npm install --save-dev autoprefixer postcss-cli postcss

hugo mod get
hugo mod graph
HUGO_ENV="production" hugo --buildFuture --gc -b "${BASE_URL}" -d "${publicpath}"

cp -rf CNAME "${publicpath}"
