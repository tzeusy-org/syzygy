#!/usr/bin/env python3
"""syzygy-bpyt.76: build record.json from the retained records of this directory, run in the repository root.

Usage: python3 -B docs/evidence/syzygy-bpyt-76/tools/build_record.py <commit the records were measured at>

It checks that the mutant, suite and titles records name that commit, that every mutant row came out as expected with the clone
clean after, that the suite failed nothing, and that the original tool, docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs, still
hashes to the sha256 syzygy-bpyt-70/record.json names; then it writes the subjects' digests, the figures and the sha256 of every
retained file.
"""
import hashlib
import json
import os
import subprocess
import sys

D = 'docs/evidence/syzygy-bpyt-76'
BASE = 'e5667689'
SCRIPT = 'scripts/check_node_segment_rules.mjs'
WORKFLOW = '.github/workflows/node-ci.yml'
ORIGINAL = 'docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs'


def main():
    commit = subprocess.run(['git', 'rev-parse', sys.argv[1]], capture_output=True, text=True, check=True).stdout.strip()
    git = lambda *args: subprocess.run(['git', *args], capture_output=True, check=True).stdout
    sha = lambda data: hashlib.sha256(data).hexdigest()
    changed = git('diff', '--name-only', BASE, commit, '--', 'apps', 'packages', 'scripts', '.github').decode().split()
    assert sorted(changed) == sorted([SCRIPT, WORKFLOW]), changed
    mutants = json.load(open(f'{D}/mutants.json'))
    assert mutants['commit'] == commit and mutants['summary']['unexpected'] == [] and mutants['statusAfter'] == ''
    suite = json.load(open(f'{D}/suite-absent.json'))
    titles = json.load(open(f'{D}/titles.json'))
    assert suite['commit'] == commit and suite['failed'] == 0 and titles['head'] == commit
    original = sha(git('show', f'{commit}:{ORIGINAL}'))
    assert json.loads(git('show', f'{commit}:docs/evidence/syzygy-bpyt-70/record.json'))['files']['tools/node_segments.mjs'] == original
    files = sorted(f for f in os.listdir(D) if f.endswith('.json') and f != 'record.json') + sorted('tools/' + f for f in os.listdir(f'{D}/tools'))
    record = {
        'bead': 'syzygy-bpyt.76', 'base': BASE, 'commit': commit,
        'finding': "the PR 557 round-1 review's N4 (docs/reviews/R-GP-IMPL-SEGMENT-RULES-1-RAW.md): node-ci floats within Node 24 and nothing ran the pin tool",
        'subjects': {p: sha(git('show', f'{commit}:{p}')) for p in [SCRIPT, WORKFLOW]},
        'workflowBase': sha(git('show', f'{BASE}:{WORKFLOW}')),
        'copiedFrom': {'path': ORIGINAL, 'sha256': original, 'why': 'syzygy-bpyt-70/record.json names its sha256, so it stays unedited'},
        'step': {'name': mutants['step'], 'command': mutants['stepCommand'], 'after': 'install (npm ci)'},
        'newRefusals': [
            "node-ci fails (exit 1) when either regex copy in workspace-reach.testkit.ts differs from the job Node's, or when any case row of workspace-reach.test.ts differs from the job Node's outcome or the reader's",
            "node-ci fails (exit 2, with the reason) when the job Node's resolver source cannot be read: process.binding missing or throwing, no internal/modules/esm/resolve in process.binding('natives'), or either literal missing from it",
        ],
        'mutants': mutants['summary'],
        'node': mutants['node'],
        'suite': {k: suite[k] for k in ['commit', 'distDirs', 'exit', 'files', 'total', 'passed', 'failed', 'skipped', 'load1', 'wallSeconds', 'cleanAfter']},
        'titles': {k: titles[k] for k in ['base', 'head', 'baseTitles', 'headTitles', 'delta', 'addedByFile']} | {'removed': len(titles['removed'])},
        'files': {f: sha(open(f'{D}/{f}', 'rb').read()) for f in files},
    }
    open(f'{D}/record.json', 'w').write(json.dumps(record, indent=1, ensure_ascii=False) + '\n')
    print(commit, record['mutants'], len(files))


if __name__ == '__main__':
    main()
