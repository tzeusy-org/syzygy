#!/bin/sh
# Re-run each named vitest file alone with 60 s test and hook timeouts, one at a time, with load before and after.
cd "$1"; shift
out="$1"; shift
: > "$out"
echo "commit $(git rev-parse HEAD)" >> "$out"
for f in "$@"; do
  echo "== $f start $(date -u +%T) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$out"
  CI=1 npx vitest run --testTimeout=60000 --hookTimeout=60000 "$f" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E 'Test Files|Tests  |timed out|FAIL|Error' >> "$out"
  echo "== $f end $(date -u +%T) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$out"
done
echo ALLDONE >> "$out"
