#!/usr/bin/env python3
"""syzygy-bpyt.78: build record.json from the retained records of this directory, run in the repository root.

Usage: python3 -B docs/evidence/syzygy-bpyt-78/tools/build_record.py <commit the records were measured at> <tmpdir>

It checks that the mutant, suite and titles records name that commit, that every mutant row came out as expected with the clone
clean after, and that the suite failed nothing. It checks that syzygy-bpyt-70/record.json, against its bytes at BASE, moved only in
the three places this bead moves it, and it re-runs syzygy-bpyt-70/tools/differential.mjs over the two testkits that record now
names (each tree written out by `git archive` under <tmpdir>), which must give differential.json's bytes. Then it writes the item
dispositions, the figures and the sha256 of every retained file.
"""
import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys

D = 'docs/evidence/syzygy-bpyt-78'
D70 = 'docs/evidence/syzygy-bpyt-70'
BASE = 'f361108c'
SUBJECT = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
RAW = 'docs/reviews/R-GP-IMPL-SEGMENT-RULES-2-RAW.md'


def main():
    commit = subprocess.run(['git', 'rev-parse', sys.argv[1]], capture_output=True, text=True, check=True).stdout.strip()
    tmpdir = sys.argv[2]
    git = lambda *args: subprocess.run(['git', *args], capture_output=True, check=True).stdout
    sha = lambda data: hashlib.sha256(data).hexdigest()
    changed = git('diff', '--name-only', BASE, commit, '--', 'apps', 'packages', 'scripts').decode().split()
    assert changed == [SUBJECT], changed
    mutants = {s: json.load(open(f'{D}/mutants-{s}.json')) for s in ['absent', 'present']}
    for state, record in mutants.items():
        assert record['commit'] == commit and record['summary']['unexpected'] == [] and record['statusAfter'] == '', state
    suite = json.load(open(f'{D}/suite-absent.json'))
    titles = json.load(open(f'{D}/titles.json'))
    assert suite['commit'] == commit and suite['failed'] == 0 and titles['head'] == commit

    # syzygy-bpyt-70/record.json moved in newRefusals[3], the differential's identity and its own tool's sha256, and nowhere else.
    before = json.loads(git('show', f'{BASE}:{D70}/record.json'))
    after = json.loads(git('show', f'{commit}:{D70}/record.json'))
    identity = {k: after['differential'][k] for k in ['base', 'head', 'tool', 'testkitSha256']}
    rest = copy.deepcopy(after)
    rest['newRefusals'][3] = before['newRefusals'][3]
    rest['differential'] = {k: v for k, v in rest['differential'].items() if k not in identity}
    rest['files']['tools/build_record.py'] = before['files']['tools/build_record.py']
    assert rest == before
    assert after['files']['tools/build_record.py'] == sha(git('show', f'{commit}:{D70}/tools/build_record.py'))

    # The differential, re-run over the two testkits the record names, gives the retained bytes.
    kits = {}
    for side in ['base', 'head']:
        tree = os.path.join(tmpdir, side)
        shutil.rmtree(tree, ignore_errors=True)
        os.makedirs(tree)
        subprocess.run(f"git archive {identity[side]} | tar -x -C '{tree}'", shell=True, check=True)
        kits[side] = os.path.join(tree, KIT)
        assert sha(open(kits[side], 'rb').read()) == identity['testkitSha256'][side], side
    rerun = subprocess.run(['node', f'{D70}/tools/differential.mjs', kits['base'], kits['head']], capture_output=True, check=True).stdout
    retained = git('show', f'{commit}:{D70}/differential.json')
    assert rerun == retained
    for side in ['base', 'head']:
        shutil.rmtree(os.path.join(tmpdir, side))

    files = sorted(f for f in os.listdir(D) if f.endswith('.json') and f != 'record.json') + sorted('tools/' + f for f in os.listdir(f'{D}/tools'))
    rows = {state: {r['id']: r for r in record['rows']} for state, record in mutants.items()}
    record = {
        'bead': 'syzygy-bpyt.78', 'base': BASE, 'commit': commit,
        'review': {'raw': RAW, 'sha256': sha(git('show', f'{commit}:{RAW}'))},
        'subject': SUBJECT, 'subjectSha256': sha(git('show', f'{commit}:{SUBJECT}')),
        'record70': {'path': f'{D70}/record.json', 'sha256': {'base': sha(git('show', f'{BASE}:{D70}/record.json')),
                                                            'head': sha(git('show', f'{commit}:{D70}/record.json'))},
                     'rebuiltAt': after['commit'], 'movedOnly': ['newRefusals[3]', 'differential.base/head/tool/testkitSha256', 'files.tools/build_record.py']},
        'items': {
            '1': "F2's record half: the raw's replacement text for newRefusals[3], inserted into syzygy-bpyt-70/tools/build_record.py byte for byte, and record.json rebuilt at 52d8b96f (nothing re-measured)",
            '2': f"N1: syzygy-bpyt-70/record.json's differential names its base and head commits, the tool, and each testkit's sha256; re-running the tool over those two testkits gives differential.json's bytes (sha256 {sha(retained)})",
            '3': "N2: the raw's proposed key-plus-target expectation, inserted into the key row byte for byte (indented as the row's others) with a one-line comment; RK3 now fails the key row, and fails nothing with that expectation removed (RK3B); RK2 survives, equivalent in outcome as the raw says",
            '4': "N3, not applied: measured, the message-equality form prints exactly what the row's toThrow form prints. Under vitest's default reporter both forms print the two messages whole on their Expected and Received lines; under the JSON reporter both keep only the first failure line, which vitest truncates in both (RX4, RX4E, R2, R2E). The row keeps its toThrow form",
            '5': 'N4: the two residuals below',
        },
        'newTestRefusals': [
            "an entry reader that names a condition-key fault before a target fault Node refuses, when an entry has both",
        ],
        'residuals': [
            "Node 24.6.0 also tests a pattern's substituted subpath against both segment rules (internal/modules/esm/resolve lines 433-435, per the round-2 raw); entryModulesIn reads no pattern entry, and the tree has 0 pattern subpaths",
            "DEP0166 is given for empty-segment forms beyond '//' and a trailing '/': a leading './/', a bare './', a '\\\\' pair, '/\\' and a trailing '\\' (the round-2 raw's probe); the guard names each 'accepts with a deprecation warning (DEP0166)'",
        ],
        'mutants': {state: record['summary'] for state, record in mutants.items()},
        'n3Printed': {rid: {'printed': rows['absent'][rid]['printed'], 'firstLine': list(rows['absent'][rid]['messages'].values())}
                      for rid in ['RX4-require-not-a-node-condition', 'RX4E-require-not-a-node-condition-equality-form']},
        'suite': {k: suite[k] for k in ['commit', 'distDirs', 'exit', 'files', 'total', 'passed', 'failed', 'skipped', 'load1', 'wallSeconds', 'cleanAfter']},
        'titles': {k: titles[k] for k in ['base', 'head', 'baseTitles', 'headTitles', 'delta', 'addedByFile']} | {'removed': len(titles['removed']), 'added': titles['added']},
        'files': {f: sha(open(f'{D}/{f}', 'rb').read()) for f in files},
    }
    open(f'{D}/record.json', 'w').write(json.dumps(record, indent=1, ensure_ascii=False) + '\n')
    print(commit, record['mutants'], len(files))


if __name__ == '__main__':
    main()
