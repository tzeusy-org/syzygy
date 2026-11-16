#!/bin/sh
# rev-520c: run probe.py batches one after another in one clone (one tree, so never two at once).
# usage: run_probes.sh CLONE OUTDIR LOG BATCH:VERSIONS:REPEATS[:np]...   (a trailing :np runs that batch with --no-profile)
clone=$1; outdir=$2; log=$3; shift 3
for spec in "$@"; do
  batch=${spec%%:*}; rest=${spec#*:}; versions=${rest%%:*}; rest=${rest#*:}; repeats=${rest%%:*}; flag=
  case "$rest" in *:np) flag=--no-profile ;; esac
  echo "=== $batch $versions x$repeats $flag start $(date -u +%H:%M:%S) load $(cut -d' ' -f1 /proc/loadavg)" >> "$log"
  python3 -I "$(dirname "$0")/probe.py" "$clone" "$outdir" "$batch" "$versions" --repeats "$repeats" $flag >> "$log" 2>&1
  echo "=== $batch exit $? end $(date -u +%H:%M:%S) load $(cut -d' ' -f1 /proc/loadavg)" >> "$log"
done
echo "=== ALL DONE $(date -u +%H:%M:%S)" >> "$log"
