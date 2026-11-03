#!/bin/bash
# Rule-6 mutant M03 of PR #498 (syzygy-bpyt.7.9): change the builder default
# owner in packages/cap1-conformance/src/fixtures/index.ts, run the
# conformance project, print the failing tests per file, restore the file.
# usage: mutate-m03.sh <label> [outdir]   (run from the repository root, clean tree)
set -eu
label=$1; out=${2:-${TMPDIR:-/tmp}}
F=packages/cap1-conformance/src/fixtures/index.ts
OLD="export const FIXTURE_OWNER = 'uniquosity@gmail.com';"
NEW="export const FIXTURE_OWNER = 'mutant-owner@example.invalid';"
cp "$F" "$out/index.ts.bak"
trap 'cp "$out/index.ts.bak" "$F"' EXIT
python3 - "$F" "$OLD" "$NEW" <<'P'
import sys
p, old, new = sys.argv[1:]
s = open(p).read()
assert s.count(old) == 1, 'mutation site not found exactly once'
open(p, 'w').write(s.replace(old, new))
P
npx vitest run --project @syzygy/cap1-conformance --reporter=json --outputFile="$out/m03-$label.json" >"$out/m03-$label.log" 2>&1 || true
python3 - "$out/m03-$label.json" <<'P'
import json, sys
d = json.load(open(sys.argv[1]))
for f in d['testResults']:
    failed = [a['fullName'] for a in f['assertionResults'] if a['status'] == 'failed']
    if failed:
        print(f['name'].split('/src/')[-1], len(failed))
        for x in failed:
            print('   ', x)
print('total failed', d['numFailedTests'], 'of', d['numTotalTests'])
P
