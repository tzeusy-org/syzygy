#!/usr/bin/env python3
"""syzygy-bpyt.4.26: build record.json from the retained records of this directory, run in the repository root.

Usage: python3 -B docs/evidence/syzygy-bpyt-4-26/tools/build_record.py <commit the records were measured at>

It checks that the mutant, suite and titles records name that commit, that every mutant row came out as expected with the clone
clean after, and that the suite failed nothing; then it writes the subject's digest, the figures and the sha256 of every retained
file.
"""
import hashlib
import json
import os
import subprocess
import sys

D = 'docs/evidence/syzygy-bpyt-4-26'
BASE = 'eb6183b5'
SUBJECT = 'packages/polaris-dossier/src/review.test.ts'


def main():
    commit = subprocess.run(['git', 'rev-parse', sys.argv[1]], capture_output=True, text=True, check=True).stdout.strip()
    git = lambda *args: subprocess.run(['git', *args], capture_output=True, check=True).stdout
    changed = git('diff', '--name-only', BASE, commit, '--', 'apps', 'packages', 'scripts').decode().split()
    assert changed == [SUBJECT], changed
    mutants = {s: json.load(open(f'{D}/mutants-{s}.json')) for s in ['absent', 'present']}
    for state, record in mutants.items():
        assert record['commit'] == commit and record['summary']['unexpected'] == [] and record['statusAfter'] == '', state
    suite = json.load(open(f'{D}/suite-absent.json'))
    titles = json.load(open(f'{D}/titles.json'))
    assert suite['commit'] == commit and suite['failed'] == 0 and titles['head'] == commit
    files = sorted(f for f in os.listdir(D) if f.endswith('.json') and f != 'record.json') + sorted('tools/' + f for f in os.listdir(f'{D}/tools'))
    record = {
        'bead': 'syzygy-bpyt.4.26', 'base': BASE, 'commit': commit,
        'subject': SUBJECT, 'subjectSha256': hashlib.sha256(git('show', f'{commit}:{SUBJECT}')).hexdigest(),
        'finding': "the PR 524 review's N4 (docs/reviews/R-GP-IMPL-ARGV-GUARDS-1-RAW.md): the observed-only row's leaf check matched the block id 'p1' in a TMPDIR path",
        'fix': "the leaf check reads each Observed holder with the run path replaced in its string values, and asserts that no os.tmpdir() path is left and that the observed digest still is; a row runs the check under a TMPDIR whose path holds 'p1'",
        'newTestRefusals': [
            "an Observed holder that carries a path under os.tmpdir() outside the run directory",
            "an Observed holder whose JSON, with the run path replaced, no longer carries the packet digest it observes",
        ],
        'mutants': {state: record['summary'] for state, record in mutants.items()},
        'suite': {k: suite[k] for k in ['commit', 'distDirs', 'exit', 'files', 'total', 'passed', 'failed', 'skipped', 'load1', 'wallSeconds', 'cleanAfter']},
        'titles': {k: titles[k] for k in ['base', 'head', 'baseTitles', 'headTitles', 'delta', 'addedByFile']} | {'removed': len(titles['removed']), 'added': titles['added']},
        'files': {f: hashlib.sha256(open(f'{D}/{f}', 'rb').read()).hexdigest() for f in files},
    }
    open(f'{D}/record.json', 'w').write(json.dumps(record, indent=1, ensure_ascii=False) + '\n')
    print(commit, record['mutants'], len(files))


if __name__ == '__main__':
    main()
