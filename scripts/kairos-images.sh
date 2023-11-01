#!/bin/bash

cleanup() {
    popd
    echo "deleting $workDir"
    rm -rf $workDir
}
workDir=$(mktemp -d)
trap "cleanup" EXIT

pushd $workDir > /dev/null

if [ -z "$KAIROS_VERSION" ]; then
    echo 'KAIROS_VERSION must be defined'
    return
fi

curl -s https://raw.githubusercontent.com/kairos-io/kairos/master/.github/flavors.json -o flavors.json
curl -s https://raw.githubusercontent.com/kairos-io/kairos/master/naming.sh -o naming.sh
chmod +x naming.sh

echo "<ul>"
cat flavors.json | jq -c '.[]' |
while IFS=$"\n" read -r c; do
    FAMILY=$(echo "$c" | jq -r '.family') && export FAMILY
    FLAVOR=$(echo "$c" | jq -r '.flavor') && export FLAVOR
    FLAVOR_RELEASE=$(echo "$c" | jq -r '.flavorRelease') && export FLAVOR_RELEASE
    VARIANT=$(echo "$c" | jq -r '.variant') && export VARIANT
    TARGETARCH=$(echo "$c" | jq -r '.arch') && export TARGETARCH
    MODEL=$(echo "$c" | jq -r '.model') && export MODEL
    REGISTRY_AND_ORG=quay.io/kairos && export REGISTRY_AND_ORG
    printf "<li>$(./naming.sh container_artifact_name)</li>\n"
done | sort
echo "</ul>"
