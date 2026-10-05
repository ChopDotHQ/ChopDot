#!/usr/bin/env bash
set -euo pipefail
# Read-only; uses its packaged files. No checkout reset/clean or dependency install.
checkpoint_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
command -v node >/dev/null || { echo 'Missing prerequisite: Node.js 20 or newer' >&2; exit 127; }
node -e 'if(Number(process.versions.node.split(".")[0])<20)process.exit(1)' || {
  echo 'Missing prerequisite: Node.js 20 or newer' >&2; exit 127;
}
printf 'Command: node %s/reproduce.mjs\n' "$checkpoint_dir" >&2
set +e
node "$checkpoint_dir/reproduce.mjs"
checkpoint_exit=$?
set -e
printf 'Exit code: %s\n' "$checkpoint_exit" >&2
exit "$checkpoint_exit"
