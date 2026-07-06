#!/usr/bin/env bash
# Bumppaa service workerin cache-version, jotta palaavat käyttäjät saavat uuden kuoren.
set -euo pipefail
cd "$(dirname "$0")/.."
new="alepa-fillarit-$(date +%Y%m%d%H%M)"
sed -i '' -E "s/^const CACHE = \"[^\"]*\";/const CACHE = \"$new\";/" sw.js
echo "sw.js CACHE -> $new"
