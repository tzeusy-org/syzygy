#!/bin/bash
# Paired selftest at one commit: the commit's own scripts/check_spec_reconciliation.py
# ("after") and BEFORE_REF's copy of that one file over the same checkout ("before").
# Usage: pair7.sh <commit> <before ref> <label>
set -u
commit=$1; before=$2; label=$3
work=/home/orca/.tmp/7rkx/$label
rm -rf "$work"; mkdir -p "$work/tmp"
git clone --quiet --shared /home/orca/orca/projects/syzygy "$work/clone"
cd "$work/clone" && git checkout --quiet "$commit" || exit 2
export TMPDIR=$work/tmp SELFTEST_WORKERS=4
f=scripts/check_spec_reconciliation.py
for mode in before after; do
  if [ $mode = before ]; then git show "$before:$f" > $f; else git checkout --quiet -- $f; fi
  start=$(date +%s.%N)
  python3 $f --selftest --witnesses "$work/witness-$mode.json" > "$work/selftest-$mode.out" 2> "$work/selftest-$mode.err"
  rc=$?
  end=$(date +%s.%N)
  echo "$mode rc=$rc wall=$(echo "$end - $start" | bc) load=$(cut -d' ' -f1-3 /proc/loadavg) file=$(sha256sum $f | cut -c1-64)" >> "$work/times.txt"
done
cmp "$work/witness-before.json" "$work/witness-after.json" && echo "witness identical" >> "$work/times.txt" || echo "witness DIFFERS" >> "$work/times.txt"
