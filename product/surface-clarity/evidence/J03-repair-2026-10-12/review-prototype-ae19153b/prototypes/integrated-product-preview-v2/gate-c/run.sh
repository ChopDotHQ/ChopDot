#!/usr/bin/env bash
set -euo pipefail
repo_root=$(git rev-parse --show-toplevel)
module_root=${CHOPDOT_TEST_NODE_MODULES:-$repo_root/node_modules}
if [[ ! -d "$module_root/playwright" ]]; then
  echo 'Requires Node24+, Python3, Playwright1.62.1 and Chromium. Set CHOPDOT_TEST_NODE_MODULES to a separate installed node_modules and optionally CHOPDOT_CHROMIUM_EXECUTABLE.' >&2
  exit 2
fi
module_root=$(cd "$module_root" && pwd -P)
scratch_root=$(mktemp -d "${TMPDIR:-/tmp}/chopdot-gate-c-run.XXXXXX")
output_root=${CHOPDOT_EVIDENCE_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/chopdot-gate-c-evidence.XXXXXX")}
mkdir -p "$output_root"
output_root=$(cd "$output_root" && pwd -P)
trap 'rm -rf -- "$scratch_root"' EXIT
mkdir "$scratch_root/source"
git -C "$repo_root" archive HEAD | tar -x -C "$scratch_root/source"
ln -s "$module_root" "$scratch_root/source/node_modules"
git -C "$repo_root" rev-parse HEAD HEAD^{tree} > "$output_root/implementation.txt"
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
run_logged node-version node --version
run_logged python-version python3 --version
run_logged playwright-version node -p "require('$module_root/playwright/package.json').version"
# Retain the accepted complete Gate A/B test chain without changing its denominator.
CHOPDOT_EVIDENCE_DIR="$output_root/gate-ab" CHOPDOT_TEST_NODE_MODULES="$module_root" run_logged gate-ab bash "$repo_root/prototypes/integrated-product-preview-v2/gate-b/run.sh"
cd "$scratch_root/source"
suite=prototypes/integrated-product-preview-v2/gate-c
run_logged model node "$suite/model.test.mjs"
run_logged sources node "$suite/verify-sources.mjs"
run_logged package node scripts/package-preview-v2-gate-b.mjs "$scratch_root/preview"
run_logged package-repeat node scripts/package-preview-v2-gate-b.mjs "$scratch_root/preview-repeat"
run_logged deterministic diff -qr "$scratch_root/preview" "$scratch_root/preview-repeat"
export PREVIEW_ROOT="$scratch_root/preview"
for test_name in browser-qa recovery-qa visual-qa; do
  export EVIDENCE_DIR="$output_root/$test_name"
  run_logged "$test_name" node "$suite/$test_name.mjs"
done
printf 'Evidence: %s\n' "$output_root"
