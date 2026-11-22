#!/bin/bash
# Re-render every copied stored run with the main tree (before) and the branch (after), into the scratch directory.
S=/tmp/claude-996/-home-orca-orca-projects-syzygy/159c6cc6-161c-42b0-aef3-14b3f97c8ecf/scratchpad/r136
W=/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-5dhm.136
for form in before after; do
  if [ $form = before ]; then T=$S/main-tree; else T=$W; fi
  for run in $S/runs/run-*; do
    id=$(basename $run); id=${id#run-}
    (cd $T && R70_ROOT=$T timeout 900 npx vite-node -c vitest.config.ts $S/rerender.ts $run $S/site-$form-$id > $S/log-$form-$id.out 2> $S/log-$form-$id.err)
    echo "$form $id exit=$? $(tail -c 300 $S/log-$form-$id.out | tr '\n' ' ')"
  done
done
