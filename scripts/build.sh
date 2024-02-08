#!/bin/bash
set -x
set -e

BASE_URL="${BASE_URL:-https://kairos.io}"
root_dir="${ROOT_DIR:-$(pwd)}"

binpath="${root_dir}/bin"
publicpath="${root_dir}/public"
current_branch="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
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

# list all branches to debug
git fetch
git branch
# get all release branches
releases=$(git branch | grep -E 'release_v[0-9]+\.[0-9]+\.[0-0]+.?')
# build each release branch under public/vX.Y.Z
for release in $releases; do
    # remove the release_ prefix
    version=$(echo $release | sed 's/release_//')
    git checkout $release
    hugo mod get
    hugo mod graph
    HUGO_ENV="production" hugo --buildFuture --gc -b "${BASE_URL}/$version" -d "${publicpath}/$version"
done

# build the main branch under public
git checkout $current_branch
hugo mod get
hugo mod graph
HUGO_ENV="production" hugo --buildFuture --gc -b "${BASE_URL}" -d "${publicpath}"

cp -rf CNAME "${publicpath}"

set +x