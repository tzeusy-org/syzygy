#!/bin/bash
# syzygy-5dhm.41: re-render every copied stored run with the main tree (before) and this branch (after), with the corrected harness
# docs/evidence/syzygy-5dhm-136/reader_edition_rerender.ts (syzygy-a70b: the screen's placement subject, the run's content classes and
# the run's newest stored fidelity verdict, injected). The run copies (never a run's agent or session directories) are in $S/runs, the
# main tree is a detached worktree of origin/main in $S/main-tree, and the renders go to $S/site-<form>-<run>.
# Usage: worth_knowing_render_all.sh <scratch dir> <branch worktree>
S=$1
W=$2
cp "$W/docs/evidence/syzygy-5dhm-136/reader_edition_rerender.ts" "$S/rerender.ts"
for form in before after; do
  if [ "$form" = before ]; then T=$S/main-tree; else T=$W; fi
  for run in "$S"/runs/run-*; do
    id=$(basename "$run"); id=${id#run-}
    (cd "$T" && R70_ROOT=$T timeout 900 npx vite-node -c vitest.config.ts "$S/rerender.ts" "$run" "$S/site-$form-$id" > "$S/log-$form-$id.out" 2> "$S/log-$form-$id.err")
    echo "$form $id exit=$? $(tail -c 300 "$S/log-$form-$id.out" | tr '\n' ' ')"
  done
done
