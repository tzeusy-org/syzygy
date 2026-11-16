"""syzygy-bpyt.6.15: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

The subject is HEAD over BASE (main after PR 536): the PR 535 review's N9 (packages/support, which PR 530 created, had no
observer-input prefix) and N6 (the gate's rows pinned two paths per package). Inputs (all in this directory):
  gate-diff.json         gate_diff.py: the gate at BASE and at HEAD on every tracked path and nine probes, each side from its build;
  closure-*.json         closure.mjs at each commit: what the daemon entry reaches, by the guard's walk and by a TypeScript program,
                         and which of those inputs the built gate accepts;
  v12-*.json, v14-v15-*.json  the PR 535 reviewer's V12, V14 and V15, run unchanged at each commit by its own runner
                         (docs/evidence/host-pins-review-2026-10-27/tools/rev535_mut.py) from its own spec files;
  own-specs.json, own-head.json  six mutants of this bead's predicates, run at HEAD by the same runner;
  titles.json, suite-head.json, dist-absent-head.json  titles.py, suite_run.py and dist_absent.py over the POC project.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-6-15'
BASE = 'bb05df7ea409039c5a6465e7179f9d0c66931ad3'
HEAD = 'f207d758eb11830eda2831caa911011e84a966b7'
GATE = 'apps/three-surface-poc/src/git-observation.ts'
TEST = 'apps/three-surface-poc/src/git-observation.test.ts'
SUBJECT = sorted([GATE, TEST])
GATE_ADDED = ["  // Every workspace package the daemon imports needs a prefix here; git-observation.test.ts derives that set from main.ts.",
              "    'packages/support/',"]
REVIEW = 'docs/evidence/host-pins-review-2026-10-27'
RUNNER = f'{REVIEW}/tools/rev535_mut.py'
GATE_TOOL = 'docs/evidence/syzygy-bpyt-7-3/tools/gate-diff.mjs'
TABLE = f'{TEST} > read-only Git observation protects every file of each protected package, its manifest and tsconfig among them'
GUARD = f'{TEST} > read-only Git observation protects every module and package the POC daemon imports'
ADDED_TITLES = sorted([[TEST, t.split(' > ', 1)[1].replace('read-only Git observation ', 'read-only Git observation > ', 1)] for t in (TABLE, GUARD)])
# Each mutant: the spec file it comes from, and the new rows that must kill it at HEAD (None: it must also survive at BASE).
REVIEWER = {
    'V12-gate-prefix-src-and-manifest-only': ('rev535-specs.json', 'v12', {TABLE, GUARD}),
    'V14-gate-cap1-daemon-prefix-narrowed-to-src': ('rev535-gate-specs.json', 'v14-v15', {TABLE}),
    'V15-gate-three-surface-core-prefix-narrowed-to-src': ('rev535-gate-specs.json', 'v14-v15', {TABLE, GUARD}),
}
OWN = {
    'O1-support-prefix-dropped': {TABLE, GUARD},
    'O2-support-prefix-narrowed-to-src': {TABLE, GUARD},
    'O3-unprefixed-package-imported-statically': {GUARD},
    'O4-unprefixed-package-imported-dynamically-from-core': {GUARD},
    'O5-unresolvable-workspace-specifier': {GUARD},
}
# The subset property: dropping a prefix the daemon does not import fails the table (and the older cap1-daemon row), not the guard.
SUBSET = ('O6-cap1-daemon-prefix-dropped', {TABLE, f'{TEST} > read-only Git observation allows unrelated dirty files while protecting POC runtime inputs'})
SUPPORT_INPUTS = ['packages/support/src/deep-freeze.ts', 'packages/support/src/index.ts', 'packages/support/src/sha256.ts',
                  'packages/support/package.json', 'packages/support/tsconfig.json']
PACKAGES = ['apps/three-surface-poc', 'packages/cap1-core', 'packages/http-host', 'packages/support', 'packages/three-surface-poc-core']
BOUNDARY = {'packages/support': 'accepted', 'packages/supportive/x.ts': 'accepted', 'packages/support-x/src/a.ts': 'accepted',
            'packages/polaris-generation-core/src/index.ts': 'accepted', 'packages/polaris-generation-consent/src/index.ts': 'accepted',
            'apps/syzygy/src/main.ts': 'accepted'}
# Files whose run count exceeds their listed count at HEAD, each by one skipped test (as in syzygy-bpyt.7.15's evidence).
LIST_GAP = {'apps/three-surface-poc/src/project-shape-discovery.live.test.ts': (None, 1),
            'apps/three-surface-poc/src/polaris-opening-index.browser.test.ts': (13, 14)}
SURFACE_TREES = ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src']
MUTATE = {}


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], check=True, capture_output=True, text=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def hooked(key, value):
    """A git-derived value, which --selftest may replace through MUTATE['@<key>']."""
    return MUTATE[f'@{key}'](value) if f'@{key}' in MUTATE else value


def diff_lines(path):
    removed, added = [], []
    for line in git('diff', '-U0', BASE, HEAD, '--', path).splitlines():
        if line.startswith(('---', '+++')):
            continue
        if line.startswith('-'):
            removed.append(line[1:])
        elif line.startswith('+'):
            added.append(line[1:])
    return hooked(f'-{path}', removed), hooked(f'+{path}', added)


def check_run(name, commit, spec_edits, want, problems):
    """One mutant record: run at `commit`, its edits as specified, and killed by exactly `want` (or surviving, when want is None)."""
    d = load(name)
    if d['commit'] != commit:
        problems.append(f'{name}: ran at {d["commit"]}, not {commit}')
    rows = {}
    for r in d['results']:
        if r['id'] not in spec_edits:
            continue
        failed = {row['title'] for row in r['failed']}
        if r['edits'] != spec_edits[r['id']]:
            problems.append(f'{name} {r["id"]}: edits differ from its spec')
        if not r['cleanAfter'] or any(row['timedOut'] for row in r['failed']):
            problems.append(f'{name} {r["id"]}: tree left dirty, or a timeout')
        expected = want(r['id'])
        if expected is None and (r['outcome'] != 'survived' or failed):
            problems.append(f'{name} {r["id"]}: {r["outcome"]} at {commit[:8]}, not survived')
        if expected is not None and (r['outcome'] != 'killed' or failed != expected):
            problems.append(f'{name} {r["id"]}: {r["outcome"]} by {sorted(failed)}, not killed by {sorted(expected)}')
        rows[r['id']] = {'outcome': r['outcome'], 'failed': sorted(failed), 'totalTests': r['totalTests']}
    missing = sorted(set(spec_edits) - set(rows))
    if missing:
        problems.append(f'{name}: never ran {missing}')
    return rows


def surface_version(commit):
    trees = [git('rev-parse', f'{commit}:{path}').strip() for path in SURFACE_TREES]
    return 'polaris@' + sha('\n'.join(trees))[:12]


def summary():
    problems = []
    names = hooked('names', sorted(git('diff', '--name-only', BASE, HEAD).split()))
    if names != SUBJECT:
        problems.append(f'subject: {sorted(set(names) ^ set(SUBJECT))} differ from the stated file list')
    removed, added = diff_lines(GATE)
    if removed or added != GATE_ADDED:
        problems.append(f'{GATE}: removes {removed} and adds {added}, not only the support prefix and its comment')
    removed, added = diff_lines(TEST)
    if removed:
        problems.append(f'{TEST}: removes {removed}; the bead only adds rows')

    # The gate itself, from each side's build: only packages/support/ paths change, from accepted to refused.
    gate = load('gate-diff.json')
    if (gate['base'], gate['head']) != (BASE, HEAD) or gate['toolSha256'] != sha(git('show', f'{HEAD}:{GATE_TOOL}').encode()):
        problems.append('gate-diff.json: not BASE against HEAD, or not by the syzygy-bpyt.7.3 gate-diff.mjs')
    support_paths = sorted(p for p in git('ls-tree', '-r', '--name-only', HEAD, '--', 'packages/support').split())
    differing = sorted(p for p, _, _ in gate['differing'])
    probes = [p for p in gate['probes'] if p.startswith('packages/support/')]
    if differing != sorted(set(support_paths) | set(probes)) or not all(b == 'accepted' and h == 'refused' for _, b, h in gate['differing']):
        problems.append(f'gate-diff.json: the differing decisions are not exactly the support paths, accepted to refused: {differing[:4]}')
    if gate['refused']['head'] - gate['refused']['base'] != len(differing):
        problems.append('gate-diff.json: the refusal counts do not move by the differing paths alone')
    for path, decision in BOUNDARY.items():
        if gate['probeDecisions'].get(path) != [decision, decision]:
            problems.append(f'gate-diff.json: probe {path} is {gate["probeDecisions"].get(path)}, not {decision} at both')

    # The daemon's closure: the same packages by both methods at both commits; at BASE the support inputs are unprotected.
    closure = {}
    for side, commit, want in (('base', BASE, SUPPORT_INPUTS), ('head', HEAD, [])):
        c = load(f'closure-{side}.json')
        if c['commit'] != commit or c['unresolved'] or not c['methodsAgree'] or c['walkPackages'] != PACKAGES:
            problems.append(f'closure-{side}.json: not a resolved, agreeing walk over {PACKAGES} at {side}')
        if sorted(c['unprotected']) != sorted(want):
            problems.append(f'closure-{side}.json: unprotected inputs {c["unprotected"]}, not {want}')
        closure[side] = {'reachable': c['reachable'], 'inputs': c['inputs'], 'unprotected': c['unprotected']}

    # Rule 6: the reviewer's three mutants survive at BASE and are killed at HEAD by the new rows; this bead's own six at HEAD.
    mutants = {}
    for mutant, (spec_file, record, rows) in REVIEWER.items():
        spec = {m['id']: m['edits'] for m in json.loads(git('show', f'{HEAD}:{REVIEW}/{spec_file}'))['mutants'] if m['id'] == mutant}
        mutants[f'{mutant}@base'] = check_run(f'{record}-base.json', BASE, spec, lambda _i: None, problems).get(mutant)
        mutants[f'{mutant}@head'] = check_run(f'{record}-head.json', HEAD, spec, lambda _i, rows=rows: rows, problems).get(mutant)
    own = {m['id']: m['edits'] for m in load('own-specs.json')['mutants']}
    if set(own) != set(OWN) | {SUBSET[0]}:
        problems.append(f'own-specs.json: mutants {sorted(own)} are not the six stated')
    for mutant, edits in own.items():
        for e in edits:
            if git('show', f'{HEAD}:{e["file"]}').count(e['old']) != 1:
                problems.append(f'own-specs.json {mutant}: old fragment does not occur once in {e["file"]} at HEAD')
    rows = check_run('own-head.json', HEAD, own, lambda i: OWN.get(i, SUBSET[1]), problems)
    mutants.update({f'{i}@head': r for i, r in rows.items()})

    # Tests.
    titles = load('titles.json')
    if (titles['baseCommit'], titles['headCommit']) != (BASE, HEAD) or titles['removed'] or sorted(titles['added']) != ADDED_TITLES \
            or titles['head'] != titles['base'] + 2 or titles['duplicatesBase'] or titles['duplicatesHead']:
        problems.append(f'titles.json: {len(titles["added"])} added, {len(titles["removed"])} removed, not the two new rows')
    suite = load('suite-head.json')
    if suite['commit'] != HEAD or not suite['cleanAfter'] or suite['exit'] != 0 or suite['failed'] or suite['total'] != suite['passed'] + suite['skipped']:
        problems.append(f'suite-head.json: exit {suite["exit"]}, {suite["failed"]} failed, at {suite["commit"][:8]}')
    listed = {f: c['head'] for f, c in titles['perFile'].items() if c['head']}
    gap = {f: (listed.get(f), n) for f, n in suite['perFile'].items() if listed.get(f) != n}
    gap.update({f: (n, suite['perFile'].get(f)) for f, n in listed.items() if f not in suite['perFile']})
    if gap != LIST_GAP or suite['skipped'] != len(LIST_GAP) or suite['total'] != titles['head'] + len(LIST_GAP):
        problems.append(f'suite-head.json: run and list counts differ other than by the two skipped tests: {gap}')
    absent = load('dist-absent-head.json')
    new_titles = {t.split(' > ', 1)[1] for t in (TABLE, GUARD)}
    if absent['commit'] != HEAD or absent['distAfterRemoval'] or absent['exit'] != 0 or absent['failed'] or not new_titles <= set(absent['titles']):
        problems.append('dist-absent-head.json: the gate tests do not pass, both new rows among them, with no dist')

    version = {'base': surface_version(BASE), 'head': surface_version(HEAD)}
    return {
        'bead': 'syzygy-bpyt.6.15', 'base': BASE, 'head': HEAD, 'subject': SUBJECT,
        'subjectSha256': {p: sha(git('show', f'{HEAD}:{p}').encode()) for p in SUBJECT},
        'gate': {'paths': gate['paths'], 'refused': gate['refused'], 'differing': differing},
        'closure': closure, 'mutants': mutants,
        'tests': {'titlesBase': titles['base'], 'titlesHead': titles['head'],
                  'run': {k: suite[k] for k in ('total', 'passed', 'failed', 'skipped', 'files', 'load1')},
                  'distAbsent': {k: absent[k] for k in ('total', 'passed', 'failed')}},
        'surfaceVersion': {**version, 'moves': version['base'] != version['head'],
                           'why': 'apps/three-surface-poc/src holds both subject files; the core tree is unchanged'},
        'runnerSha256': sha(git('show', f'{HEAD}:{RUNNER}').encode()),
        'toolsSha256': {p.name: sha(p.read_bytes()) for p in sorted(HERE.iterdir()) if p.suffix in ('.py', '.mjs')},
        'problems': problems,
    }


def result(d, i):
    return next(r for r in d['results'] if r['id'] == i)


def failing(d, i, *titles):
    r = result(d, i)
    r.update(outcome='killed', exit=1, failed=[{'title': t, 'timedOut': False, 'message': ''} for t in titles])
    return d


SELFTEST = {
    'a third file in the subject': {'@names': lambda n: sorted([*n, 'apps/three-surface-poc/src/poc-main.ts'])},
    'a second prefix added': {f'@+{GATE}': lambda lines: [*lines, "    'packages/polaris-generation-core/',"]},
    'a prefix removed from the gate': {f'@-{GATE}': lambda lines: [*lines, "    'packages/cap1-core/',"]},
    'an existing test row edited': {f'@-{TEST}': lambda lines: [*lines, "    expect(pocObserverInputsAreClean({ changedPaths: ['package.json'] })).toBe(false);"]},
    'a gate diff by another tool': {'gate-diff.json': lambda d: (d.update(toolSha256='0' * 64), d)[1]},
    'a gate decision outside support that differs': {'gate-diff.json': lambda d: (d['differing'].append(['packages/cap1-core/src/x.ts', 'accepted', 'refused']), d)[1]},
    'a support path that stays accepted': {'gate-diff.json': lambda d: (d.update(differing=d['differing'][1:]), d)[1]},
    'a boundary probe the prefix catches': {'gate-diff.json': lambda d: (d['probeDecisions'].update({'packages/supportive/x.ts': ['accepted', 'refused']}), d)[1]},
    'a closure with an unprotected input at head': {'closure-head.json': lambda d: (d['unprotected'].append('packages/support/src/sha256.ts'), d)[1]},
    'a base closure that hides the regression': {'closure-base.json': lambda d: (d.update(unprotected=[]), d)[1]},
    'methods that disagree': {'closure-head.json': lambda d: (d.update(methodsAgree=False), d)[1]},
    'a walk with an unresolved specifier': {'closure-base.json': lambda d: (d['unresolved'].append({'from': 'x', 'specifier': '@syzygy/x'}), d)[1]},
    'V12 killed at base': {'v12-base.json': lambda d: failing(d, 'V12-gate-prefix-src-and-manifest-only', TABLE)},
    'V14 surviving at head': {'v14-v15-head.json': lambda d: (result(d, 'V14-gate-cap1-daemon-prefix-narrowed-to-src').update(outcome='survived', failed=[]), d)[1]},
    'V15 killed by an older row only': {'v14-v15-head.json': lambda d: failing(d, 'V15-gate-three-surface-core-prefix-narrowed-to-src', SUBSET[1].difference({TABLE}).pop())},
    'a reviewer mutant run with other edits': {'v12-head.json': lambda d: (result(d, 'V12-gate-prefix-src-and-manifest-only')['edits'][0].update(new='x'), d)[1]},
    'a reviewer run at another commit': {'v14-v15-base.json': lambda d: (d.update(commit=HEAD), d)[1]},
    'the static import missed by the guard': {'own-head.json': lambda d: (result(d, 'O3-unprefixed-package-imported-statically').update(outcome='survived', failed=[]), d)[1]},
    'the dynamic import killed by a load failure instead': {'own-head.json': lambda d: failing(d, 'O4-unprefixed-package-imported-dynamically-from-core', f'{TEST} > (file failed)')},
    'the guard holding equality, not a subset': {'own-head.json': lambda d: failing(d, SUBSET[0], *sorted(SUBSET[1] | {GUARD}))},
    'an own mutant with a timeout': {'own-head.json': lambda d: (result(d, 'O1-support-prefix-dropped')['failed'][0].update(timedOut=True), d)[1]},
    'an own mutant never run': {'own-head.json': lambda d: (d.update(results=d['results'][:-1]), d)[1]},
    'an own spec fragment HEAD lacks': {'own-specs.json': lambda d: (d['mutants'][2]['edits'][0].update(old='no such text'), d)[1]},
    'a title removed': {'titles.json': lambda d: (d['removed'].append([TEST, 'x']), d)[1]},
    'a third title added': {'titles.json': lambda d: (d['added'].append([TEST, 'x']), d.update(head=d['head'] + 1), d)[2]},
    'a failing suite': {'suite-head.json': lambda d: (d.update(failed=1, passed=d['passed'] - 1, exit=1), d)[1]},
    'a run-list gap in another file': {'suite-head.json': lambda d: (d['perFile'].update({TEST: d['perFile'][TEST] + 1}), d)[1]},
    'a dist-absent run with a dist left': {'dist-absent-head.json': lambda d: (d['distAfterRemoval'].append('packages/support/dist'), d)[1]},
    'a dist-absent run missing the guard': {'dist-absent-head.json': lambda d: (d.update(titles=[t for t in d['titles'] if 'daemon imports' not in t]), d)[1]},
}


def main():
    if '--selftest' in sys.argv[2:]:
        if summary()['problems']:
            print('selftest: the unmutated inputs already fail:', summary()['problems'])
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
    text = json.dumps(summary(), indent=1, ensure_ascii=False) + '\n'
    result_ = json.loads(text)
    if '--check' in sys.argv[2:]:
        same = (HERE / 'summary.json').read_text() == text
        print('summary.json', 'matches' if same else 'DIFFERS', '; problems:', len(result_['problems']))
        sys.exit(0 if same and not result_['problems'] else 1)
    (HERE / 'summary.json').write_text(text)
    print('wrote summary.json; problems:', len(result_['problems']))
    for p in result_['problems']:
        print(' -', p)


main()
