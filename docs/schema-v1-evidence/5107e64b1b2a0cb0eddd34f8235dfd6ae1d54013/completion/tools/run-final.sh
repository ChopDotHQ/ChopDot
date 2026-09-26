#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# Git, Node 22 and Python 3 + PyYAML required. --out must name a NEW directory.
# --repo defaults to the authorized canonical HTTPS repository; a local clone is read-only.
exec python3 "$HERE/runner.py" "$@"
