#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_DIR="$ROOT_DIR/.knowns/tasks"

INCLUDE_PARENT=false
if [[ "${1:-}" == "--include-parent" ]]; then
  INCLUDE_PARENT=true
fi

ordered_ids=("lyszqz" "gmdsnh" "wcf5oh" "xg6138" "jqhbhk")

if [[ "$INCLUDE_PARENT" == true ]]; then
  ordered_ids+=("5wd7dc")
fi

task_name_for_id() {
  case "$1" in
    lyszqz) echo "Agent A: Navigation and entry-point wiring" ;;
    gmdsnh) echo "Agent B: Pot lifecycle handler wiring" ;;
    wcf5oh) echo "Agent C: You-tab action hardening" ;;
    xg6138) echo "Agent D: QR, checkpoint, and settlement export" ;;
    jqhbhk) echo "Agent E: QA and analytics verification gate" ;;
    5wd7dc) echo "Parent: MVP 12-item multi-agent execution" ;;
    *) echo "Unknown task" ;;
  esac
}

find_task_file() {
  local task_id="$1"
  local matches=()
  while IFS= read -r line; do
    matches+=("$line")
  done < <(find "$TASK_DIR" -maxdepth 1 -type f -name "task-${task_id}*" | sort)

  if [[ ${#matches[@]} -eq 0 ]]; then
    return 1
  fi

  printf "%s\n" "${matches[0]}"
}

parse_status() {
  local file="$1"
  awk -F': ' '/^status:/{gsub(/\047/, "", $2); print $2; exit}' "$file"
}

count_ac_total() {
  local file="$1"
  awk '/<!-- AC:BEGIN -->/{in_ac=1; next} /<!-- AC:END -->/{in_ac=0} in_ac' "$file" \
    | grep -E '^- \[[ xX]\]' -c || true
}

count_ac_done() {
  local file="$1"
  awk '/<!-- AC:BEGIN -->/{in_ac=1; next} /<!-- AC:END -->/{in_ac=0} in_ac' "$file" \
    | grep -E '^- \[[xX]\]' -c || true
}

printf "\n%-8s | %-52s | %-11s | %-8s | %-7s\n" "Task ID" "Name" "Status" "AC Done" "Result"
printf "%-8s-+-%-52s-+-%-11s-+-%-8s-+-%-7s\n" "--------" "----------------------------------------------------" "-----------" "--------" "-------"

pass_count=0
fail_count=0
missing_count=0

for task_id in "${ordered_ids[@]}"; do
  task_name="$(task_name_for_id "$task_id")"
  if ! file="$(find_task_file "$task_id")"; then
    printf "%-8s | %-52s | %-11s | %-8s | %-7s\n" "$task_id" "$task_name" "MISSING" "-" "FAIL"
    ((missing_count+=1))
    ((fail_count+=1))
    continue
  fi

  status="$(parse_status "$file")"
  ac_total="$(count_ac_total "$file")"
  ac_done="$(count_ac_done "$file")"
  ac_open=$((ac_total - ac_done))

  if [[ "$status" == "done" && "$ac_open" -eq 0 ]]; then
    result="PASS"
    ((pass_count+=1))
  else
    result="FAIL"
    ((fail_count+=1))
  fi

  printf "%-8s | %-52s | %-11s | %d/%-6d | %-7s\n" \
    "$task_id" "$task_name" "$status" "$ac_done" "$ac_total" "$result"
done

printf "\nSummary: %d pass, %d fail, %d missing\n" "$pass_count" "$fail_count" "$missing_count"

if [[ "$fail_count" -gt 0 ]]; then
  printf "Verification gate: NOT READY\n"
  exit 1
fi

printf "Verification gate: READY\n"
