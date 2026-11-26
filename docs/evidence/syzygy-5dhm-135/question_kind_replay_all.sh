#!/bin/bash
# syzygy-5dhm.135: replay the per-kind floor over every stored run with a passed draft, one record per run.
# Usage (from the worktree root): question_kind_replay_all.sh <state dir> <out dir>
# Reads each run-<id> directory only; never a run's .agents or .sessions directory.
STATE=$1
OUT=$2
mkdir -p "$OUT"
for run in "$STATE"/run-*; do
  case "$run" in *.agents|*.sessions|*.json) continue;; esac
  id=$(basename "$run")
  R135_ROOT=$PWD timeout 600 npx vite-node -c vitest.config.ts docs/evidence/syzygy-5dhm-135/question_kind_replay.ts "$run" "$OUT/$id.json" 2>&1 | tail -1
done
