"""syzygy-bpyt.7.14: derive summary.json from the records beside it, checking each against the git objects of the tree given.

The subject is the code commit HEAD over BASE (main after PR 529): the PR 529 review's notes N4, N6 and N7, as test rows only.
Inputs (all in this directory):
  premise-base.json, r529-base-rest.json, r529-head.json  the PR 529 reviewer's 19 mutants
                       (docs/evidence/http-host-review-2026-10-27/tools/mutants.py), run unchanged: this bead's seven targets (R3,
                       R8, R13, R14, R17, R18 and R19) at BASE first, the other twelve at BASE after, and all 19 at HEAD;
  own-specs.json, own-{base,head}.json  the lane's own vitest mutants (tools/own_specs.py), run by the PR 524 reviewer's
                       mut.py (docs/evidence/argv-guards-review-2026-10-25/tools/mut.py) at BASE and at HEAD;
  own-head-o5-rerun.json  O5 alone at HEAD again: its first HEAD run also failed three unrelated rows by timeout under load;
  tsc-specs.json, tsc-{base,head}.json  type-level mutants of the two cap1-daemon shims (tools/own_specs.py), run under
                       `npm run typecheck` by tools/tsc_mutants.py at BASE and at HEAD;
  repeat-runs.json, titles.json  the changed test files five times at HEAD (tools/repeats.py), and every Vitest title at
                       both commits (tools/titles.py).
Checked: each run's commit, fragments (each `old` once in its file at that commit, and equal to its spec), outcome (against
its exit code and failed rows) and clean tree; every target survives at BASE and is killed at HEAD by a new row (R14 by the
compiler, since Vitest strips types); no reviewer mutant killed at BASE is weaker at HEAD; every own mutant but the named
residual is killed at HEAD by a new row; the specs are what tools/own_specs.py writes; the subject is the five test files.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, subprocess, sys, tempfile
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-7-14'
BASE = '546f1ff066e2ffef749c757cdb4621336039113b'
HEAD = '01df68eab9ef3f9b6f556c6aa00f28c70ba6e5f1'
CODE = ['apps/three-surface-poc/src/browser-origin.test.ts', 'apps/three-surface-poc/src/git-observation.test.ts',
        'packages/cap1-daemon/src/package.test.ts', 'packages/cap1-daemon/src/server.test.ts', 'packages/http-host/src/credentials.test.ts']
REVIEW_TOOL = 'docs/evidence/http-host-review-2026-10-27/tools/mutants.py'
MUT = 'docs/evidence/argv-guards-review-2026-10-25/tools/mut.py'
TARGETS = {'R3-bearer-token-whitespace-trimmed': 'R3', 'R8-not-admitted-population-dropped': 'R8',
           'R13-shim-unknown-route-status-swapped': 'R13', 'R17-gate-host-prefix-narrowed-to-src': 'R17',
           'R18-origin-prefix-match': 'R18', 'R19-state-write-containment-without-separator': 'R19'}
TYPE_TARGET = 'R14-credentials-shim-drops-a-type'
TYPE_TARGET_TSC = 'T-drop-StateWriteRefusalName'
RESIDUAL = ['O17-shim-equal-local-constant']
RERUN = 'O5-presented-token-trimmed-before-compare'
# The rows this bead adds, by the reviewer row they answer: a kill counts only when one of these fails.
NEW_ROWS = {
    'R3': ['the minted token behind any other whitespace refuses, named'],
    'R8': ['logs a 503 breach diagnostic for each listed Unknown population and withholds an unlisted one'],
    'R13': ['re-exports each host value as the host binding of the same name'],
    'R17': ['protects the HTTP host package the POC serves through'],
    'R18': ['allows no Origin and the exact origin of each allowed host', 'refuses an origin that only begins with the host origin',
            'refuses an origin that the host origin only begins with'],
    'R19': ['refuses a sibling directory whose name extends the state dir name, as traversal',
            'refuses a symlink into a sibling whose name extends the state dir name, named'],
}
TYPE_PIN = 'packages/cap1-daemon/src/package.test.ts'
# The one existing row this bead extends (an assertion added, its title unchanged).
MODIFIED = [('apps/three-surface-poc/src/git-observation.test.ts', 'protects the HTTP host package the POC serves through')]
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


def review_mutants():
    """The reviewer's MUTANTS and HOST, by running only the tool's assignments (between `POC = ` and `def git_clean`)."""
    source = blob(HEAD, REVIEW_TOOL) or ''
    namespace = {}
    exec(source[source.index('POC = '):source.index('def git_clean')], namespace)
    return {m[0]: {'file': m[1], 'old': m[2], 'new': m[3], 'files': m[4]} for m in namespace['MUTANTS']}, namespace['HOST']


def hits(titles, family):
    return sorted(t for t in titles if any(row in t for row in NEW_ROWS[family]))


def check_review_runs(names, commit, mutants, problems):
    rows = {}
    for name, d in ((name, load(name)) for name in names):
        if d['commit'] != commit:
            problems.append(f'{name}: ran at {d["commit"]}, not {commit}')
        new = check_review_rows(name, commit, mutants, d['mutants'], problems)
        problems.extend(f'{name} {i}: already run in an earlier file' for i in sorted(set(new) & set(rows)))
        rows.update(new)
    if sorted(rows) != sorted(mutants):
        problems.append(f'{"+".join(names)}: ran {len(rows)} of the reviewer\'s {len(mutants)} mutants')
    return rows


def check_review_rows(name, commit, mutants, results, problems):
    rows = {}
    for r in results:
        spec = mutants.get(r['id'])
        if spec is None or {k: r.get(k) for k in spec} != spec:
            problems.append(f'{name} {r["id"]}: not the reviewer\'s mutant as written')
            continue
        if (blob(commit, r['file']) or '').count(r['old']) != 1:
            problems.append(f'{name} {r["id"]}: old fragment does not occur once in {r["file"]} at {commit[:8]}')
        failing = (r.get('failedTests') or 0) > 0 or (r.get('failedFiles') or 0) > 0
        expected = 'killed' if r.get('exit') != 0 and failing else 'survived' if r.get('exit') == 0 and r.get('failedTests') == 0 else 'error'
        if r.get('outcome') != expected:
            problems.append(f'{name} {r["id"]}: outcome {r.get("outcome")} disagrees with exit {r.get("exit")} and {r.get("failedTests")} failed tests')
        if not r.get('cleanAfter') or r.get('commit') != commit:
            problems.append(f'{name} {r["id"]}: tree not clean after, or the row names another commit')
        if r['id'] in rows:
            problems.append(f'{name} {r["id"]}: run twice')
        rows[r['id']] = {'outcome': r.get('outcome'), 'failedTitles': sorted(r.get('failedTitles', [])), 'tests': r.get('totalTests')}
    return rows


def check_mut_runs(name, commit, specs, problems, outcome_key='failed'):
    d = load(name)
    if d['head'] != commit:
        problems.append(f'{name}: ran at {d["head"]}, not {commit}')
    rows = {}
    for r in d['results']:
        spec = specs.get(r['id'])
        if spec is None or r.get('edits') != spec['edits']:
            problems.append(f'{name} {r["id"]}: no such spec, or edits differ from the spec')
            continue
        for e in spec['edits']:
            if (blob(commit, e['file']) or '').count(e['old']) != 1:
                problems.append(f'{name} {r["id"]}: old fragment does not occur once in {e["file"]} at {commit[:8]}')
        evidence = r.get(outcome_key) or []
        if outcome_key == 'failed':
            expected = 'survives' if r.get('exit') == 0 else 'killed' if evidence else 'error'
        else:
            expected = 'survived' if r.get('exit') == 0 else 'killed' if evidence else 'error'
        if r.get('outcome') != expected:
            problems.append(f'{name} {r["id"]}: outcome {r.get("outcome")} disagrees with exit {r.get("exit")} and {len(evidence)} failure lines')
        if not r.get('cleanAfter'):
            problems.append(f'{name} {r["id"]}: tree not clean after')
        rows[r['id']] = {'outcome': {'survives': 'survived'}.get(r.get('outcome'), r.get('outcome')), 'evidence': sorted(evidence),
                         'tests': r.get('tests')}
    if sorted(rows) != sorted(specs):
        problems.append(f'{name}: ran {len(rows)} of {len(specs)} specs')
    return rows


def generated_specs():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([sys.executable, '-I', str(HERE / 'tools/own_specs.py'), f'{tmp}/v.json', f'{tmp}/t.json'], check=True,
                       capture_output=True)
        return json.loads(Path(f'{tmp}/v.json').read_text()), json.loads(Path(f'{tmp}/t.json').read_text())


def main_summary():
    problems = []
    mutants, host_files = review_mutants()
    rb = check_review_runs(['premise-base.json', 'r529-base-rest.json'], BASE, mutants, problems)
    rh = check_review_runs(['r529-head.json'], HEAD, mutants, problems)
    targets = {}
    for i, family in TARGETS.items():
        b, h = rb.get(i, {}), rh.get(i, {})
        found = hits(h.get('failedTitles', []), family)
        if (b.get('outcome'), h.get('outcome')) != ('survived', 'killed') or not found:
            problems.append(f'{i}: {b.get("outcome")} at base, {h.get("outcome")} at head, killed by {len(found)} new rows')
        targets[i] = {'base': b.get('outcome'), 'head': h.get('outcome'), 'headNewRowsFailed': found,
                      'headFailedTitles': len(h.get('failedTitles', []))}
    if (rb.get(TYPE_TARGET, {}).get('outcome'), rh.get(TYPE_TARGET, {}).get('outcome')) != ('survived', 'survived'):
        problems.append(f'{TYPE_TARGET}: Vitest strips types, so it should survive both Vitest runs')
    compare = {'unchanged': [], 'stronger': [], 'weaker': []}
    for i in mutants:
        b, h = rb.get(i), rh.get(i)
        if b is None or h is None:
            continue
        if b['outcome'] == 'killed' and (h['outcome'] != 'killed' or not set(b['failedTitles']) <= set(h['failedTitles'])):
            compare['weaker'].append(i)
        elif (b['outcome'], h['outcome']) == ('survived', 'killed') or set(h['failedTitles']) > set(b['failedTitles']):
            compare['stronger'].append(i)
        elif b['outcome'] == h['outcome'] and b['failedTitles'] == h['failedTitles']:
            compare['unchanged'].append(i)
        else:
            compare['weaker'].append(i)
    if compare['weaker']:
        problems.append(f'reviewer mutants weaker at head: {compare["weaker"]}')

    own_specs_doc, tsc_specs_doc = load('own-specs.json'), load('tsc-specs.json')
    gen_own, gen_tsc = generated_specs()
    gen_own = MUTATE['@generated'](gen_own) if '@generated' in MUTATE else gen_own
    if own_specs_doc != gen_own or tsc_specs_doc != gen_tsc:
        problems.append('own-specs.json or tsc-specs.json is not what tools/own_specs.py writes')
    own_specs = {m['id']: m for m in own_specs_doc['mutants']}
    if any(m['files'] != host_files or m['projects'] for m in own_specs.values()):
        problems.append('an own spec runs other files than the reviewer\'s HOST list')
    ob = check_mut_runs('own-base.json', BASE, own_specs, problems)
    oh = check_mut_runs('own-head.json', HEAD, own_specs, problems)
    own = {}
    for i, spec in own_specs.items():
        h = oh.get(i, {})
        if i in RESIDUAL:
            if h.get('outcome') != 'survived':
                problems.append(f'{i}: the named residual is {h.get("outcome")} at head')
            found = []
        else:
            found = hits(h.get('evidence', []), spec['row'])
            if h.get('outcome') != 'killed' or not found:
                problems.append(f'{i}: {h.get("outcome")} at head, killed by {len(found)} new rows')
        own[i] = {'row': spec['row'], 'base': ob.get(i, {}).get('outcome'), 'head': h.get('outcome'), 'headNewRowsFailed': found}

    rerun = check_mut_runs('own-head-o5-rerun.json', HEAD, {RERUN: own_specs[RERUN]}, problems)
    rerun_failed = rerun.get(RERUN, {}).get('evidence', [])
    if rerun.get(RERUN, {}).get('outcome') != 'killed' or load('own-head-o5-rerun.json')['results'][0].get('timeouts') \
            or len(hits(rerun_failed, own_specs[RERUN]['row'])) != len(rerun_failed):
        problems.append(f'{RERUN}: the rerun is not a clean kill by new rows alone')
    own[RERUN]['rerun'] = {'head': rerun.get(RERUN, {}).get('outcome'), 'failedRows': rerun_failed}

    tsc_specs = {m['id']: m for m in tsc_specs_doc['mutants']}
    tb = check_mut_runs('tsc-base.json', BASE, tsc_specs, problems, outcome_key='errors')
    th = check_mut_runs('tsc-head.json', HEAD, tsc_specs, problems, outcome_key='errors')
    for name in ('tsc-base.json', 'tsc-head.json'):
        if [c['exit'] for c in load(name)['controls']] != [0, 0]:
            problems.append(f'{name}: an unmutated control typecheck failed')
    types = {}
    for i in tsc_specs:
        pinned = [e for e in th.get(i, {}).get('evidence', []) if e.startswith(TYPE_PIN)]
        if th.get(i, {}).get('outcome') != 'killed' or not pinned:
            problems.append(f'{i}: {th.get(i, {}).get("outcome")} at head, with {len(pinned)} errors in the type pin')
        types[i] = {'base': tb.get(i, {}).get('outcome'), 'head': th.get(i, {}).get('outcome'), 'headPinErrors': len(pinned),
                    'baseErrorFiles': sorted({e.split('(')[0] for e in tb.get(i, {}).get('evidence', [])})}
    if types.get(TYPE_TARGET_TSC, {}).get('base') != 'survived':
        problems.append(f'{TYPE_TARGET_TSC} (R14 under the compiler) does not survive at base')

    repeat = load('repeat-runs.json')
    if repeat['commit'] != HEAD or len(repeat['runs']) < 5 or any(r['failed'] or r['passed'] != r['total'] or not r['total'] for r in repeat['runs']) \
            or sorted(repeat['command'][3:]) != sorted(CODE):
        problems.append('repeat-runs: a run failed, fewer than 5 ran, it is not at HEAD, or it ran other files')
    titles = load('titles.json')
    if (titles['base'], titles['head']) != (BASE, HEAD) or titles['removed'] or len(titles['added']) != titles['titles']['head'] - titles['titles']['base'] \
            or titles['duplicates']['base'] != titles['duplicates']['head'] or any(f not in CODE for f, _ in titles['added']):
        problems.append('titles: a title was removed, the arithmetic does not close, duplicates differ, or a title landed outside the subject')
    for f, title in MODIFIED:
        if f"it('{title}'" not in (blob(BASE, f) or '') or f"it('{title}'" not in (blob(HEAD, f) or '') \
                or any(t.endswith('> ' + title) for _, t in titles['added'] + titles['removed']):
            problems.append(f'titles: the extended row {title!r} is not one row present at both commits')

    changed = git('diff', '--name-only', BASE, HEAD).split()
    if sorted(changed) != sorted(CODE):
        problems.append(f'the subject touches {changed}, not the five test files')
    return {
        'bead': 'syzygy-bpyt.7.14', 'base': BASE, 'head': HEAD,
        'subject': {'what': f'git diff {BASE[:8]} {HEAD[:8]}', 'sha256': sha(git('diff', BASE, HEAD)),
                    'files': {f: {'base': sha(blob(BASE, f)) if blob(BASE, f) is not None else None, 'head': sha(blob(HEAD, f))} for f in CODE}},
        'productFilesChanged': [f for f in changed if f not in CODE],
        'toolSha256': {REVIEW_TOOL: sha(blob(HEAD, REVIEW_TOOL) or ''), MUT: sha(blob(HEAD, MUT) or '')},
        'targets': targets,
        'typeTarget': {'vitest': {'base': rb.get(TYPE_TARGET, {}).get('outcome'), 'head': rh.get(TYPE_TARGET, {}).get('outcome')},
                       'typecheck': types.get(TYPE_TARGET_TSC)},
        'reviewMutants': {'total': len(mutants), 'base': {o: sum(1 for r in rb.values() if r['outcome'] == o) for o in ('killed', 'survived', 'error')},
                          'head': {o: sum(1 for r in rh.values() if r['outcome'] == o) for o in ('killed', 'survived', 'error')},
                          'unchanged': len(compare['unchanged']), 'stronger': compare['stronger'], 'weaker': compare['weaker'],
                          'survivingAtHead': sorted(i for i, r in rh.items() if r['outcome'] != 'killed')},
        'own': own,
        'types': types,
        'repeats': {'runs': len(repeat['runs']), 'tests': [r['tests'] for r in repeat['runs']], 'load1': [r['load1'] for r in repeat['runs']]},
        'titles': {'base': titles['titles']['base'], 'head': titles['titles']['head'], 'added': len(titles['added']), 'removed': len(titles['removed']),
                   'addedPerFile': titles['addedPerFile'], 'modified': [list(m) for m in MODIFIED],
                   'line': f'Tests: +{len(titles["added"])} ~{len(MODIFIED)} -{len(titles["removed"])}'},
        'problems': problems,
    }


def first(d, i, key='results'):
    return next(r for r in d[key] if r['id'] == i)


def killed_row(r):
    r.update(outcome='killed', exit=1, failedTests=1, failedFiles=1, failedTitles=['x.test.ts > y'])


SELFTEST = {
    'a target that survives at head': {'r529-head.json': lambda d: (first(d, 'R8-not-admitted-population-dropped', 'mutants').update(outcome='survived', exit=0, failedTests=0, failedFiles=0, failedTitles=[]), d)[1]},
    'a target killed at base': {'premise-base.json': lambda d: (killed_row(first(d, 'R18-origin-prefix-match', 'mutants')), d)[1]},
    'a target killed at head by no new row': {'r529-head.json': lambda d: (first(d, 'R17-gate-host-prefix-narrowed-to-src', 'mutants').update(failedTitles=['apps/three-surface-poc/src/main.test.ts > other']), d)[1]},
    'a reviewer mutant retyped': {'r529-head.json': lambda d: (first(d, 'R19-state-write-containment-without-separator', 'mutants').update(new='x'), d)[1]},
    'a reviewer mutant never run': {'r529-base-rest.json': lambda d: (d.update(mutants=[r for r in d['mutants'] if r['id'] != 'R1-hash-compares-presented-to-itself']), d)[1]},
    'a target run twice at base': {'r529-base-rest.json': lambda d: (d['mutants'].append(first(json.loads((HERE / 'premise-base.json').read_text()), 'R3-bearer-token-whitespace-trimmed', 'mutants')), d)[1]},
    'a base kill lost at head': {'r529-head.json': lambda d: (first(d, 'R10-daemon-binds-all-interfaces', 'mutants').update(outcome='survived', exit=0, failedTests=0, failedFiles=0, failedTitles=[]), d)[1]},
    'an outcome that disagrees with its exit': {'r529-head.json': lambda d: (first(d, 'R3-bearer-token-whitespace-trimmed', 'mutants').update(exit=0), d)[1]},
    'a reviewer run at another commit': {'r529-head.json': lambda d: (d.update(commit=BASE), d)[1]},
    'R14 killed under Vitest': {'premise-base.json': lambda d: (killed_row(first(d, TYPE_TARGET, 'mutants')), d)[1]},
    'an own mutant that survives at head': {'own-head.json': lambda d: (first(d, 'O4-bearer-end-matches-before-newline').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'an own kill by no new row': {'own-head.json': lambda d: (first(d, 'O11-breach-reason-keyed-by-status').update(failed=['FAIL x.test.ts > other']), d)[1]},
    'a rerun that times out': {'own-head-o5-rerun.json': lambda d: (d['results'][0].update(timeouts=2), d)[1]},
    'a rerun killed by an unrelated row': {'own-head-o5-rerun.json': lambda d: (d['results'][0]['failed'].append('FAIL x.test.ts > other'), d)[1]},
    'the residual killed at head': {'own-head.json': lambda d: (first(d, RESIDUAL[0]).update(outcome='killed', exit=1, failed=['FAIL x > y']), d)[1]},
    'an own run whose edits are not its spec': {'own-base.json': lambda d: (first(d, 'O6-lexical-containment-without-separator')['edits'][0].update(new='x'), d)[1]},
    'an own spec the generator does not write': {'own-specs.json': lambda d: (d['mutants'][0].update(row='R8'), d)[1]},
    'an own spec on other files': {'own-specs.json': lambda d: (d['mutants'][1].update(files=['x']), d)[1],
                                   '@generated': lambda d: (d['mutants'][1].update(files=['x']), d)[1]},
    'a type mutant that survives at head': {'tsc-head.json': lambda d: (first(d, 'T-swap-RouteContext').update(outcome='survived', exit=0, errors=[]), d)[1]},
    'a type kill outside the pin': {'tsc-head.json': lambda d: (first(d, 'T-drop-Route').update(errors=['packages/cap1-daemon/src/server.test.ts(1,1): error TS2305: x']), d)[1]},
    'R14 killed by the compiler at base': {'tsc-base.json': lambda d: (first(d, TYPE_TARGET_TSC).update(outcome='killed', exit=2, errors=['x.ts(1,1): error TS2694: y']), d)[1]},
    'a failed control typecheck': {'tsc-base.json': lambda d: (d['controls'][1].update(exit=2), d)[1]},
    'a repeat run that fails': {'repeat-runs.json': lambda d: (d['runs'][3].update(failed=True), d)[1]},
    'a title removed': {'titles.json': lambda d: (d['removed'].append(['x.test.ts', 'y']), d)[1]},
    'the extended row counted as added': {'titles.json': lambda d: (d['added'].append([MODIFIED[0][0], 'read-only Git observation > ' + MODIFIED[0][1]]), d['titles'].update(head=d['titles']['head'] + 1), d)[2]},
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
