#!/usr/bin/env python3
"""syzygy-bpyt.6.14: derive summary.json from the raw records beside it, checking each against the git objects of the tree given.

The subject is HEAD (the code commit) over BASE (main at f7ea8584, after PRs 534, 537 and 542): the PR 530 round-2 review's N9 (the support-leaf purity test)
and N10 (the S10 alias map), with the PR 545 round-1 review's repairs (R-GP-IMPL-SUPPORT-LEAF-GUARDS-1: F1 and N1-N4, its fix texts
verbatim) and the round-2 review's F2 (R-GP-IMPL-SUPPORT-LEAF-GUARDS-2). HEAD was 3b04b1cd before round 1's repairs and 62499514
before round 2's; every head record was re-run at the repair commit. Inputs (all in
docs/evidence/syzygy-bpyt-6-14/):
  mutants-{head,base}-{absent,present}.json  tools/mutants.py in a clean clone at each commit, with every dist/ absent and with
                         all twelve built; the reviewer's fragments are read from the committed round-2 records, and the PR 545
                         round-1 reviewer's from reviewer-r1-fragments.json (tools/reviewer_r1_fragments.py over that review's records);
  shared-reader-identity.json  tools/shared_reader_identity.py: the testkit's reader and list against the two copies it replaces;
  bundle-differential.json     tools/bundle_differential.py: the S10 bundle at BASE and at HEAD, byte for byte;
  titles.json, suite-head.json tools/titles.py over the three changed test files, and tools/suite_run.py over the whole suite;
  residuals-head.json          tools/residuals.py: the forms the guards are known to pass (R1, R2, and the round-1 review's Y3, Y5b, Y5c
                               and Z7), disclosed;
  bundle-test-durations.json   scripts/measure_vitest_test_durations.py --mode alone --runs 5 over no-egress.test.ts: the bundle
                               test, its explicit timeout removed (PR 537's rule), and round 1's guard row run under vitest's 5 s default;
  no-egress-hook-durations.json  docs/evidence/syzygy-bpyt-4-31/tools/measure_vitest_hook_durations.py --runs 5: the file's
                               beforeAll, which now derives the aliases and bundles under the guard, under the 10 s hook default.
Usage: python3 -I summary.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy
import hashlib
import json
import subprocess
import sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-6-14'
BASE = 'f7ea858480b30ffc4407154a84d1d03f3fe4a549'
HEAD = '191d82779ea07f45be612b00ff3cafc9aa7446b8'
SUBJECT = sorted(['packages/polaris-dossier/src/no-egress.test.ts', 'packages/support/src/purity.testkit.ts',
                  'packages/support/src/support-purity.test.ts', 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'])
RUNS = [('head', 'absent'), ('head', 'present'), ('base', 'absent'), ('base', 'present')]
# What the bead requires to fail at HEAD, in both dist/ states: N9's named reviewer mutants and N10's two.
REQUIRED = [f'RP{n}' for n in range(2, 17)] + ['E6', 'E7', 'E8', 'E9', 'M1', 'M2']
ROUND2 = 'docs/evidence/support-leaf-review-2026-10-27/round-2'
S10 = 'the S10 bundle takes each workspace package from the source its entry names (syzygy-bpyt.6.14)'
BUNDLE_TEST = f'{S10} bundles the driver with every @syzygy specifier inside packages/*/src or apps/*/src'
# The PR 545 round-1 review: the four records its fragments were copied from, by the digests its section 8 lists, and the one row
# each of its mutants (and round 2's W5-W7) must fail at HEAD, in both dist/ states, and no other (each row is the fix the review
# proposed for it).
ROUND1_PR545 = 'docs/evidence/syzygy-bpyt-6-14/reviewer-r1-fragments.json'
ROUND1_RECORDS = {
    'rev-mutants-head-present.json': '04961acfcac6cfae905f979c8d13e7096fef4e0651eb36d5ebf32211df53014d',
    'rev-mutants-head-absent.json': 'b6623dc44fedade48769bae346bd0ce7e5dfc2cf27d6f41f6931ef7ffccee7af',
    'rev-mutants-head-present-z7.json': 'c8270cea6cfc6cb57a9c61ac2eca7d5162066726b11db8859e1d98f46c9950ce',
    'fix-check2.json': '5e6c29928004d8f9a1719ffffa7622772c70924f69c94090802599f334440e1e',
}
F1_ROW = '@syzygy/support stays a pure leaf takes only createHash from node:crypto, by its own name, and re-exports nothing from it'
N1_ROW = '@syzygy/support stays a pure leaf lists a module at any depth and with any extension, and skips only the tests and the testkit'
N2_ROW = 'the forbidden-token list both guards stand on is the literal list, so a narrowed token fails here'
N3_ROW = '@syzygy/support stays a pure leaf assigns to no property in any source, so no allowed global is rewritten'
N4_ROW = f'{S10} bundles the driver only under the guard: an alias that leaves the sources fails it'
KILLED_BY = {**{p: [F1_ROW] for p in ['Y7', 'Y9', 'Y10', 'Y11', 'Y12', 'Y14']}, 'K4': [N2_ROW], 'Y6': [N3_ROW], 'T1': [N1_ROW],
             'M5': [N4_ROW], 'G0': [N4_ROW], **{p: [N1_ROW] for p in ['W5', 'W6', 'W7']}}
RESIDUALS = ['R1', 'R2', 'Y3', 'Y5b', 'Y5c', 'Z7']


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], capture_output=True, text=True, check=True).stdout


def load():
    inputs = {f'{side}-{dist}': json.load(open(HERE / f'mutants-{side}-{dist}.json')) for side, dist in RUNS}
    for name in ['shared-reader-identity', 'bundle-differential', 'titles', 'suite-head', 'residuals-head', 'bundle-test-durations', 'no-egress-hook-durations']:
        inputs[name] = json.load(open(HERE / f'{name}.json'))
    return inputs


def reviewer_rows():
    rows = {}
    for name in ['purity-mutants.json', 'purity-mutants-2.json', 'egress-mutants-2.json', 'egress-mutants-3.json']:
        data = json.loads(git('show', f'HEAD:{ROUND2}/{name}'))
        for row in data['rows'] if isinstance(data, dict) else data:
            rows[row['id']] = [{'path': e['path'], 'old': e['old'], 'new': e['new']} for e in row['edits']]
    return rows


def derive(inputs):
    failures = []
    check = lambda ok, what: ok or failures.append(what)
    commits = {'head': HEAD, 'base': BASE}
    reviewer = reviewer_rows()
    record_digests = {f'{ROUND2}/{n}': hashlib.sha256(git('show', f'HEAD:{ROUND2}/{n}').encode()).hexdigest()
                      for n in ['purity-mutants.json', 'purity-mutants-2.json', 'egress-mutants-2.json', 'egress-mutants-3.json']}
    r1 = json.loads(git('show', f'HEAD:{ROUND1_PR545}'))
    r1_digest = hashlib.sha256(git('show', f'HEAD:{ROUND1_PR545}').encode()).hexdigest()
    check(r1['records'] == ROUND1_RECORDS and r1['reviewedCommit'] == '5995aa3c0a23f4862f7107c401a72a222b8a7998', 'round-1 fragments: not copied from the records the review lists')
    mutants = {}
    for side, dist in RUNS:
        run = inputs[f'{side}-{dist}']
        key = f'{side}-{dist}'
        check(run['commit'] == commits[side] and run['side'] == side and run['dist'] == dist, f'{key}: commit, side or dist')
        check(len(run['distDirs']) == (12 if dist == 'present' else 0), f'{key}: dist dirs')
        check(run['statusAfter'] == '' and run['leftovers'] == [], f'{key}: tree not restored')
        check(run['reviewerRecords'] == record_digests, f'{key}: reviewer records differ from the committed round-2 bytes')
        if side == 'head':
            check(run.get('reviewerR1Record') == r1_digest, f'{key}: round-1 fragments differ from the committed copy')
        for row in run['rows']:
            rid = row['id']
            if rid in reviewer:
                check(row['edits'] == reviewer[rid], f'{key} {rid}: edits differ from the reviewer record')
            if rid in r1['fragments']:
                check(side == 'head' and row['edits'] == r1['fragments'][rid]['edits'], f'{key} {rid}: edits differ from the round-1 record')
            if side == 'head' and rid.split('-')[0] in KILLED_BY:
                failing = sorted({t['name'] for t in row['failedTests']} | {f'file: {m.splitlines()[0][:160]}' for m in row['fileMessages']})
                check(failing == KILLED_BY[rid.split('-')[0]], f'{key} {rid}: killed by {failing}, not {KILLED_BY[rid.split("-")[0]]}')
            check(row['observed'] == row['expected'], f'{key} {rid}: observed {row["observed"]}, expected {row["expected"]}')
            entry = mutants.setdefault(rid, {})
            entry[key] = row['observed']
            if side == 'head' and row['observed'] == 'killed':
                entry.setdefault('killedAtHeadBy', sorted({t['name'] for t in row['failedTests']} | {f'file: {m.splitlines()[0][:160]}' for m in row['fileMessages']}))
    for prefix in REQUIRED + list(KILLED_BY):
        ids = [rid for rid in mutants if rid.split('-')[0] == prefix]
        check(len(ids) == 1, f'{prefix}: {len(ids)} rows')
        for rid in ids:
            check(all(mutants[rid].get(f'head-{d}') == 'killed' for d in ['absent', 'present']), f'{rid}: not killed at HEAD in both dist states')
    identity = inputs['shared-reader-identity']
    check(identity['base'] == BASE and identity['head'] == HEAD and identity['allAgree'] is True, 'shared reader: copies disagree')
    bundle = inputs['bundle-differential']
    check([r['commit'] for r in bundle['runs']] == [BASE, HEAD] and bundle['identical'] is True, 'bundle differential')
    check(all(r['failed'] == 0 and r['exit'] == 0 and r['statusAfter'] == '' for r in bundle['runs']), 'bundle differential: a run failed')
    titles = inputs['titles']
    check(titles['baseCommit'] == BASE and titles['headCommit'] == HEAD and titles['duplicatesHead'] == [], 'titles')
    suite = inputs['suite-head']
    check(suite['commit'] == HEAD and suite['exit'] == 0 and suite['failed'] == 0 and suite['cleanAfter'] is True, 'suite at HEAD')
    residuals = inputs['residuals-head']
    check(residuals['commit'] == HEAD and residuals['statusAfter'] == '', 'residuals: commit or tree')
    check([(r['id'].split('-')[0], r['observed']) for r in residuals['rows']] == [(rid, 'survives') for rid in RESIDUALS], 'residuals: a disclosed form no longer survives')
    check(residuals.get('reviewerR1Record') == r1_digest, 'residuals: round-1 fragments differ from the committed copy')
    for row in residuals['rows']:
        if row['id'] in r1['fragments']:
            check(row['edits'] == r1['fragments'][row['id']]['edits'], f"residuals {row['id']}: edits differ from the round-1 record")
    durations = inputs['bundle-test-durations']
    bundle_ms = [t['durationMs'] for r in durations['runs'] for t in r['tests'] if t['name'] == BUNDLE_TEST and t['status'] == 'passed']
    guard_ms = [t['durationMs'] for r in durations['runs'] for t in r['tests'] if t['name'] == N4_ROW and t['status'] == 'passed']
    check(durations['subject']['commit'] == HEAD and durations['mode'] == 'alone' and len(durations['runs']) == 5 and all(r['exitCode'] == 0 for r in durations['runs']), 'durations: commit, mode or runs')
    check(len(bundle_ms) == 5 and max(bundle_ms) <= 5000, f'durations: the bundle test {bundle_ms}')
    check(len(guard_ms) == 5 and max(guard_ms) <= 5000, f'durations: the guard row {guard_ms}')
    hooks = inputs['no-egress-hook-durations']
    before_ms = [s['beforeAllMs'] for r in hooks['runs'] for s in r['suites'] if s['suite'] == '(file)']
    check(hooks['subject']['commit'] == HEAD and len(hooks['runs']) == 5 and all(r['exitCode'] == 0 for r in hooks['runs']), 'hooks: commit or runs')
    check(len(before_ms) == 5 and max(before_ms) <= 10000, f'hooks: the file beforeAll {before_ms}')
    # HEAD carries this directory's first records (at dff82655 over d621bfa2, before main was merged), so they are not the subject.
    changed = sorted(p for p in git('diff', '--name-only', BASE, HEAD).split() if not p.startswith('docs/evidence/syzygy-bpyt-6-14/'))
    check(changed == SUBJECT, f'subject: {changed}')
    since = sorted(git('diff', '--name-only', HEAD, 'HEAD').split())
    check(all(p.startswith('docs/evidence/syzygy-bpyt-6-14/') for p in since), f'tree HEAD changes more than this evidence since {HEAD}: {since}')
    summary = {
        'bead': 'syzygy-bpyt.6.14', 'base': BASE, 'head': HEAD, 'subject': SUBJECT,
        'subjectSha256': {p: hashlib.sha256(subprocess.run(['git', '-C', str(TREE), 'show', f'{HEAD}:{p}'], capture_output=True, check=True).stdout).hexdigest() for p in SUBJECT},
        'required': REQUIRED, 'round1KilledBy': KILLED_BY, 'round1Records': ROUND1_RECORDS, 'mutants': mutants,
        'counts': {key: {'rows': len(inputs[key]['rows']), 'killed': sum(r['observed'] == 'killed' for r in inputs[key]['rows']),
                         'survives': sum(r['observed'] == 'survives' for r in inputs[key]['rows']),
                         'pass': sum(r['observed'] == 'pass' for r in inputs[key]['rows'])} for key in [f'{s}-{d}' for s, d in RUNS]},
        'sharedReaderSha256': {n: c['sha256'] for n, c in identity['copies'].items()},
        'bundle': [{k: r[k] for k in ['commit', 'distDirs', 'bytes', 'sha256']} for r in bundle['runs']],
        'titles': {k: titles[k] for k in ['base', 'head', 'added', 'removed']},
        'suite': {k: suite[k] for k in ['commit', 'distDirs', 'files', 'total', 'passed', 'failed', 'skipped']},
        'residualsSurviving': [r['id'] for r in residuals['rows'] if r['observed'] == 'survives'],
        'bundleTestMs': {'runs': bundle_ms, 'load1Max': max(r['load1']['max'] for r in durations['runs'])},
        'guardRowMs': guard_ms,
        'beforeAllMs': {'runs': before_ms, 'load1Max': max(r['load1']['max'] for r in hooks['runs'])},
        'checksFailed': failures,
    }
    return summary


def main():
    mode = sys.argv[2] if len(sys.argv) > 2 else None
    inputs = load()
    summary = derive(inputs)
    if mode == '--selftest':
        def flip(i):
            i['head-absent']['rows'][1]['observed'] = 'survives'
        def commit(i):
            i['base-present']['commit'] = HEAD
        def status(i):
            i['head-present']['statusAfter'] = ' M packages/support/package.json\n'
        def fragment(i):
            row = next(r for r in i['head-present']['rows'] if r['id'].startswith('RP6-'))
            row['edits'][0]['new'] = row['edits'][0]['new'].replace("'node:f' + 's'", "'node:fs'")
        def dropped(i):
            i['head-absent']['rows'] = [r for r in i['head-absent']['rows'] if not r['id'].startswith('E9-')]
        def survived(i):
            row = next(r for r in i['head-present']['rows'] if r['id'].startswith('M2-'))
            row['observed'] = row['expected'] = 'survives'
        def dist(i):
            i['head-absent']['distDirs'] = ['packages/support/dist']
        def identity(i):
            i['shared-reader-identity']['allAgree'] = False
        def bundle(i):
            i['bundle-differential']['identical'] = False
        def suite(i):
            i['suite-head']['failed'] = 1
        def residual(i):
            i['residuals-head']['rows'][0]['observed'] = 'killed'
        def hook(i):
            next(s for s in i['no-egress-hook-durations']['runs'][4]['suites'] if s['suite'] == '(file)')['beforeAllMs'] = 10001
        def slow(i):
            next(t for t in i['bundle-test-durations']['runs'][2]['tests'] if t['name'] == BUNDLE_TEST)['durationMs'] = 5001
        def slow_guard(i):
            next(t for t in i['bundle-test-durations']['runs'][3]['tests'] if t['name'] == N4_ROW)['durationMs'] = 5001
        def attribution(i):
            row = next(r for r in i['head-present']['rows'] if r['id'].startswith('T1-'))
            row['failedTests'] = [*row['failedTests'], {'name': F1_ROW, 'message': ''}]
        def r1_fragment(i):
            row = next(r for r in i['head-absent']['rows'] if r['id'].startswith('Y11-'))
            row['edits'][0]['new'] = row['edits'][0]['new'].replace("'randomBytes' as value", 'randomBytes as value')
        def r1_dropped(i):
            i['head-present']['rows'] = [r for r in i['head-present']['rows'] if not r['id'].startswith('G0-')]
        def r1_record(i):
            i['head-absent']['reviewerR1Record'] = '0' * 64
        def residual_r1(i):
            next(r for r in i['residuals-head']['rows'] if r['id'].startswith('Z7-'))['observed'] = 'killed'
        survivors = []
        mutations = [flip, commit, status, fragment, dropped, survived, dist, identity, bundle, suite, residual, slow, hook,
                     slow_guard, attribution, r1_fragment, r1_dropped, r1_record, residual_r1]
        for mutate in mutations:
            mutated = copy.deepcopy(inputs)
            mutate(mutated)
            if not derive(mutated)['checksFailed']:
                survivors.append(mutate.__name__)
        print('selftest:', f'all {len(mutations)} mutations caught' if not survivors else f'survived: {survivors}')
        sys.exit(1 if survivors or summary['checksFailed'] else 0)
    if mode == '--check':
        stored = json.load(open(HERE / 'summary.json'))
        ok = stored == summary and not summary['checksFailed']
        print('check:', 'summary.json matches its inputs and no check fails' if ok else f"FAIL {summary['checksFailed']} equal={stored == summary}")
        sys.exit(0 if ok else 1)
    json.dump(summary, open(HERE / 'summary.json', 'w'), indent=1)
    print(json.dumps({k: summary[k] for k in ['counts', 'checksFailed']}, indent=1))


if __name__ == '__main__':
    main()
