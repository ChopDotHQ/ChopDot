#!/usr/bin/env bash
set -euo pipefail
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
deps=${CHOPDOT_TEST_NODE_MODULES:-"$repo/node_modules"}
if [[ ! -f "$deps/playwright/package.json" ]]; then
  echo 'Missing prerequisite: Playwright in CHOPDOT_TEST_NODE_MODULES, with an installed Chromium or CHOPDOT_CHROMIUM_EXECUTABLE.' >&2
  exit 3
fi
deps=$(realpath "$deps")
root=$(mktemp -d "${TMPDIR:-/tmp}/chopdot-j01-repair.XXXXXXXX")
mkdir -p "$root/source" "$root/evidence"
trap 'if [[ "${KEEP_J01_WORK:-0}" != 1 ]]; then rm -rf -- "$root/source" "$root/preview"; fi' EXIT
git -C "$repo" archive HEAD | tar -x -C "$root/source"
ln -s "$deps" "$root/source/node_modules"
gitdir=$(git -C "$repo" rev-parse --absolute-git-dir)
printf 'gitdir: %s\n' "$gitdir" > "$root/source/.git"
cd "$root/source"
printf 'Evidence directory: %s\n' "$root/evidence"
printf 'base_sha=%s\nbase_tree=%s\nnode=%s\n' "$(git rev-parse HEAD)" "$(git rev-parse HEAD^{tree})" "$(node --version)" > "$root/evidence/version.txt"
run() {
  local name=$1; shift
  printf '%q ' "$@" >> "$root/evidence/commands.txt"; printf '\n' >> "$root/evidence/commands.txt"
  set +e
  "$@" > "$root/evidence/$name.log" 2>&1
  local code=$?
  set -e
  printf '%s exit=%s\n' "$name" "$code" | tee -a "$root/evidence/commands.txt"
  if [[ "$code" != 0 ]]; then tail -50 "$root/evidence/$name.log"; return "$code"; fi
}
run package node scripts/package-preview-v2-gate-b.mjs "$root/preview"
export PREVIEW_ROOT="$root/preview"
run model node prototypes/experience-workbench/journeys/01-enter-chopdot/source/test-model.cjs
run subject-binding node prototypes/experience-workbench/journeys/01-enter-chopdot/source/test-subject-binding.cjs
run framework-tests node --test scripts/surface-clarity.test.mjs
export EVIDENCE_DIR="$root/evidence/j01"
run j01-browser node prototypes/integrated-product-preview-v2/j01-browser-qa.mjs
export EVIDENCE_DIR="$root/evidence/gate-a"
run gate-a node prototypes/integrated-product-preview-v2/gate-b/run-gate-a.mjs
export EVIDENCE_DIR="$root/evidence/create-join"
run create-join node prototypes/integrated-product-preview-v2/create-join/browser-qa.mjs
export EVIDENCE_DIR="$root/evidence/create-join-recovery"
run create-join-recovery node prototypes/integrated-product-preview-v2/create-join/recovery-qa.mjs
export EVIDENCE_DIR="$root/evidence/gate-d-recovery"
run gate-d-recovery node prototypes/integrated-product-preview-v2/gate-d/recovery-qa.mjs
# The old live review records must be invalidated by these changed runtime bytes.
# A nonzero check is expected here; no baseline/readiness bindings are reset.
set +e
node scripts/surface-clarity.mjs check > "$root/evidence/clarity-stale.log" 2>&1
clarity_code=$?
set -e
printf 'clarity-stale exit=%s (expected stale)\n' "$clarity_code" >> "$root/evidence/commands.txt"
if [[ "$clarity_code" != 1 ]] || ! grep -q 'stale runtime' "$root/evidence/clarity-stale.log"; then
  echo 'Old clarity evidence was unexpectedly accepted or checker failed for another reason.' >&2
  exit 1
fi
echo "Local engineering checks passed; existing Surface Clarity records remain stale/incomplete. Evidence: $root/evidence"
