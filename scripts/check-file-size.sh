#!/usr/bin/env bash
# Fail if any src/ TypeScript file exceeds the line limit.
# Usage: ./scripts/check-file-size.sh [max_lines]
set -euo pipefail

MAX_LINES="${1:-400}"
EXIT_CODE=0

while IFS= read -r f; do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "FAIL: $f has $lines lines (max $MAX_LINES)"
    EXIT_CODE=1
  fi
done < <(find src -type f \( -name '*.ts' -o -name '*.tsx' \) ! -path '*/node_modules/*')

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "OK: All files are within the $MAX_LINES-line limit."
fi

exit $EXIT_CODE
