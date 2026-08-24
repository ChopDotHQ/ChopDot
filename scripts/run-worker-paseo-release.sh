#!/bin/sh
set -eu

node_bin=$(command -v node)
if [ -z "$node_bin" ]; then
  echo "Worker Paseo release requires Node.js on PATH." >&2
  exit 1
fi

unset NODE_OPTIONS NODE_PATH PAD_ENV_FILE
export CHOPDOT_WORKER_RELEASE_SHELL=1
script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
exec "$node_bin" "$script_dir/run-worker-paseo-release.mjs" "$@"
