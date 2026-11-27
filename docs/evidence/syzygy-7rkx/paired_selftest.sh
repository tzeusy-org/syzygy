#!/bin/bash
# Paired selftest at one commit: the commit's own scripts/check_spec_reconciliation.py
# ("after") and BEFORE_REF's copy of that one file over the same checkout ("before"),
# so both witness records carry the same commit (syzygy-7rkx).
# Usage: paired_selftest.sh <repository> <commit> <before ref> <work directory>
#   <repository>      a checkout holding both commits (cloned with --shared)
#   <work directory>  created fresh; receives the clone, both witnesses and
#                     outputs, and times.txt (wall, load, file digest per mode)
# SELFTEST_WORKERS defaults to 4; TMPDIR is <work directory>/tmp.
set -u
[ $# -eq 4 ] || { sed -n '5,9p' "$0" >&2; exit 2; }
repo=$1; commit=$2; before=$3; work=$4
rm -rf "$work"; mkdir -p "$work/tmp"
git clone --quiet --shared "$repo" "$work/clone"
cd "$work/clone" && git checkout --quiet "$commit" || exit 2
export TMPDIR=$work/tmp SELFTEST_WORKERS=${SELFTEST_WORKERS:-4}
f=scripts/check_spec_reconciliation.py
for mode in before after; do
  if [ $mode = before ]; then git show "$before:$f" > $f; else git checkout --quiet -- $f; fi
  start=$(date +%s.%N)
  python3 $f --selftest --witnesses "$work/witness-$mode.json" > "$work/selftest-$mode.out" 2> "$work/selftest-$mode.err"
  rc=$?
  end=$(date +%s.%N)
  echo "$mode rc=$rc wall=$(echo "$end - $start" | bc) load=$(cut -d' ' -f1-3 /proc/loadavg) file=$(sha256sum $f | cut -c1-64) workers=$SELFTEST_WORKERS" >> "$work/times.txt"
done
cmp "$work/witness-before.json" "$work/witness-after.json" && echo "witness identical" >> "$work/times.txt" || echo "witness DIFFERS" >> "$work/times.txt"
cmp "$work/selftest-before.out" "$work/selftest-after.out" && echo "stdout identical" >> "$work/times.txt" || echo "stdout DIFFERS" >> "$work/times.txt"
