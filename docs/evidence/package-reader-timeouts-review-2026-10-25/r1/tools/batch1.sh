#!/bin/sh
# rev-520 batch: base alone (default timeouts), A/B ce322e1a vs 8b143272 (600 s timeouts), merged tree alone, head full suite.
R=/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-520
T="$R/tools/run_file.py"
O="$R/runs"
python3 -I "$T" "$R/clone-base" base 1 "$O"
for i in 1 2 3; do
  python3 -I "$T" "$R/clone-base" "abbase$i" 1 "$O" -- --testTimeout=600000 --hookTimeout=600000
  python3 -I "$T" "$R/clone-821" "ab821x$i" 1 "$O" -- --testTimeout=600000 --hookTimeout=600000
done
python3 -I "$T" "$R/clone-merge" merge 2 "$O"
python3 -I "$T" "$R/clone" headfull 1 "$O" --full
echo BATCH-DONE
