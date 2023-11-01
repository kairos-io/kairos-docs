#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cleanup() {
    popd > /dev/null
    rm -rf $workDir
}
workDir=$(mktemp -d)
trap "cleanup" EXIT

pushd $workDir > /dev/null

curl -s https://raw.githubusercontent.com/kairos-io/kairos/master/.github/flavors.json -o flavors.json
curl -s https://raw.githubusercontent.com/kairos-io/kairos/master/naming.sh -o naming.sh
chmod +x naming.sh

KAIROS_VERSION=$(cat $SCRIPT_DIR/../hugo.toml | grep kairos_version | sed 's/kairos_version[[:space:]]=[[:space:]]//g' | sed 's/"//g') && export KAIROS_VERSION

cat flavors.json | jq -crM 'group_by(.flavor) | map({ flavor: .[0].flavor, variants: map(.)}) | .[]' |
while IFS=$"\n" read -r c; do
    echo "<table>"
    FLAVOR=$(echo "$c" | jq -r '.flavor') && export FLAVOR
    echo "<tr><th>$FLAVOR</th></tr>"
    echo "$c" | jq -crM '.variants | .[]' |
    while IFS=$"\n" read -r b; do
        FAMILY=$(echo "$b" | jq -r '.family') && export FAMILY
        FLAVOR_RELEASE=$(echo "$b" | jq -r '.flavorRelease') && export FLAVOR_RELEASE
        VARIANT=$(echo "$b" | jq -r '.variant') && export VARIANT
        TARGETARCH=$(echo "$b" | jq -r '.arch') && export TARGETARCH
        MODEL=$(echo "$b" | jq -r '.model') && export MODEL
        REGISTRY_AND_ORG=quay.io/kairos && export REGISTRY_AND_ORG
        printf "<tr><td>$(./naming.sh container_artifact_name)</td></tr>\n"
    done | sort
    echo "</table>"
done
