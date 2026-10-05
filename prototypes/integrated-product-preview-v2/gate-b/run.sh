#!/usr/bin/env bash
set -euo pipefail
repo_root=$(git rev-parse --show-toplevel)
node --version
python3 --version
module_root=${CHOPDOT_TEST_NODE_MODULES:-$repo_root/node_modules}
if [[ ! -d "$module_root/playwright" ]]; then
  echo 'Missing Playwright. Install playwright@1.62.1 in a separate tools directory, install its Chromium, and set CHOPDOT_TEST_NODE_MODULES to that node_modules path.' >&2
  exit 2
fi
module_root=$(cd "$module_root" && pwd -P)
scratch_root=$(mktemp -d "${TMPDIR:-/tmp}/chopdot-gate-b-run.XXXXXX")
output_root=${CHOPDOT_EVIDENCE_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/chopdot-gate-b-evidence.XXXXXX")}
mkdir -p "$output_root"
output_root=$(cd "$output_root" && pwd -P)
trap 'rm -rf -- "$scratch_root"' EXIT
mkdir "$scratch_root/source"
git -C "$repo_root" archive HEAD | tar -x -C "$scratch_root/source"
ln -s "$module_root" "$scratch_root/source/node_modules"
cd "$scratch_root/source"
suite=prototypes/integrated-product-preview-v2/gate-b
printf '%s\n' "$(git -C "$repo_root" rev-parse HEAD)" > "$output_root/implementation-sha.txt"
run_logged() {
  local label=$1
  shift
  printf '%q ' "$@" >> "$output_root/commands.log"
  printf '\n' >> "$output_root/commands.log"
  set +e
  "$@" > "$output_root/$label.log" 2>&1
  local code=$?
  set -e
  printf 'exit=%s\n' "$code" >> "$output_root/commands.log"
  cat "$output_root/$label.log"
  if [[ $code -ne 0 ]]; then exit "$code"; fi
}
run_logged model node --test "$suite/model.test.mjs"
export CHOPDOT_PROPERTY_REPORT="$output_root/property-results.json"
run_logged generated-properties node --test "$suite/property.test.mjs"
run_logged source-integrity node "$suite/verify-sources.mjs"
run_logged gate-a-structure node prototypes/integrated-product-preview-v2/validate.mjs
run_logged package node scripts/package-preview-v2-gate-b.mjs "$scratch_root/preview"
export PREVIEW_ROOT="$scratch_root/preview"
for test_name in browser-qa recovery-browser-qa keyboard-qa visual-qa run-gate-a; do
  export EVIDENCE_DIR="$output_root/$test_name"
  run_logged "$test_name" node "$suite/$test_name.mjs"
done
cp -R prototypes/integrated-product-preview-v2/artifacts "$output_root/gate-a-artifacts"
printf 'Evidence: %s\n' "$output_root"
