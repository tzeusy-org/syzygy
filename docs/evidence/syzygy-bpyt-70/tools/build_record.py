#!/usr/bin/env python3
"""syzygy-bpyt.70: build record.json from the retained records of this directory, run in the repository root.

Usage: python3 docs/evidence/syzygy-bpyt-70/tools/build_record.py <commit the records were measured at>

It checks that the mutant, suite, titles and pin records name that commit, that every mutant row came out as expected with the
clone clean after, that the pin found no mismatch over the subject's bytes at that commit, and that the differential newly
accepts nothing; then it writes the item dispositions, the refusals, the residuals, the figures and the sha256 of every
retained file.
The differential names the two testkits it compared, the one at BASE and the one at that commit, with each one's sha256 and the
tool that compared them (the PR 557 round-2 review's N1, syzygy-bpyt.78).
"""
import hashlib
import json
import os
import subprocess
import sys

D = 'docs/evidence/syzygy-bpyt-70'
BASE = 'c672492c'
SUBJECTS = ['packages/polaris-generation-core/src/workspace-reach.testkit.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts',
            'apps/three-surface-poc/src/sync-child-process-guard.test.ts', 'packages/support/src/support-purity.test.ts']


def main():
    commit = subprocess.run(['git', 'rev-parse', sys.argv[1]], capture_output=True, text=True, check=True).stdout.strip()
    blob = lambda p, at=commit: hashlib.sha256(subprocess.run(['git', 'show', f'{at}:{p}'], capture_output=True, check=True).stdout).hexdigest()
    changed = subprocess.run(['git', 'diff', '--name-only', BASE, commit, '--', 'apps', 'packages'], capture_output=True, text=True, check=True).stdout.split()
    assert sorted(changed) == sorted(SUBJECTS), changed
    mutants = {s: json.load(open(f'{D}/mutants-{s}.json')) for s in ['absent', 'present']}
    for state, record in mutants.items():
        assert record['commit'] == commit and record['summary']['unexpected'] == [] and record['statusAfter'] == '', state
    suite = json.load(open(f'{D}/suite-absent.json'))
    titles = json.load(open(f'{D}/titles.json'))
    pin = json.load(open(f'{D}/node-segments.json'))
    differential = json.load(open(f'{D}/differential.json'))
    assert suite['commit'] == commit and suite['failed'] == 0 and titles['head'] == commit
    assert pin['mismatches'] == 0 and pin['subjectSha256'] == blob(SUBJECTS[0]) and pin['casesFromSha256'] == blob(SUBJECTS[1])
    newly_accepted = sum(group['n'] for key, group in differential['groups'].items() if key.endswith('-> accepts') and not key.startswith('accepts'))
    assert newly_accepted == 0, newly_accepted
    tree = lambda p: subprocess.run(['git', 'rev-parse', f'{commit}:{p}'], capture_output=True, text=True, check=True).stdout.strip()
    surface = hashlib.sha256('\n'.join(tree(p) for p in ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src']).encode()).hexdigest()[:12]
    files = sorted(f for f in os.listdir(D) if f.endswith('.json') and f != 'record.json') + sorted('tools/' + f for f in os.listdir(f'{D}/tools'))
    record = {
        'bead': 'syzygy-bpyt.70', 'base': BASE, 'commit': commit,
        'subjects': {p: blob(p) for p in SUBJECTS},
        'items': {
            '1': 'moot: closed by PR 549 (the bead comment of 2026-10-28 10:12; docs/evidence/syzygy-bpyt-46/alias-shadow-probe.json)',
            '2': "arm A: every target of every entry is read by Node 24.6.0's invalidSegmentRegEx and deprecatedInvalidSegmentRegEx, copied verbatim (node-segments.json pins both and the 15 case rows against the running Node)",
            '3': 'no row, by the coordinator\'s ruling: the bead marks it informational ("add rows only if cheap"); no test refuses anything new for it',
            '4': 'moot since PR 549 (round 2 N5)',
            '5': 'E4S and the E1E4S residual, in tools/mutants.py of this directory; the bpyt.46 tool is unedited',
            '6': "the round-2 reviewer's row, inserted byte for byte (its file docs/evidence/support-leaf-followups-review-2026-10-28/r2/tools/fix-n2-object-rest-row.ts.txt, sha256 73fcffaec45f49fbd589c95c4512a5796235fcd56958b36dc02344cf7e0916f6); W4 pins it",
            '7': 'rows for a types-only, a source-only, a nested-condition, a require-condition and a main target, and the severity order (M4, M4b, M6, R1-R4, RX4)',
            '8': 'the guard loads vitest.config.ts and refuses an alias key at any depth (S2, S3), with a reader row for the walk (S4-S6); the row finds the globalSetup in any project (RX7)',
        },
        'round1Repairs': {
            'review': 'R-GP-IMPL-SEGMENT-RULES-1, REVISE over 9fd03a8e',
            'F1': "the empty-segment message says Node accepts the target with DEP0166 (testkit, test, pin tool, mutants); a trailing-'/' case row, which the pin tool classes as warns, then ERR_UNSUPPORTED_DIR_IMPORT",
            'F2': "the config row asserts a test.globalSetup in any project, not in test.projects.8; refusal 6 lists what the row needs",
            'F3': 'the body states its CC-REV-1 classes',
            'N2': "a condition key with a /../ segment stays refused, as the serialized check refused it; differential.json (the review's tools/differential.mjs, retained unchanged) newly accepts 0 of its rows",
            'N3': "the review's %4E case row and require severity row; RX3 and RX4 are killed",
        },
        'newRefusals': [
            "an exports target with a '.' or 'node_modules' segment, in any case or percent-encoded (Node refuses each with ERR_INVALID_PACKAGE_TARGET); before, only the literal '/../' threw",
            "a '..' segment written with a backslash or percent-encoded",
            "an empty segment ('//' or a trailing '/'), which Node 24.6.0 accepts with the DEP0166 warning: it then loads a '//' target, and fails to load one ending in '/', which names a directory (ERR_UNSUPPORTED_DIR_IMPORT under import, MODULE_NOT_FOUND under require)",
            "any of these under a condition Node does not read by default (types, source, or any other, such as browser), or in a main field (before, the '/../' form already threw there)",
            'an alias key anywhere in the loaded vitest config, including the shorthand form the text check misses',
            "a loaded vitest config without ssr.resolve.conditions, without a root test.setupFiles, or without a test.globalSetup in any project: the alias row checks those paths to show it reads the real config",
        ],
        'residuals': [
            "E1E4S: with the segment check dropped, a uniform '/../' entry whose source condition is '/../' too passes the S10 file, since the resolver reads the source condition and joins the segment away; only the check stops it",
            'for a target after default or in an array fallback, the message says Node refuses it, though Node never reaches it; the entry is refused as unreadable either way',
            'the case rows record Node 24.6.0 only: the test rows do not run Node, and a later Node that changes its rules is caught only when node_segments.mjs is re-run; hosted CI runs Node 24.x (24.21.0 at 9fd03a8e), and the pin was run on 24.6.0 only',
            'imports targets get no segment check (0 imports targets in the tree)',
            'the alias walk reads the config object; a plugin that adds an alias through a config hook is not read (the config has no plugins today)',
        ],
        'mutants': {state: record['summary'] for state, record in mutants.items()},
        'suite': {k: suite[k] for k in ['commit', 'distDirs', 'exit', 'files', 'total', 'passed', 'failed', 'skipped', 'load1', 'wallSeconds', 'cleanAfter']},
        'titles': {k: titles[k] for k in ['base', 'head', 'baseTitles', 'headTitles', 'delta', 'addedByFile']} | {'removed': len(titles['removed'])},
        'differential': {'base': BASE, 'head': commit, 'tool': 'tools/differential.mjs',
                         'testkitSha256': {'base': blob(SUBJECTS[0], BASE), 'head': blob(SUBJECTS[0])},
                         'rows': differential['rows'], 'newlyAccepted': newly_accepted, 'groups': {k: g['n'] for k, g in differential['groups'].items()}},
        'surfaceVersion': {'base': 'polaris@5e39299adacf', 'head': f'polaris@{surface}'},
        'node': pin['node'],
        'files': {f: hashlib.sha256(open(f'{D}/{f}', 'rb').read()).hexdigest() for f in files},
    }
    open(f'{D}/record.json', 'w').write(json.dumps(record, indent=1, ensure_ascii=False) + '\n')
    print(commit, record['surfaceVersion'], record['mutants'], len(files))


if __name__ == '__main__':
    main()
