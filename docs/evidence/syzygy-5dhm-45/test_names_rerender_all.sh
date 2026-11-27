#!/bin/bash
# syzygy-5dhm.45, the comprehension-regression rule of CONTRIBUTING.md: re-render each copied stored run with the merge-base tree
# (before) and this branch (after) through docs/evidence/syzygy-5dhm-45/test_names_rerender.ts, then compare the two sites.
# Usage: question_kind_rerender_all.sh <scratch> <branch worktree>. <scratch>/runs holds copies of run-<id> directories only (never a
# run's agent or session directory); <scratch>/main-tree is the merge-base worktree with its dependencies installed.
S=$1
W=$2
O=$S/out
mkdir -p "$O"
cp "$W/docs/evidence/syzygy-5dhm-45/test_names_rerender.ts" "$O/rerender.ts"
for form in before after; do
  if [ $form = before ]; then T=$S/main-tree; else T=$W; fi
  for run in "$S"/runs/run-*; do
    id=$(basename "$run"); id=${id#run-}
    (cd "$T" && R70_ROOT=$T timeout 900 npx vite-node -c vitest.config.ts "$O/rerender.ts" "$run" "$O/site-$form-$id" > "$O/log-$form-$id.out" 2> "$O/log-$form-$id.err")
    echo "$form $id exit=$?"
  done
done
