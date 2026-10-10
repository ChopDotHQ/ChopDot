#!/usr/bin/env bash
set -euo pipefail
# Run from an existing repository containing this evidence commit. Read-only:
# no checkout/reset/clean, dependency installation, browser-data reset or auth.
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
out="$(mktemp -d "${TMPDIR:-/tmp}/chopdot-j01-results.XXXXXX")"
cd "$root"
command -v node >/dev/null
command -v git >/dev/null
git cat-file -e 5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013^{commit}
git cat-file -e 4ba456e6595330e4ca8e21366e0d827f17e10881^{commit}
run() {
  local id="$1"; shift
  printf '%q ' "$@" > "$out/$id.log"
  printf '\n' >> "$out/$id.log"
  set +e
  "$@" >> "$out/$id.log" 2>&1
  local code=$?
  set -e
  printf '\nexit_code=%s\n' "$code" >> "$out/$id.log"
  printf '%s: %s\n' "$id" "$code"
  return "$code"
}
run versions node --version
run j01-model node prototypes/experience-workbench/journeys/01-enter-chopdot/source/test-model.cjs
run j01-subject-binding node prototypes/experience-workbench/journeys/01-enter-chopdot/source/test-subject-binding.cjs
run framework-regressions node --test scripts/surface-clarity.test.mjs
run framework-check node scripts/surface-clarity.mjs check
if run framework-ready node scripts/surface-clarity.mjs ready; then
  echo 'Readiness changed: inspect the result before treating this historical audit as current.'
else
  code=$?
  test "$code" = 2 # INCOMPLETE is the expected honest result for this audit.
fi
echo "Logs retained at $out. Remove only that directory when no longer needed."
echo 'This replays model/bookkeeping checks. Browser replay steps are in results.json; screenshots are historical captured evidence.'
