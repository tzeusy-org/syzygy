#!/bin/bash
# Re-render every copied stored run with the main tree (before) and the branch (after), into a scratch directory.
# The run copies (never a run's agent or session directories) are in $S/runs; the renders go to $O (syzygy-a70b: the second render,
# with the placement subject, the run's classes and the injected stored verdict; see reader_edition_rerender.ts).
S=/tmp/claude-996/-home-orca-orca-projects-syzygy/159c6cc6-161c-42b0-aef3-14b3f97c8ecf/scratchpad/r136
O=/tmp/claude-996/-home-orca-orca-projects-syzygy/159c6cc6-161c-42b0-aef3-14b3f97c8ecf/scratchpad/r136b
W=/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-5dhm.136
mkdir -p $O
cp $W/docs/evidence/syzygy-5dhm-136/reader_edition_rerender.ts $O/rerender.ts
for form in before after; do
  if [ $form = before ]; then T=$S/main-tree; else T=$W; fi
  for run in $S/runs/run-*; do
    id=$(basename $run); id=${id#run-}
    (cd $T && R70_ROOT=$T timeout 900 npx vite-node -c vitest.config.ts $O/rerender.ts $run $O/site-$form-$id > $O/log-$form-$id.out 2> $O/log-$form-$id.err)
    echo "$form $id exit=$? $(tail -c 400 $O/log-$form-$id.out | tr '\n' ' ')"
  done
done
