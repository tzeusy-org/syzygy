#!/usr/bin/env bash
# Usage: run-seven.sh <checkout> <tmpdir> <out.json>  — one vitest run over the seven test files of PR 544.
set -u
cd "$1"
mkdir -p "$2"
echo "loadavg before: $(cat /proc/loadavg)"
TMPDIR="$2" npx vitest run \
  packages/three-surface-poc-core/src/markdown-code-context.test.ts \
  packages/three-surface-poc-core/src/content-classification.test.ts \
  packages/three-surface-poc-core/src/git-object-reader.test.ts \
  apps/three-surface-poc/src/fence-rules.test.ts \
  apps/three-surface-poc/src/verbatim-route.test.ts \
  apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts \
  packages/polaris-dossier/src/screen.test.ts \
  --reporter=json --outputFile="$3" > /dev/null 2>"$3.stderr"
code=$?
echo "loadavg after: $(cat /proc/loadavg)"
python3 - "$3" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print('tests', d['numTotalTests'], 'passed', d['numPassedTests'], 'failed', d['numFailedTests'], 'files', len(d['testResults']))
for r in d['testResults']:
    failed = [a for a in r['assertionResults'] if a['status'] != 'passed']
    print(' ', r['name'].split('/src/')[-1], r['status'], len(r['assertionResults']), 'failed', len(failed))
    for a in failed[:40]:
        print('     FAIL', a['fullName'][:150], '|', (a['failureMessages'][0] if a['failureMessages'] else '').split('\n')[0][:200])
PY
exit $code
