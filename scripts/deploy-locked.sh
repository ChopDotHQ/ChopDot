#!/bin/sh
set -eu

node_bin=$(command -v node)
if [ -z "$node_bin" ]; then
  echo "Locked deployment requires Node.js on PATH." >&2
  exit 1
fi

unset NODE_OPTIONS NODE_PATH
export CHOPDOT_LOCKED_SHELL=1
script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
exec "$node_bin" "$script_dir/run-locked-polkadot-app-deploy.mjs" "$@"
