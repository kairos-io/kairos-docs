#!/bin/bash
set -x
set -e

BASE_URL="${BASE_URL:-https://kairos.io}"
root_dir="${ROOT_DIR:-$(pwd)}"

binpath="${root_dir}/bin"
publicpath="${root_dir}/public"
current_commit="${COMMIT_REF:-$(git rev-parse --abbrev-ref HEAD)}"
if [ "$BRANCH" = "main" ]; then
  environment="production"
else
  environment="staging"
fi

# Output the result
echo "Branch: $BRANCH"
echo "Environment: $environment"
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
git fetch --no-recurse-submodules origin '+refs/heads/v*:refs/remotes/origin/*'
# get all release branches
releases=$(git branch -r | sed -n '/origin\/v[0-9]\+\(\.[0-9]\+\)\{2\}/p')
# build each release branch under public/vX.Y.Z
for release in $releases; do
    # remove the release_ prefix
    version=$(echo $release | sed 's/origin\///')
    git checkout go.sum go.mod package.json package-lock.json
    git checkout $release
    hugo mod get
    hugo mod graph
    HUGO_ENV="production" hugo --buildFuture --gc -b "${BASE_URL}/$version" -d "${publicpath}/$version"
done

git checkout go.sum go.mod package.json package-lock.json
# build the main branch under public
git checkout $current_commit
hugo mod get
hugo mod graph
HUGO_ENV="production" hugo --buildFuture --minify --gc -b "${BASE_URL}" -d "${publicpath}"

cp -rf CNAME "${publicpath}"

set +x
