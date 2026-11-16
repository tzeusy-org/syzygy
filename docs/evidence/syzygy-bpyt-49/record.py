"""syzygy-bpyt.49: derive summary.json from the records beside it, checking each against the git objects of the tree given.

The subject is CODE over BASE (main at a1b9bde2), both fixed commits: the PR 547 round-1 review's notes N1, N2 and N3, from
docs/reviews/R-GP-IMPL-GUARD-PINS-NOTES-1-RAW.md. Inputs (all in this directory, each run in a clean clone at CODE):
  mutants.json                      mutants.py: rule 6 for 8.39's record.py (N2) and bpyt.39's record.py (N3), one edit at a time;
  guard.json                        guard_probe.py: both npm probes' ancestor guard (N1), unmutated and mutated, and a re-run of
                                    root_exception_probe.py compared byte for byte with the committed record;
  npmrc-trace-lane-probe-guarded.json  docs/evidence/syzygy-bpyt-39/npmrc_trace.py over CODE's npm_alias_probe.py, run from a
                                    directory holding a `.npmrc`, with the record compared with the committed npm-alias-probe.json.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE_REL = 'docs/evidence/syzygy-bpyt-49'
HERE = TREE / HERE_REL
BASE = 'a1b9bde272f21dd5f110498c39e95f9f827344f4'
CODE = 'e8cd624ecb58e24f763c35276eb7764373f5746e'
R839 = 'docs/evidence/syzygy-bpyt-8-39/record.py'
R39 = 'docs/evidence/syzygy-bpyt-39/record.py'
PROBE = 'docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py'
ROOT_PROBE = 'docs/evidence/syzygy-bpyt-39/root_exception_probe.py'
ROOT_RECORD = 'docs/evidence/syzygy-bpyt-39/root-exception-probe.json'
SUBJECT = sorted([PROBE, R839, 'docs/evidence/syzygy-bpyt-8-39/summary.json', ROOT_PROBE, ROOT_RECORD, R39,
                  'docs/evidence/syzygy-bpyt-39/summary.json', 'docs/evidence/syzygy-bpyt-39/npmrc-trace-root-exception-probe.json'])
PATHS = ['a non-evidence path changed since the suite ran', "another bead's evidence path changed since the suite ran"]
# What each mutants.py row must leave SURVIVED, and each unmutated selftest's tally.
SURVIVORS = {'N2-0-unmutated': [], 'N2-H1-hook-bypassed': PATHS, 'N2-H3-exclusion-widened-to-docs': PATHS[1:],
             'N2-H4-every-path-but-the-testkit-excluded': PATHS, 'N2-S5-path-test-dropped': PATHS,
             'N3-0-unmutated': [], 'N3-P5': ['a root case app does not load from the workspace'],
             'N3-P10': ['a lane trace compared with another record'], 'N3-P12': ['a comment-only selftest that misses a rename'],
             'N3-P16': ['an unmutated predicate run that fails'], 'N3-E1': ['a root case npm installs as a copy'],
             'N3-E2': ['a root case whose install fails'], 'N3-E5': ['a testkit that states a root exception twice'],
             'N3-E7': ['a root case app does not load from the workspace'],
             'N3-C1-trace-record-check-dropped': ['a root-exception trace of another run']}
TALLIES = {'N2-0-unmutated': 'selftest: 77/77', 'N3-0-unmutated': 'selftest: 27/27'}
CASES = ['parent-package-json', 'parent-node-modules', 'grandparent-package-json']
UNREFUSED = {'G0-unmutated': [], 'G1-node-modules-not-looked-for': ['parent-node-modules'],
             'G2-package-json-not-looked-for': ['parent-package-json', 'grandparent-package-json'],
             'G3-only-the-parent-looked-at': ['grandparent-package-json']}
BUILTIN = '/lib/node_modules/npm/npmrc'
MUTATE = {}


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], capture_output=True, text=True, check=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def blob(path):
    return subprocess.run(['git', '-C', str(TREE), 'show', f'{CODE}:{path}'], capture_output=True, check=True).stdout


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def hooked(key, value):
    return MUTATE[f'@{key}'](value) if f'@{key}' in MUTATE else value


def summary():
    problems = []
    m = load('mutants.json')
    if m['commit'] != CODE:
        problems.append('mutants: not run at CODE')
    if [r['id'] for r in m['rows']] != list(SURVIVORS):
        problems.append('mutants: the rows are not the ones named here, in order')
    for r in m['rows']:
        want = SURVIVORS.get(r['id'])
        source = blob(r['record']).decode()
        if r['record'] != (R839 if r['id'].startswith('N2') else R39) or r['recordSha256'] != sha(source):
            problems.append(f"mutants {r['id']}: not CODE's {r['record']}")
        if (r['old'] is None) != r['id'].endswith('-unmutated') or (r['old'] is not None and (source.count(r['old']) != 1 or r['old'] == r['new'])):
            problems.append(f"mutants {r['id']}: the edit is not one change to one fragment of CODE's record")
        if r['check']['exit'] != 0 or r['selftest']['survived'] != want or (r['selftest']['exit'] == 0) != (not want):
            problems.append(f"mutants {r['id']}: check exit {r['check']['exit']}, survived {r['selftest']['survived']}, not {want}")
        if r['id'] in TALLIES and r['selftest']['tally'] != TALLIES[r['id']]:
            problems.append(f"mutants {r['id']}: {r['selftest']['tally']}, not {TALLIES[r['id']]}")
    g = load('guard.json')
    if g['commit'] != CODE:
        problems.append('guard: not run at CODE')
    if [(r['probe'], r['id']) for r in g['rows']] != [(p, mid) for p in (PROBE, ROOT_PROBE) for mid in UNREFUSED]:
        problems.append('guard: the rows are not each guard mutant of each probe, in order')
    for r in g['rows']:
        source = blob(r['probe']).decode()
        if r['probeSha256'] != sha(source) or (r['old'] is not None and (source.count(r['old']) != 1 or r['old'] == r['new'])):
            problems.append(f"guard {r['probe']} {r['id']}: not one edit of CODE's probe")
        if sorted(r['cases']) != sorted(CASES):
            problems.append(f"guard {r['probe']} {r['id']}: the cases are not the three named here")
        for case, c in r['cases'].items():
            open_case = case in UNREFUSED.get(r['id'], [])
            if c['refused'] == open_case or c['recordWritten'] != open_case or (c['exit'] == 0) != open_case:
                problems.append(f"guard {r['probe']} {r['id']} {case}: refused {c['refused']}, record {c['recordWritten']}, exit {c['exit']}")
    rerun = g['rootExceptionRerun']
    if rerun['exit'] != 0 or rerun['equalsCommitted'] is not True or rerun['record'] != ROOT_RECORD or rerun['recordSha256'] != sha(blob(ROOT_RECORD)):
        problems.append('guard: the root-exception probe re-run did not write the committed record')
    t = load('npmrc-trace-lane-probe-guarded.json')
    builtin = [x for x in t['npmrcOutsideScratch'] if x['path'].endswith(BUILTIN)]
    if t['probe'] != PROBE or t['probeSha256'] != sha(blob(PROBE)) or t['exit'] != 0:
        problems.append("npmrc-trace: not a passing run of CODE's npm_alias_probe.py")
    if t['callerNpmrcOpened'] or len(builtin) != len(t['npmrcOutsideScratch']) or not builtin or any(x['result'] != 'ENOENT' for x in builtin):
        problems.append("npmrc-trace: opens an npmrc outside the scratch directory other than npm's absent builtin one")
    if t['recordEqualsReference'] is not True or t['reference'] != 'docs/evidence/syzygy-bpyt-8-39/npm-alias-probe.json':
        problems.append('npmrc-trace: the record is not the committed npm-alias-probe.json')
    changed = hooked('names', sorted(p for p in git('diff', '--name-only', BASE, CODE).split() if not p.startswith(f'{HERE_REL}/')))
    if changed != SUBJECT:
        problems.append(f'subject: {changed}')
    return {
        'bead': 'syzygy-bpyt.49', 'base': BASE, 'code': CODE, 'subject': SUBJECT,
        'subjectSha256': {p: sha(blob(p)) for p in SUBJECT},
        'mutants': {r['id']: {'tally': r['selftest']['tally'], 'survived': r['selftest']['survived']} for r in m['rows']},
        'guard': {f"{r['probe'].split('/')[-1]} {r['id']}": sorted(k for k, c in r['cases'].items() if not c['refused']) for r in g['rows']},
        'rootExceptionRerunEqual': rerun['equalsCommitted'],
        'laneTrace': {'callerNpmrc': t['callerNpmrcOpened'], 'builtinOpens': sum(x['count'] for x in builtin),
                      'recordEqualsReference': t['recordEqualsReference']},
        'tools': {name: sha((HERE / name).read_text()) for name in ['mutants.py', 'guard_probe.py', 'site_drop.py', 'record.py']},
        'problems': problems,
    }


row = lambda d, rid: next(r for r in d['rows'] if r['id'] == rid)
guard_row = lambda d, probe, rid: next(r for r in d['rows'] if r['probe'] == probe and r['id'] == rid)
SELFTEST = {
    'mutants run at another commit': {'mutants.json': lambda d: (d.update(commit=BASE), d)[1]},
    'a mutants row missing': {'mutants.json': lambda d: (d.update(rows=d['rows'][:-1]), d)[1]},
    'a mutant of another record.py': {'mutants.json': lambda d: (row(d, 'N2-H3-exclusion-widened-to-docs').update(recordSha256='0' * 64), d)[1]},
    'a mutant whose fragment is not in the record': {'mutants.json': lambda d: (row(d, 'N3-E5').update(old='kit.count(t) != 2'), d)[1]},
    'a mutant that changes nothing': {'mutants.json': lambda d: (row(d, 'N3-E2').update(new=row(d, 'N3-E2')['old']), d)[1]},
    'an unmutated row carrying an edit': {'mutants.json': lambda d: (row(d, 'N2-0-unmutated').update(old='x', new='y'), d)[1]},
    'a widened filter that no entry sees': {'mutants.json': lambda d: (row(d, 'N2-H3-exclusion-widened-to-docs')['selftest'].update(survived=[], exit=0), d)[1]},
    'a mutant whose check no longer matches': {'mutants.json': lambda d: (row(d, 'N3-P10')['check'].update(exit=1), d)[1]},
    'a mutant that survives but exits 0': {'mutants.json': lambda d: (row(d, 'N3-C1-trace-record-check-dropped')['selftest'].update(exit=0), d)[1]},
    'an unmutated selftest of another size': {'mutants.json': lambda d: (row(d, 'N3-0-unmutated')['selftest'].update(tally='selftest: 26/26'), d)[1]},
    'a guard run at another commit': {'guard.json': lambda d: (d.update(commit=BASE), d)[1]},
    'a guard row missing': {'guard.json': lambda d: (d.update(rows=d['rows'][1:]), d)[1]},
    'a guard row of another probe': {'guard.json': lambda d: (guard_row(d, ROOT_PROBE, 'G1-node-modules-not-looked-for').update(probeSha256='0' * 64), d)[1]},
    'a guard mutant whose fragment is not in the probe': {'guard.json': lambda d: (guard_row(d, PROBE, 'G3-only-the-parent-looked-at').update(old='    up = up\n'), d)[1]},
    'a guard case missing': {'guard.json': lambda d: (guard_row(d, PROBE, 'G0-unmutated')['cases'].pop('parent-node-modules'), d)[1]},
    'a guard that lets a node_modules parent through': {'guard.json': lambda d: (guard_row(d, PROBE, 'G0-unmutated')['cases']['parent-node-modules'].update(
        refused=False, recordWritten=True, exit=0), d)[1]},
    'a guard mutant that still refuses its case': {'guard.json': lambda d: (guard_row(d, ROOT_PROBE, 'G3-only-the-parent-looked-at')['cases']['grandparent-package-json'].update(
        refused=True, recordWritten=False, exit=1), d)[1]},
    'a refused case that wrote a record': {'guard.json': lambda d: (guard_row(d, ROOT_PROBE, 'G0-unmutated')['cases']['parent-package-json'].update(recordWritten=True), d)[1]},
    'a refused case that exits 0': {'guard.json': lambda d: (guard_row(d, PROBE, 'G2-package-json-not-looked-for')['cases']['parent-node-modules'].update(exit=0), d)[1]},
    'a root-exception re-run that differs': {'guard.json': lambda d: (d['rootExceptionRerun'].update(equalsCommitted=False), d)[1]},
    'a root-exception re-run of another record': {'guard.json': lambda d: (d['rootExceptionRerun'].update(recordSha256='0' * 64), d)[1]},
    'a lane trace of another probe': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(probeSha256='0' * 64), d)[1]},
    "a lane trace that read the caller's npmrc": {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(callerNpmrcOpened=[
        {'path': '/tmp/caller/.npmrc', 'call': 'openat', 'result': 'ok', 'count': 1}]), d)[1]},
    'a lane trace that read an ancestor npmrc': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d['npmrcOutsideScratch'].append(
        {'path': '/tmp/p/.npmrc', 'call': 'openat', 'result': 'ok', 'count': 1}), d)[1]},
    'a lane trace whose builtin npmrc was present': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d['npmrcOutsideScratch'][0].update(result='ok'), d)[1]},
    'a lane trace whose record changed': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(recordEqualsReference=False), d)[1]},
    'a lane trace compared with another record': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(reference=ROOT_RECORD), d)[1]},
    'a product file in the subject': {'@names': lambda names: sorted([*names, 'packages/support/src/index.ts'])},
}


def main():
    if '--selftest' in sys.argv[2:]:
        if summary()['problems']:
            print('selftest: the unmutated inputs already fail', summary()['problems'])
            sys.exit(1)
        survived = []
        for label, mutation in SELFTEST.items():
            MUTATE.clear()
            MUTATE.update(mutation)
            problems = summary()['problems']
            print('killed' if problems else 'SURVIVED', '|', label, '|', problems[:1])
            if not problems:
                survived.append(label)
        MUTATE.clear()
        print(f'selftest: {len(SELFTEST) - len(survived)}/{len(SELFTEST)} mutations make a check fail')
        sys.exit(1 if survived else 0)
    text = json.dumps(summary(), indent=1) + '\n'
    if '--check' in sys.argv[2:]:
        same = (HERE / 'summary.json').read_text() == text
        problems = json.loads(text)['problems']
        print('summary.json', 'matches' if same else 'DIFFERS', '; problems:', len(problems), problems[:3])
        sys.exit(0 if same and not problems else 1)
    (HERE / 'summary.json').write_text(text)
    print('wrote summary.json; problems:', json.loads(text)['problems'])


main()
