"""syzygy-bpyt.8.37: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

The subject is the code commit HEAD over BASE (main after PR 528): the PR 528 review's notes N1-N3. Inputs (all in this directory):
  own-specs.json       one mutant per predicate this bead adds, and tree forms of N2 and N3 (written by own_specs.py here);
  own-head.json        own-specs.json at HEAD; own-base-tree.json, its tree forms at BASE;
  premise-base.json, targets-head.json  the PR 528 reviewer's N1-N3 mutants (RV-P3, P4, P6, P8, Q1, Q2, Q3, T18, C6), run unchanged
                       from docs/evidence/argv-fail-closed-review-2026-10-25/tools/own-specs-head.json at BASE and at HEAD;
  retained-specs.json  every mutant spec the PR 524 and PR 528 reviewers retained, gathered unchanged (`from` names each source);
  retained-{base,head}.json  that set at BASE and at HEAD;
  island-diff.json, island-diff-selftest.json  docs/evidence/syzygy-bpyt-8-36/island_diff.py, old testkit (BASE) against new (HEAD);
  repeat-runs.json, titles.json  the four guard files five times at HEAD, and every Vitest title at both commits.
Every mutant run is the PR 524 reviewer's mut.py (docs/evidence/argv-guards-review-2026-10-25/tools/mut.py).
It also sweeps HEAD's objects for the faithful-tree side: every workspace manifest's local dependency versions (N2) and every
.mts, .cts or .tsx module under a package's src (N3).
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, re, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-8-37'
BASE = '8ff50172b127cba676ff32ce62c12c91b2b0d924'
HEAD = 'c90cd7327a24fee44d0e7135872a3b08277c73b0'
CODE = ['packages/polaris-dossier/src/argv.test.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts',
        'packages/polaris-generation-core/src/workspace-reach.testkit.ts']
RUNNER = 'docs/evidence/argv-guards-review-2026-10-25/tools/mut.py'
ISLAND_DIFF = 'docs/evidence/syzygy-bpyt-8-36/island_diff.py'
REVIEW_SPECS = 'docs/evidence/argv-fail-closed-review-2026-10-25/tools/own-specs-head.json'
TARGETS = ['RV-P3-moduleIn-prefix-null', 'RV-P4-moduleIn-missing-file-null', 'RV-P6-leaves-package-check-dropped', 'RV-Q1-callee-conjunct-dropped',
           'RV-Q2-declaration-anywhere', 'RV-Q3-census-never-fed', 'RV-T18-dependency-alias', 'RV-C6-mts-caller']
EQUIVALENT = ['RV-P8-array-guard-dropped']
TREE_FORMS = ['T18-link', 'T18-workspace', 'T18-npm', 'T18-path', 'T18-subpath', 'T18-root', 'T18-island', 'C6-cts', 'C6-tsx']
LOCAL_VERSION = re.compile(r'^(?:file:|link:|workspace:|npm:|\.\.?(?:/|$)|/|~/)|\.(?:tgz|tar|tar\.gz)$', re.I)
MUTATE = {}


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], check=True, capture_output=True, text=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def blob(commit, path, cache={}):
    key = (commit, path)
    if key not in cache:
        try:
            cache[key] = git('show', f'{commit}:{path}')
        except subprocess.CalledProcessError:
            cache[key] = None
    return cache[key]


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def check_runs(name, commit, specs, problems, only=None):
    d = load(name)
    if d['head'] != commit:
        problems.append(f'{name}: ran at {d["head"]}, not {commit}')
    rows = {}
    for r in d['results']:
        spec = specs.get(r['id'])
        if spec is None:
            problems.append(f'{name} {r["id"]}: no such spec')
            continue
        if r.get('edits') != spec['edits']:
            problems.append(f'{name} {r["id"]}: edits differ from the spec')
        for e in spec['edits']:
            if 'old' in e and (blob(commit, e['file']) or '').count(e['old']) != 1:
                problems.append(f'{name} {r["id"]}: old fragment does not occur once in {e["file"]} at {commit[:8]}')
            if 'create' in e and blob(commit, e['file']) is not None:
                problems.append(f'{name} {r["id"]}: {e["file"]} already exists at {commit[:8]}')
        expected = 'survives' if r.get('exit') == 0 else ('killed' if r.get('failed') else 'error')
        if r.get('outcome') != expected:
            problems.append(f'{name} {r["id"]}: outcome {r.get("outcome")} disagrees with exit {r.get("exit")} and {len(r.get("failed", []))} failed rows')
        if not r.get('cleanAfter'):
            problems.append(f'{name} {r["id"]}: tree not clean after')
        rows[r['id']] = {'outcome': r.get('outcome'), 'failedRows': sorted(r.get('failed', [])), 'tests': r.get('tests')}
    missing = sorted(set(only if only is not None else specs) - set(rows))
    if missing:
        problems.append(f'{name}: {len(missing)} specs never ran: {missing[:3]}')
    return rows


def main_summary():
    problems = []
    own_specs = {m['id']: m for m in load('own-specs.json')['mutants']}
    own = check_runs('own-head.json', HEAD, own_specs, problems)
    for i, r in own.items():
        if r['outcome'] != 'killed':
            problems.append(f'own {i}: {r["outcome"]} at head')
    own_base = check_runs('own-base-tree.json', BASE, own_specs, problems, only=TREE_FORMS)
    if sorted(own_base) != sorted(TREE_FORMS) or any(r['outcome'] != 'survives' for r in own_base.values()):
        problems.append('own-base-tree.json: a tree form is not run, or does not survive at base')

    review = {m['id']: m for m in json.loads(blob(HEAD, REVIEW_SPECS) or '{"mutants": []}')['mutants']}
    premise = check_runs('premise-base.json', BASE, review, problems, only=TARGETS + EQUIVALENT)
    targets = check_runs('targets-head.json', HEAD, review, problems, only=TARGETS + EQUIVALENT)
    for i in TARGETS:
        if (premise.get(i, {}).get('outcome'), targets.get(i, {}).get('outcome')) != ('survives', 'killed'):
            problems.append(f'{i}: {premise.get(i, {}).get("outcome")} at base, {targets.get(i, {}).get("outcome")} at head')
    for i in EQUIVALENT:
        if (premise.get(i, {}).get('outcome'), targets.get(i, {}).get('outcome')) != ('survives', 'survives'):
            problems.append(f'{i}: the equivalent mutant is not a survivor at both commits')

    retained = {m['id']: m for m in load('retained-specs.json')['mutants']}
    strip = lambda m: {k: v for k, v in m.items() if k not in ('from', 'expect')}
    for m in retained.values():
        for part in m['from'].split(' + '):
            source = json.loads(blob(HEAD, 'docs/evidence/' + part.split(' (')[0]) or '{"mutants": []}')
            original = next((s for s in source['mutants'] if s['id'] == m['id']), None)
            if original is None or strip(original) != strip(m):
                problems.append(f'retained-specs.json {m["id"]}: not the row of {part} as retained')
    rb = check_runs('retained-base.json', BASE, retained, problems)
    rh = check_runs('retained-head.json', HEAD, retained, problems)
    compare = {'unchanged': [], 'stronger': [], 'weaker': []}
    for i in retained:
        b, h = rb.get(i), rh.get(i)
        if b is None or h is None:
            continue
        if b['outcome'] == 'killed' and (h['outcome'] != 'killed' or not set(b['failedRows']) <= set(h['failedRows'])):
            compare['weaker'].append(i)
        elif (b['outcome'], h['outcome']) == ('survives', 'killed') or set(h['failedRows']) > set(b['failedRows']):
            compare['stronger'].append(i)
        elif b['outcome'] == h['outcome'] and b['failedRows'] == h['failedRows']:
            compare['unchanged'].append(i)
        else:
            compare['weaker'].append(i)
    if compare['weaker']:
        problems.append(f'weaker at head: {compare["weaker"]}')

    diff, selftest = load('island-diff.json'), load('island-diff-selftest.json')
    tool = sha(blob(HEAD, ISLAND_DIFF) or '')
    for d, label in ((diff, 'island-diff'), (selftest, 'island-diff-selftest')):
        if (d['base'], d['head'], d['cleanAfter'], d['vitestExit'], d['toolSha256']) != (BASE, HEAD, True, 0, tool):
            problems.append(f'{label}: base, head, clean tree, exit or tool digest is not as required')
    if diff['selftest'] or diff['walks']['equal'] != diff['walks']['entries'] or diff['resolves']['equal'] != diff['resolves']['specifiers']:
        problems.append('island-diff: an answer differs')
    if not selftest['selftest'] or selftest['walks']['equal'] == selftest['walks']['entries'] or selftest['resolves']['equal'] == selftest['resolves']['specifiers']:
        problems.append('island-diff-selftest: the mutated testkit changed no answer')

    repeat = load('repeat-runs.json')
    if repeat['commit'] != HEAD or len(repeat['runs']) < 5 or any(r['failed'] or r['passed'] != r['total'] or not r['total'] for r in repeat['runs']):
        problems.append('repeat-runs: a run failed, fewer than 5 ran, or not at HEAD')
    titles = load('titles.json')
    if (titles['base'], titles['head']) != (BASE, HEAD) or titles['removed'] or len(titles['added']) != titles['titles']['head'] - titles['titles']['base'] \
            or titles['duplicates']['base'] != titles['duplicates']['head'] or any(f not in CODE for f, _ in titles['added']):
        problems.append('titles: a title was removed, the arithmetic does not close, duplicates differ, or a title landed outside the subject')

    changed = git('diff', '--name-only', BASE, HEAD).split()
    if sorted(changed) != sorted(CODE):
        problems.append(f'the subject touches {changed}, not the three test files')
    tracked = [p for p in git('ls-tree', '-r', '--name-only', '-z', HEAD).split('\0') if p]
    manifests = [p for p in tracked if p == 'package.json' or re.fullmatch(r'(?:apps|packages)/[^/]+/package\.json', p)]
    local = [[p, field, name, version] for p in manifests for field in ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')
             for name, version in json.loads(blob(HEAD, p)).get(field, {}).items() if LOCAL_VERSION.search(version)]
    modules = [p for p in tracked if re.fullmatch(r'(?:apps|packages)/[^/]+/src/.+\.(?:mts|cts|tsx)', p)]
    return {
        'bead': 'syzygy-bpyt.8.37', 'base': BASE, 'head': HEAD,
        'subject': {'what': f'git diff {BASE[:8]} {HEAD[:8]}', 'sha256': sha(git('diff', BASE, HEAD)),
                    'files': {f: {'base': sha(blob(BASE, f)), 'head': sha(blob(HEAD, f))} for f in CODE}},
        'productFilesChanged': [f for f in changed if f not in CODE],
        'mutRunnerSha256': sha(blob(HEAD, RUNNER) or ''),
        'targets': {i: {'base': premise.get(i, {}).get('outcome'), 'head': targets.get(i, {}).get('outcome'), 'headFailedRows': targets.get(i, {}).get('failedRows')} for i in TARGETS + EQUIVALENT},
        'own': {i: {'what': own_specs[i]['what'], 'outcome': r['outcome'], 'tests': r['tests'], 'failedRows': r['failedRows'], 'base': own_base.get(i, {}).get('outcome')} for i, r in own.items()},
        'retained': {'total': len(retained), 'base': {o: sum(1 for r in rb.values() if r['outcome'] == o) for o in ('killed', 'survives', 'error')},
                     'head': {o: sum(1 for r in rh.values() if r['outcome'] == o) for o in ('killed', 'survives', 'error')},
                     'unchanged': len(compare['unchanged']), 'stronger': compare['stronger'], 'weaker': compare['weaker'],
                     'survivingAtHead': sorted(i for i, r in rh.items() if r['outcome'] != 'killed')},
        'islandDiff': {'walks': {k: diff['walks'][k] for k in ('entries', 'equal', 'answersSha256')},
                       'resolves': {k: diff['resolves'][k] for k in ('files', 'specifiers', 'equal', 'byAnswer', 'answersSha256')},
                       'selftest': {'walksEqual': selftest['walks']['equal'], 'resolvesEqual': selftest['resolves']['equal']}, 'toolSha256': tool},
        'repeats': {'runs': len(repeat['runs']), 'tests': [r['tests'] for r in repeat['runs']], 'load1': [r['load1'] for r in repeat['runs']]},
        'titles': {'base': titles['titles']['base'], 'head': titles['titles']['head'], 'added': len(titles['added']), 'removed': len(titles['removed']),
                   'addedPerFile': titles['addedPerFile'], 'line': f'Tests: +{len(titles["added"])} ~0 -{len(titles["removed"])}'},
        'faithfulTree': {'manifests': manifests, 'localDependencies': local, 'compiledNonTsModules': modules},
        'problems': problems,
    }


def first(d, i):
    return next(r for r in d['results'] if r['id'] == i)


SELFTEST = {
    'a target that survives at head': {'targets-head.json': lambda d: (first(d, TARGETS[0]).update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a target killed at base': {'premise-base.json': lambda d: (first(d, 'RV-Q3-census-never-fed').update(outcome='killed', exit=1, failed=['FAIL x > y']), d)[1]},
    'the equivalent mutant killed at head': {'targets-head.json': lambda d: (first(d, EQUIVALENT[0]).update(outcome='killed', exit=1, failed=['FAIL x > y']), d)[1]},
    'a target never run at base': {'premise-base.json': lambda d: (d.update(results=[r for r in d['results'] if r['id'] != 'RV-T18-dependency-alias']), d)[1]},
    'an own mutant that survives': {'own-head.json': lambda d: (first(d, 'L10-root-manifest-unread').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'an outcome that disagrees with its exit': {'own-head.json': lambda d: (first(d, 'K3-mts-cts-left-out').update(exit=0), d)[1]},
    'a run whose edits are not its spec': {'own-head.json': lambda d: (first(d, 'L1-local-check-dropped')['edits'][0].update(new='x'), d)[1]},
    'a spec whose fragment HEAD lacks': {'own-specs.json': lambda d: (d['mutants'][0]['edits'][0].update(old='no such text'), d)[1],
                                         'own-head.json': lambda d: (d['results'][0]['edits'][0].update(old='no such text'), d)[1]},
    'a tree form killed at base': {'own-base-tree.json': lambda d: (first(d, 'T18-root').update(outcome='killed', exit=1, failed=['FAIL x > y']), d)[1]},
    'a reviewer spec retyped': {'retained-specs.json': lambda d: (d['mutants'][0].update(projects=['x']), d)[1]},
    'a retained base kill lost at head': {'retained-head.json': lambda d: (first(d, 'RV-P1-absolute-branch-null').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a run at another commit': {'retained-head.json': lambda d: (d.update(head=BASE), d)[1]},
    'a walk that differs': {'island-diff.json': lambda d: (d['walks'].update(equal=d['walks']['equal'] - 1), d)[1]},
    'an island diff by another tool': {'island-diff.json': lambda d: (d.update(toolSha256='0' * 64), d)[1]},
    'a differential selftest that changes nothing': {'island-diff-selftest.json': lambda d: (d['resolves'].update(equal=d['resolves']['specifiers']), d['walks'].update(equal=d['walks']['entries']), d)[2]},
    'a repeat run that fails': {'repeat-runs.json': lambda d: (d['runs'][2].update(failed=True), d)[1]},
    'a title removed': {'titles.json': lambda d: (d['removed'].append(['x.test.ts', 'y']), d)[1]},
    'a title outside the subject': {'titles.json': lambda d: (d['added'][0].__setitem__(0, 'packages/x/src/y.test.ts'), d)[1]},
}


def main():
    if '--selftest' in sys.argv[2:]:
        if main_summary()['problems']:
            print('selftest: the unmutated inputs already fail')
            sys.exit(1)
        survived = []
        for label, mutation in SELFTEST.items():
            MUTATE.clear()
            MUTATE.update(mutation)
            problems = main_summary()['problems']
            print('killed' if problems else 'SURVIVED', '|', label, '|', problems[:1])
            if not problems:
                survived.append(label)
        MUTATE.clear()
        print(f'selftest: {len(SELFTEST) - len(survived)}/{len(SELFTEST)} mutations make a check fail')
        sys.exit(1 if survived else 0)
    text = json.dumps(main_summary(), indent=1, ensure_ascii=False) + '\n'
    summary = json.loads(text)
    if '--check' in sys.argv[2:]:
        same = (HERE / 'summary.json').read_text() == text
        print('summary.json', 'matches' if same else 'DIFFERS', '; problems:', len(summary['problems']))
        sys.exit(0 if same and not summary['problems'] else 1)
    (HERE / 'summary.json').write_text(text)
    print('wrote summary.json; problems:', len(summary['problems']))
    for p in summary['problems']:
        print(' -', p)


main()
