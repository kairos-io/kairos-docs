#!/bin/bash
set -x
set -e

BASE_URL="${BASE_URL:-https://kairos.io}"
root_dir="${ROOT_DIR:-$(pwd)}"

binpath="${root_dir}/bin"
publicpath="${root_dir}/public"
current_commit="${COMMIT_REF:-$(git rev-parse --abbrev-ref HEAD)}"

# Function to update the menu
update_menu() {
    echo "Updating hugo.toml menu..."
    # check if the script exist locally otherwise download it from main
    if [ ! -f "${root_dir}/scripts/build-menu.sh" ]; then
        echo "build-menu.sh not found locally, fetching from main"
        git fetch --no-recurse-submodules origin main
        git show origin/main:scripts/build-menu.sh > "${root_dir}/scripts/build-menu.sh"
        chmod +x "${root_dir}/scripts/build-menu.sh"
    fi

    # check if utils.sh exists locally and if not, fetch from main
    if [ ! -f "${root_dir}/scripts/utils.sh" ]; then
        echo "utils.sh not found locally, fetching from main"
        git fetch --no-recurse-submodules origin main
        git show origin/main:scripts/utils.sh > "${root_dir}/scripts/utils.sh"
        chmod +x "${root_dir}/scripts/utils.sh"
    fi

    # run the script
    "${root_dir}/scripts/build-menu.sh"
}

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

# Source the utils file
source "${root_dir}/scripts/utils.sh"

# Get latest release branches and sort them from newest to oldest
echo "Fetching releases..."
releases=$(fetch_latest_releases | sort -Vr)
echo "Found releases: $releases"

# build each release branch under public/vX.Y.Z
for release in $releases; do
    # remove the prefix
    version=$(echo $release | sed 's/origin\/release\///')
    echo "Building version: $version"
    if [[ -n $(git ls-files --others --exclude-standard "${root_dir}/scripts") ]]; then
        git clean -fd -- "${root_dir}/scripts"
    fi
    git checkout go.sum go.mod package.json package-lock.json
    git checkout $release
    hugo mod get
    hugo mod graph
    update_menu
    # remove the blog and community directories
    rm -rf "content/en/blog"
    rm -rf "content/en/community"
    rm -rf "content/en/getting-started"
    # append the main getting started, blog and community links to hugo.toml
    echo "[[menu.main]]" >> "hugo.toml"
    echo "  name = \"Getting Started\"" >> "hugo.toml"
    echo "  weight = 10" >> "hugo.toml"
    echo "  url = \"https://kairos.io/getting-started/\"" >> "hugo.toml"
    echo "" >> "hugo.toml"
    echo "[[menu.main]]" >> "hugo.toml"
    echo "  name = \"Community\"" >> "hugo.toml"
    echo "  weight = 40" >> "hugo.toml"
    echo "  url = \"https://kairos.io/community/\"" >> "hugo.toml"
    echo "" >> "hugo.toml"
    echo "[[menu.main]]" >> "hugo.toml"
    echo "  name = \"Blog\"" >> "hugo.toml"
    echo "  weight = 50" >> "hugo.toml"
    echo "  url = \"https://kairos.io/blog/\"" >> "hugo.toml"
    echo "" >> "hugo.toml"

    HUGO_ENV="${CONTEXT}" hugo --buildFuture --minify --gc -b "${BASE_URL}/$version" -d "${publicpath}/$version"
    
    # restore files, and do not fail if the files are not found
    git restore go.sum go.mod package.json package-lock.json hugo.toml content/en/blog content/en/community
    git restore content/en/getting-started || true
done

if [[ -n $(git ls-files --others --exclude-standard "${root_dir}/scripts") ]]; then
    git clean -fd -- "${root_dir}/scripts"
fi
# build the main branch under public
git checkout $current_commit
hugo mod get
hugo mod graph
# CONTEXT is set by netlify
update_menu
HUGO_ENV="${CONTEXT}" hugo --buildFuture --minify --gc -b "${BASE_URL}" -d "${publicpath}"

cp -rf CNAME "${publicpath}"

set +x
