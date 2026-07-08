#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Rust format =="
cargo fmt --all -- --check

echo "== Rust clippy =="
cargo clippy --workspace --all-targets -- -D warnings

echo "== Rust tests =="
cargo test

echo "== Desktop build =="
pnpm --filter @outline/desktop build

echo "== Desktop tests =="
pnpm --filter @outline/desktop test

echo "== Size guard =="
status=0

check_file_lines() {
  local file="$1"
  local target="$2"
  local limit="$3"
  local reason="$4"
  local mode="${5:-enforce}"

  if [[ ! -f "$file" ]]; then
    return
  fi

  local lines
  lines="$(wc -l < "$file" | tr -d ' ')"

  if (( lines > limit )); then
    if [[ "$mode" == "baseline" ]]; then
      echo "BASELINE WARN: $file has $lines lines; target is $target, hard limit is $limit. $reason"
    else
      echo "FAIL: $file has $lines lines; target is $target, hard limit is $limit. $reason"
      status=1
    fi
  elif (( lines > target )); then
    echo "WARN: $file has $lines lines; target is $target, hard limit is $limit. $reason"
  else
    echo "OK: $file has $lines lines; target is $target, hard limit is $limit."
  fi
}

check_file_lines "apps/desktop/src/App.tsx" 300 500 "Do not add new feature code here; extract shell/components first."
check_file_lines "apps/desktop/src/components/UnifiedViewport.tsx" 350 700 "Keep extracting sketch/viewport modules while adding editor behavior."
check_file_lines "apps/desktop/src/stores/useStore.ts" 220 300 "Split store concerns before adding more state."

exit "$status"
