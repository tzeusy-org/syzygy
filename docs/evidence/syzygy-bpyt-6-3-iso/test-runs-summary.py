#!/usr/bin/env python3
"""test-runs-summary.json for syzygy-bpyt.6.3 stack 4, from three vitest JSON reports (`vitest run --reporter=json --outputFile=...`).

Usage: test-runs-summary.py <base report> <head-tests-on-base report> <head report> <base commit> <head commit> <out.json>
  base            the six existing test files at the base commit
  headTestsOnBase the head versions of those six files run against the base code
  head            all eight test files at the head commit
Each entry stores the counts, the test files run, the failed tests (file and full name) and the sha256 of the report it was computed from.
"""
import hashlib
import json
import os
import sys

FILES = [
    'packages/polaris-dossier/src/cli.test.ts', 'packages/three-surface-poc-core/src/authority-artifact-fields.test.ts',
    'packages/polaris-generation-core/src/secret-redaction.test.ts', 'packages/polaris-generation-core/src/public-source-classification.test.ts',
    'packages/polaris-generation-core/src/public-source-exemption.test.ts', 'packages/polaris-dossier/src/screen.test.ts',
    'packages/support/src/is-record.test.ts', 'packages/polaris-dossier/src/iso-of.test.ts',
]


def summary(path, checkout):
    raw = open(path, 'rb').read()
    d = json.loads(raw)
    failed = [{'file': os.path.basename(f['name']), 'name': t['fullName']} for f in d['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    entry = {'checkout': checkout, 'tests': d['numTotalTests'], 'passed': d['numPassedTests'], 'failed': failed if failed else 0,
             'testFiles': sorted(os.path.basename(f['name']) for f in d['testResults']), 'reportSha256': hashlib.sha256(raw).hexdigest()}
    if d['numFailedTests'] != len(failed):
        raise SystemExit(f'{path}: {d["numFailedTests"]} failed tests reported, {len(failed)} listed')
    return entry


base_report, on_base_report, head_report, base, head, out = sys.argv[1:]
result = {
    'files': FILES,
    'base': summary(base_report, base),
    'headTestsOnBase': summary(on_base_report, base),
    'head': summary(head_report, head),
    'note': 'base: base commit, base tests, the six existing files (the two new ones absent). headTestsOnBase: base commit with the head versions of the six existing test files. head: the repair commit, all eight files.',
}
json.dump(result, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
print(json.dumps({k: (v['tests'], v['passed'], v['failed']) for k, v in result.items() if isinstance(v, dict)}))
