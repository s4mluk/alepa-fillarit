#!/usr/bin/env bash
# PostToolUse-hook: kun js/*.js muuttuu, aja syntaksitarkistus ja testit automaattisesti.
# Exit 2 + virhe stderriin estää muutoksen etenemisen jos jokin on rikki.
set -uo pipefail
file=$(python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null) || exit 0
case "$file" in
  */js/*.js) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}"

# 1) Syntaksi
if ! err=$(node --check "$file" 2>&1); then
  echo "node --check epäonnistui ($file):" >&2
  echo "$err" >&2
  exit 2
fi

# 2) Testit (jos test/-kansiossa on testitiedostoja)
if compgen -G "test/*.test.js" > /dev/null; then
  if ! out=$(node --test test/*.test.js 2>&1); then
    echo "Testit epäonnistuivat (node --test test/*.test.js):" >&2
    echo "$out" | tail -n 25 >&2
    exit 2
  fi
fi
exit 0
