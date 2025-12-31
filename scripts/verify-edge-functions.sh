#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v rg >/dev/null 2>&1; then
  echo "rg is required for this script."
  exit 1
fi

mapfile -t functions < <(rg -o "functions/v1/[a-z0-9-]+" src -g "*.ts" -g "*.tsx" | sed 's#.*/##' | sort -u)

if [ ${#functions[@]} -eq 0 ]; then
  echo "No edge functions referenced in src."
  exit 0
fi

missing=()
for fn in "${functions[@]}"; do
  if [ ! -f "supabase/functions/${fn}/index.ts" ]; then
    missing+=("${fn}")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "Missing edge function sources:"
  for fn in "${missing[@]}"; do
    echo "- supabase/functions/${fn}/index.ts"
  done
  echo "Fix: add sources or remove unused endpoints."
  exit 1
fi

echo "Edge function sources present:"
printf ' - %s\n' "${functions[@]}"
