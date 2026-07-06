#!/usr/bin/env bash
# PostToolUse-hook: muistuta cache-bumpista kun sovelluskuoren tiedosto muuttuu.
# Hiljainen heti kun sw.js:n CACHE eroaa HEAD:ista.
set -uo pipefail
file=$(python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null) || exit 0
case "$file" in
  */index.html|*/css/*.css|*/js/*.js|*/manifest.webmanifest) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}"
head_cache=$(git show HEAD:sw.js 2>/dev/null | grep -m1 'const CACHE') || exit 0
cur_cache=$(grep -m1 'const CACHE' sw.js) || exit 0
if [ "$head_cache" = "$cur_cache" ]; then
  echo "Shell asset changed but sw.js CACHE is unbumped — run scripts/bump-sw.sh before committing." >&2
  exit 2
fi
exit 0
