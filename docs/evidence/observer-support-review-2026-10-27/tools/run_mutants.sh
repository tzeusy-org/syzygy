#!/bin/sh
# rev-540: run every mutant with the PR 535 reviewer's runner (unchanged, from the clone at 6ef18990), sequentially.
# Usage: sh run_mutants.sh <rev-540 dir>
R="$1"
RUN="$R/clone/docs/evidence/host-pins-review-2026-10-27/tools/rev535_mut.py"
SP="$R/clone/docs/evidence/host-pins-review-2026-10-27"
python3 -I "$RUN" "$R/code" "$SP/rev535-specs.json" "$R/mut-v12-head.json" /tmp/r540-5 V12-gate-prefix-src-and-manifest-only > "$R/mut-v12-head.log" 2>&1
python3 -I "$RUN" "$R/code" "$SP/rev535-gate-specs.json" "$R/mut-v14-v15-head.json" /tmp/r540-5 > "$R/mut-v14-v15-head.log" 2>&1
python3 -I "$RUN" "$R/code" "$R/clone/docs/evidence/syzygy-bpyt-6-15/own-specs.json" "$R/mut-own-head.json" /tmp/r540-5 > "$R/mut-own-head.log" 2>&1
python3 -I "$RUN" "$R/code" "$R/rev540-specs.json" "$R/mut-rev540-head.json" /tmp/r540-5 > "$R/mut-rev540-head.log" 2>&1
python3 -I "$RUN" "$R/base" "$SP/rev535-specs.json" "$R/mut-v12-base.json" /tmp/r540-5 V12-gate-prefix-src-and-manifest-only > "$R/mut-v12-base.log" 2>&1
python3 -I "$RUN" "$R/base" "$SP/rev535-gate-specs.json" "$R/mut-v14-v15-base.json" /tmp/r540-5 > "$R/mut-v14-v15-base.log" 2>&1
echo done > "$R/mut-done.txt"
