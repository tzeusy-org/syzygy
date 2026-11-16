#!/bin/sh
# Re-run each named vitest file alone, one at a time, recording load before and after.
cd "$1"; shift
out="$1"; shift
: > "$out"
for f in "$@"; do
  echo "== $f start $(date -u +%T) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$out"
  CI=1 npx vitest run "$f" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E 'Test Files|Tests  |timed out|FAIL' >> "$out"
  echo "== $f end $(date -u +%T) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$out"
done
echo ALLDONE >> "$out"
