#!/bin/bash
location=${1:-public}

find "$location" -type f -name "*.xml" -exec test -e {} \; -exec rm -f {} +
find "$location" -type f -name "swagger-ui*" -exec test -e {} \; -exec rm -f {} +
rm -rf "$location"/blog