"""syzygy-bpyt.8.36: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

Inputs (all in this directory):
  reviewer-specs.json  every mutant spec the PR 524 reviewer retained, gathered unchanged (each row names its source file);
  own-specs.json       one mutant per predicate of the checks this bead adds;
  reviewer-{base,head}.json, own-head.json  written by the reviewer's mut.py (docs/evidence/argv-guards-review-2026-10-25/tools/);
  island-diff.json, island-diff-selftest.json  written by island_diff.py here;
  repeat-runs.json, titles.json  written by repeat.py and titles.py here.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-8-36'
BASE = 'a088f1caf061c1a2062527ce8521c9b64c3c7fd1'
HEAD = '1447b6bbd3954a271a1716d7866266e0fb908cfb'
CODE = ['packages/polaris-dossier/src/argv.test.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts',
        'packages/polaris-generation-core/src/workspace-reach.testkit.ts']
TOOLS = 'docs/evidence/argv-guards-review-2026-10-25/tools/'
TARGETS = ['R-X6-package-imports-alias-to-the-barrel', 'R-X6b-package-imports-alias-in-an-intermediate-module',
           'R-X9-node-condition-ahead-of-import-in-the-argv-export', 'R-X6i-island-package-imports-alias-to-consent-root',
           'R-Y6-extra-namespace-call-in-cli', 'R-Y7-extra-aliased-call-in-cli']
MUTATE = {}


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], check=True, capture_output=True, text=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def blob(commit, path, cache={}):
    key = (commit, path)
    if key not in cache:
        try:
            cache[key] = git('show', f'{commit}:{path}')
        except subprocess.CalledProcessError:
            cache[key] = None
    return cache[key]


def check_runs(name, commit, specs, problems):
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
        outcome = r.get('outcome')
        expected = 'survives' if r.get('exit') == 0 else ('killed' if r.get('failed') else 'error')
        if outcome != expected:
            problems.append(f'{name} {r["id"]}: outcome {outcome} disagrees with exit {r.get("exit")} and {len(r.get("failed", []))} failed rows')
        if not r.get('cleanAfter'):
            problems.append(f'{name} {r["id"]}: tree not clean after')
        rows[r['id']] = {'outcome': outcome, 'failedRows': sorted(r.get('failed', [])), 'tests': r.get('tests')}
    missing = sorted(set(specs) - set(rows))
    if missing:
        problems.append(f'{name}: {len(missing)} specs never ran: {missing[:3]}')
    return rows


def main_summary():
    problems = []
    reviewer_specs = {m['id']: m for m in load('reviewer-specs.json')['mutants']}
    own_specs = {m['id']: m for m in load('own-specs.json')['mutants']}
    for m in reviewer_specs.values():
        source = json.loads(blob(HEAD, TOOLS + m['from']) or '{"mutants": []}')
        original = next((s for s in source['mutants'] if s['id'] == m['id']), None)
        if original is None or {k: v for k, v in m.items() if k != 'from'} != original:
            problems.append(f'reviewer-specs.json {m["id"]}: not the row of {m["from"]} as retained')
    base = check_runs('reviewer-base.json', BASE, reviewer_specs, problems)
    head = check_runs('reviewer-head.json', HEAD, reviewer_specs, problems)
    own = check_runs('own-head.json', HEAD, own_specs, problems)

    targets = {i: {'base': base[i]['outcome'], 'head': head[i]['outcome'], 'headFailedRows': head[i]['failedRows']} for i in TARGETS}
    for i, t in targets.items():
        if (t['base'], t['head']) != ('survives', 'killed'):
            problems.append(f'{i}: {t["base"]} at base, {t["head"]} at head')
    compare = {'unchanged': [], 'stronger': [], 'weaker': []}
    for i in reviewer_specs:
        b, h = base[i], head[i]
        if b['outcome'] == 'killed' and (h['outcome'] != 'killed' or not set(b['failedRows']) <= set(h['failedRows'])):
            compare['weaker'].append(i)
        elif (b['outcome'], h['outcome']) == ('survives', 'killed') or set(h['failedRows']) > set(b['failedRows']):
            compare['stronger'].append(i)
        elif b == h or (b['outcome'] == h['outcome'] and b['failedRows'] == h['failedRows']):
            compare['unchanged'].append(i)
        else:
            compare['weaker'].append(i)
    if compare['weaker']:
        problems.append(f'weaker at head: {compare["weaker"]}')
    survivors = sorted(i for i in reviewer_specs if head[i]['outcome'] != 'killed')
    for i, r in own.items():
        if r['outcome'] != 'killed':
            problems.append(f'own {i}: {r["outcome"]}')

    diff, selftest = load('island-diff.json'), load('island-diff-selftest.json')
    for d, label in ((diff, 'island-diff'), (selftest, 'island-diff-selftest')):
        if (d['base'], d['head'], d['cleanAfter'], d['vitestExit']) != (BASE, HEAD, True, 0):
            problems.append(f'{label}: base, head, clean tree or exit is not as required')
    if diff['selftest'] or diff['walks']['equal'] != diff['walks']['entries'] or diff['resolves']['equal'] != diff['resolves']['specifiers']:
        problems.append('island-diff: an answer differs')
    if not selftest['selftest'] or selftest['walks']['equal'] == selftest['walks']['entries'] or selftest['resolves']['equal'] == selftest['resolves']['specifiers']:
        problems.append('island-diff-selftest: the mutated testkit changed no answer')
    if diff['toolSha256'] != sha((HERE / 'island_diff.py').read_bytes()) or selftest['toolSha256'] != diff['toolSha256']:
        problems.append('island-diff: tool digest is not island_diff.py here')

    repeat = load('repeat-runs.json')
    runs = repeat['runs']
    if len(runs) < 5 or any((r['exit'], r['passed']) != (0, r['total']) or r['failed'] for r in runs) or repeat['tree'] == '':
        problems.append('repeat-runs: a run failed or fewer than 5 ran')
    titles = load('titles.json')
    if titles['removed'] or titles['duplicatesHead'] or titles['added'] != titles['head'] - titles['base']:
        problems.append('titles: a title was removed or duplicated')

    changed = git('diff', '--name-only', BASE, HEAD).split()
    if sorted(changed) != sorted(CODE):
        problems.append(f'the subject touches {changed}, not the three test files')
    subject = git('diff', BASE, HEAD)
    return {
        'bead': 'syzygy-bpyt.8.36', 'base': BASE, 'head': HEAD,
        'subject': {'what': f'git diff {BASE[:8]} {HEAD[:8]}', 'sha256': sha(subject), 'files': {f: {'base': None if blob(BASE, f) is None else sha(blob(BASE, f)), 'head': sha(blob(HEAD, f))} for f in CODE}},
        'productFilesChanged': [f for f in changed if f not in CODE],
        'mutRunnerSha256': sha(blob(HEAD, TOOLS + 'mut.py')),
        'targets': targets,
        'reviewerSpecs': {'total': len(reviewer_specs), 'base': {o: sum(1 for r in base.values() if r['outcome'] == o) for o in ('killed', 'survives', 'error')},
                          'head': {o: sum(1 for r in head.values() if r['outcome'] == o) for o in ('killed', 'survives', 'error')},
                          'unchanged': len(compare['unchanged']), 'stronger': compare['stronger'], 'weaker': compare['weaker'], 'survivingAtHead': survivors},
        'own': {i: {'what': own_specs[i]['what'], 'outcome': r['outcome'], 'tests': r['tests'], 'failedRows': r['failedRows']} for i, r in own.items()},
        'islandDiff': {'walks': {k: diff['walks'][k] for k in ('entries', 'equal', 'answersSha256')}, 'resolves': {k: diff['resolves'][k] for k in ('files', 'specifiers', 'equal', 'byAnswer', 'answersSha256')},
                       'selftest': {'walksEqual': selftest['walks']['equal'], 'resolvesEqual': selftest['resolves']['equal']}, 'toolSha256': diff['toolSha256']},
        'repeats': {'runs': len(runs), 'passed': [f'{r["passed"]}/{r["total"]}' for r in runs], 'load1': [r['load1'] for r in runs]},
        'titles': {k: titles[k] for k in ('base', 'head', 'added', 'removed', 'perFile')},
        'problems': problems,
    }


def first(d, i):
    return next(r for r in d['results'] if r['id'] == i)


SELFTEST = {
    'a target that survives at head': {'reviewer-head.json': lambda d: (first(d, TARGETS[0]).update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a target killed at base': {'reviewer-base.json': lambda d: (first(d, TARGETS[4]).update(outcome='killed', exit=1, failed=['FAIL x > y']), d)[1]},
    'a base kill lost at head': {'reviewer-head.json': lambda d: (first(d, 'GM1-entry-re-exports-the-barrel').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'an outcome that disagrees with its exit': {'own-head.json': lambda d: (first(d, 'P2-absolute-path-outside-the-workspace').update(exit=0), d)[1]},
    'a run whose edits are not its spec': {'own-head.json': lambda d: (first(d, 'P4-import-condition-first')['edits'][0].update(new='x'), d)[1]},
    'a spec whose fragment the tree lacks': {'own-specs.json': lambda d: (d['mutants'][0]['edits'][0].update(old='no such text'), d)[1]},
    'a reviewer spec retyped': {'reviewer-specs.json': lambda d: (d['mutants'][0].update(projects=['x']), d)[1]},
    'a run at another commit': {'reviewer-head.json': lambda d: (d.update(head=BASE), d)[1]},
    'a walk that differs': {'island-diff.json': lambda d: (d['walks'].update(equal=d['walks']['equal'] - 1), d)[1]},
    'a differential selftest that changes nothing': {'island-diff-selftest.json': lambda d: (d['resolves'].update(equal=d['resolves']['specifiers']), d['walks'].update(equal=d['walks']['entries']), d)[2]},
    'a repeat run that fails': {'repeat-runs.json': lambda d: (d['runs'][2].update(exit=1), d)[1]},
    'a title removed': {'titles.json': lambda d: (d.update(removed=1), d)[1]},
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
    print('problems:', len(summary['problems']))
    for p in summary['problems']:
        print(' ', p)
    sys.exit(1 if summary['problems'] else 0)


main()
