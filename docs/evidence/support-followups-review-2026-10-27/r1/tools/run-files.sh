#!/usr/bin/env bash
# Run the changed test files (and the item-4 neighbours) in one clone; print vitest's JSON totals and failed names.
# Usage: run-files.sh <clone> <private tmpdir> <label>
set -u
clone=$1; tmp=$2; label=$3
mkdir -p "$tmp"
FILES=(
  apps/three-surface-poc/src/polaris-generation/durable-lifecycle.test.ts
  apps/three-surface-poc/src/polaris-generation/generator-install-check.test.ts
  packages/polaris-generation-core/src/dossier-evaluation.test.ts
  packages/polaris-generation-core/src/dossier-profile.test.ts
  packages/support/src/deep-freeze.test.ts
  packages/three-surface-poc-core/src/body-read-authority.test.ts
  packages/three-surface-poc-core/src/model.test.ts
  packages/three-surface-poc-core/src/project-shape-manifest.test.ts
  packages/three-surface-poc-core/src/project-shape-observation.test.ts
  packages/three-surface-poc-core/src/test-frozen.test.ts
  packages/three-surface-poc-core/src/test-artifact-verification.test.ts
  packages/three-surface-poc-core/src/test-artifact-verification-live-source.test.ts
  apps/three-surface-poc/src/keyboard-sweep-record.test.ts
  apps/three-surface-poc/src/polaris-copy.test.ts
  apps/three-surface-poc/src/polaris-parity-sweep.test.ts
  apps/three-surface-poc/src/polaris-walkthrough-readiness.test.ts
  apps/three-surface-poc/src/response-identity-independent.test.ts
)
present=()
for f in "${FILES[@]}"; do [ -f "$clone/$f" ] && present+=("$f"); done
( cd "$clone" && TMPDIR="$tmp" npx vitest run --reporter=json --outputFile="$tmp/out.json" --testTimeout=120000 --hookTimeout=120000 "${present[@]}" > "$tmp/stdout.txt" 2>&1 ); code=$?
python3 - "$tmp/out.json" "$label" "$code" "${#present[@]}" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
failed = [t['fullName'] for f in d['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
print(f"{sys.argv[2]}: exit={sys.argv[3]} files={sys.argv[4]} filesRun={len(d['testResults'])} total={d['numTotalTests']} passed={d['numPassedTests']} failed={d['numFailedTests']} pending={d['numPendingTests']} todo={d['numTodoTests']}")
for name in failed: print('  FAILED', name)
PY
