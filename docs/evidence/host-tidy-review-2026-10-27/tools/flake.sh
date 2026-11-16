#!/bin/bash
# R-GP-IMPL-HOST-TIDY-1 reviewer tool: polaris-authority-sweep.test.ts alone five times at each commit, then the full POC
# project twice at each, interleaved base/head so both see the same load.
R=/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-539
for i in 1 2 3 4 5; do
  for side in base head; do
    t=$R/clone-base; [ $side = head ] && t=$R/clone
    python3 -I $R/tools/suite.py $t /tmp/r539-9 $R/flake/alone-$side-$i.json --file apps/three-surface-poc/src/polaris-authority-sweep.test.ts --project @syzygy/three-surface-poc-app > $R/flake/alone-$side-$i.out 2>&1
  done
done
for i in 1 2; do
  for side in base head; do
    t=$R/clone-base; [ $side = head ] && t=$R/clone
    python3 -I $R/tools/suite.py $t /tmp/r539-9 $R/flake/poc-$side-$i.json --project @syzygy/three-surface-poc-app > $R/flake/poc-$side-$i.out 2>&1
  done
done
echo done > $R/flake/done
