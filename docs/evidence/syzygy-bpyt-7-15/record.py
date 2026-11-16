"""syzygy-bpyt.7.15: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

The subject is HEAD over BASE (main after PR 535): the PR 529 review's notes N2, N9 and N12, and N5 for the differential it reuses.
  N2 and N9: comments only, in packages/http-host/src/server.ts and shutdown.ts;
  N12: the POC's 13 test files that imported the host through @syzygy/cap1-daemon import it from @syzygy/http-host, and the
       POC's package.json, tsconfig.json reference and lock entry for cap1-daemon go.
Inputs (all in this directory):
  code-equal.json      code_equal.cjs: both http-host files printed without comments at BASE and HEAD, with its selftest;
  poc-alone-*.json     poc_alone.py at each commit: `tsc -b apps/three-surface-poc` from no dist, plain and with a mutant import;
  titles.json          titles.py: the Vitest titles of the three projects touched, at both commits;
  suite-head.json      suite_run.py: one full run of those projects at HEAD;
  rerun-alone-*.json   rerun_alone.py: polaris-authority-sweep.test.ts alone at each commit (an earlier full run at HEAD, under
                       load, timed it out; see the PR body);
  diff-out/            diff-tools/differential.py with --selftest: surface, host answers, built daemon and gate, BASE against HEAD.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, re, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-7-15'
BASE = '9dba258992667f62ad503ec76d8a6b99efcc4bac'
HEAD = 'f2304fd5d2bfd0e50c48d6ea356ddea3f7be162d'
SERVER = 'packages/http-host/src/server.ts'
SHUTDOWN = 'packages/http-host/src/shutdown.ts'
POC = 'apps/three-surface-poc'
TESTS = [f'{POC}/src/{name}.test.ts' for name in (
    'evaluation-footer', 'main', 'materialize-action', 'page-size-delta', 'polaris-accessible-names.browser',
    'polaris-presentation-route', 'polaris-source-route', 'reobserve-action', 'response-limits', 'routes', 'surface-routes',
    'tuple-encoding', 'verbatim-route')]
MANIFEST, TSCONFIG, LOCK = f'{POC}/package.json', f'{POC}/tsconfig.json', 'package-lock.json'
SUBJECT = sorted([SERVER, SHUTDOWN, *TESTS, MANIFEST, TSCONFIG, LOCK])
# server.ts keeps every line number: only its header (lines 11-29) and line 76 change.
SERVER_LINES = set(range(11, 30)) | {76}
REMOVED = {
    MANIFEST: ['    "@syzygy/cap1-daemon": "0.0.0",'],
    TSCONFIG: ['    {', '      "path": "../../packages/cap1-daemon"', '    },'],
    LOCK: ['        "@syzygy/cap1-daemon": "0.0.0",'],
}
OLD_SPEC, NEW_SPEC = "from '@syzygy/cap1-daemon';", "from '@syzygy/http-host';"
SURFACE_TREES = [f'{POC}/src', 'packages/three-surface-poc-core/src']
MUTANTS = {  # differential.py's selftest: name -> (check, expected)
    'refusal-status': ('hostEqualThroughHttpHost', 'detected'), 'credential-detail': ('hostEqualThroughCap1Daemon', 'detected'),
    'shutdown-announcement': ('e2eEqual', 'detected'), 'gate-cap1-daemon-prefix': ('gateEqual', 'detected'),
    'shim-type-dropped': ('surfaceEqual', 'detected'), 'shim-binding-swapped': ('surfaceEqual', 'detected'),
    'source-value-changed': ('surfaceEqual', 'held'),
}
COMPARISONS = ['surfaceEqual', 'hostEqualThroughCap1Daemon', 'hostEqualThroughHttpHost', 'e2eEqual']
# Files whose run count exceeds their listed count at HEAD, each by one skipped test: the live test, skipped without
# BUTLERS_REPO, which `vitest list` does not report, and one skipped browser test.
LIST_GAP = {f'{POC}/src/project-shape-discovery.live.test.ts': (None, 1), f'{POC}/src/polaris-opening-index.browser.test.ts': (13, 14)}
SWEEP = f'{POC}/src/polaris-authority-sweep.test.ts'
MUTATE = {}


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], check=True, capture_output=True, text=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def blob(commit, path, cache={}):
    if (commit, path) not in cache:
        cache[commit, path] = git('show', f'{commit}:{path}')
    return cache[commit, path]


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def hooked(key, value):
    """A git-derived value, which --selftest may replace through MUTATE['@<key>']."""
    return MUTATE[f'@{key}'](value) if f'@{key}' in MUTATE else value


def diff_lines(path):
    """The lines HEAD removes from and adds to one file, by `git diff -U0`."""
    removed, added = [], []
    for line in git('diff', '-U0', BASE, HEAD, '--', path).splitlines():
        if line.startswith(('---', '+++')):
            continue
        if line.startswith('-'):
            removed.append(line[1:])
        elif line.startswith('+'):
            added.append(line[1:])
    return hooked(f'-{path}', removed), hooked(f'+{path}', added)


def naming(commit):
    """Every POC file that names @syzygy/cap1-daemon at a commit (`git grep -l`, whose exit 1 means none)."""
    run = subprocess.run(['git', '-C', str(TREE), 'grep', '-l', '-F', '@syzygy/cap1-daemon', commit, '--', POC], capture_output=True, text=True)
    if run.returncode not in (0, 1):
        raise RuntimeError(run.stderr)
    return sorted(line.split(':', 1)[1] for line in run.stdout.splitlines())


def surface_version(commit):
    trees = [git('rev-parse', f'{commit}:{path}').strip() for path in SURFACE_TREES]
    return trees, 'polaris@' + sha('\n'.join(trees))[:12]


def summary():
    problems = []
    names = hooked('names', sorted(git('diff', '--name-only', BASE, HEAD).split()))
    if names != SUBJECT:
        problems.append(f'subject: {sorted(set(names) ^ set(SUBJECT))} differ from the stated file list')

    # N12: one import line per test file, and the three removals.
    for path in TESTS:
        removed, added = diff_lines(path)
        if len(removed) != 1 or OLD_SPEC not in removed[0] or added != [removed[0].replace(OLD_SPEC, NEW_SPEC)]:
            problems.append(f'{path}: the diff is not one import moved from cap1-daemon to http-host')
    for path, lines in REMOVED.items():
        removed, added = diff_lines(path)
        if removed != lines or added:
            problems.append(f'{path}: removes {removed} and adds {added}, not only {lines}')
    lock_base, lock_head = json.loads(blob(BASE, LOCK)), json.loads(blob(HEAD, LOCK))
    lock_base['packages'][POC]['dependencies'].pop('@syzygy/cap1-daemon', None)
    if hooked('lockRest', lock_base) != lock_head:
        problems.append('package-lock.json: differs by more than the POC entry dropping @syzygy/cap1-daemon')
    importers = {'base': naming(BASE), 'head': hooked('importersHead', naming(HEAD))}
    if importers['head']:
        problems.append(f'POC files naming @syzygy/cap1-daemon at HEAD: {importers["head"]}')
    if sorted(importers['base']) != sorted([*TESTS, MANIFEST]):
        problems.append(f'POC files naming @syzygy/cap1-daemon at BASE are not the 13 test files and the manifest: {importers["base"]}')

    # N2 and N9: comments only.
    code = load('code-equal.json')
    if (code['base'], code['head']) != (BASE, HEAD):
        problems.append('code-equal.json: not BASE against HEAD')
    rows = {r['file']: r for r in code['rows']}
    for path in (SERVER, SHUTDOWN):
        r = rows.get(path)
        if r is None:
            problems.append(f'code-equal.json: no row for {path}')
            continue
        if (r['base'], r['head']) != (sha(blob(BASE, path)), sha(blob(HEAD, path))):
            problems.append(f'code-equal.json {path}: not the bytes at BASE and HEAD')
        if not (r['bytesDiffer'] and r['codeEqual'] and r['printBase'] == r['printHead']):
            problems.append(f'code-equal.json {path}: the code differs')
        st = r.get('selftest', {})
        if not (st.get('identifierRenamed', {}).get('equal') is False and st.get('literalChanged', {}).get('equal') is False
                and st.get('commentAdded', {}).get('equal') is True):
            problems.append(f'code-equal.json {path}: the comparison selftest did not give differ, differ, equal')
    base_lines, head_lines = blob(BASE, SERVER).split('\n'), hooked('serverHead', blob(HEAD, SERVER)).split('\n')
    moved = len(base_lines) != len(head_lines)
    changed = sorted(i + 1 for i, (a, b) in enumerate(zip(base_lines, head_lines)) if a != b)
    if moved or not set(changed) <= SERVER_LINES:
        problems.append(f'{SERVER}: line numbers move, or lines outside the header and line 76 change: {changed}')
    removed, added = diff_lines(SHUTDOWN)
    if removed or len(added) != 6 or not all(line.startswith('//') for line in added):
        problems.append(f'{SHUTDOWN}: the diff is not six added comment lines')

    # The POC builds without cap1-daemon at HEAD, and a re-import of it fails there.
    alone = {}
    for side, commit in (('base', BASE), ('head', HEAD)):
        d = load(f'poc-alone-{side}.json')
        plain, mutant = d['builds']
        if d['commit'] != commit or not d['cleanAfter']:
            problems.append(f'poc-alone-{side}.json: not a clean run at {side}')
        if plain['distBefore'] or mutant['distBefore']:
            problems.append(f'poc-alone-{side}.json: a dist existed before a build')
        refers = '../../packages/cap1-daemon' in d['references']
        built = 'packages/cap1-daemon/dist' in plain['distAfter']
        unresolved = any("error TS2307: Cannot find module '@syzygy/cap1-daemon'" in e for e in mutant['errors'])
        if plain['exit'] != 0 or (refers, built) != ((True, True) if side == 'base' else (False, False)):
            problems.append(f'poc-alone-{side}.json: plain build exit {plain["exit"]}, references cap1-daemon {refers}, builds it {built}')
        if side == 'base' and mutant['exit'] != 0:
            problems.append('poc-alone-base.json: the mutant import fails at BASE, so it proves nothing at HEAD')
        if side == 'head' and (mutant['exit'] == 0 or not unresolved):
            problems.append('poc-alone-head.json: the mutant import of @syzygy/cap1-daemon still builds at HEAD')
        alone[side] = {'references': d['references'], 'plainExit': plain['exit'], 'buildsCap1Daemon': built, 'mutantExit': mutant['exit']}

    # Tests: the same titles, all passing.
    titles = load('titles.json')
    if (titles['baseCommit'], titles['headCommit']) != (BASE, HEAD):
        problems.append('titles.json: not BASE against HEAD')
    if titles['added'] or titles['removed'] or titles['base'] != titles['head'] or titles['duplicatesBase'] or titles['duplicatesHead']:
        problems.append(f'titles.json: {len(titles["added"])} added, {len(titles["removed"])} removed, {titles["base"]} -> {titles["head"]}')
    suite = load('suite-head.json')
    if suite['commit'] != HEAD or not suite['cleanAfter']:
        problems.append('suite-head.json: not a clean run at HEAD')
    if suite['exit'] != 0 or suite['failed'] or suite['total'] != suite['passed'] + suite['skipped']:
        problems.append(f'suite-head.json: exit {suite["exit"]}, {suite["failed"]} failed')
    listed = {f: c['head'] for f, c in titles['perFile'].items() if c['head']}
    gap = {f: (listed.get(f), n) for f, n in suite['perFile'].items() if listed.get(f) != n}
    gap.update({f: (n, suite['perFile'].get(f)) for f, n in listed.items() if f not in suite['perFile']})
    if gap != LIST_GAP or suite['skipped'] != len(LIST_GAP) or suite['total'] != titles['head'] + len(LIST_GAP):
        problems.append(f'suite-head.json: run and list counts differ other than by the two skipped tests: {gap}')
    if set(LIST_GAP) & set(SUBJECT):
        problems.append('a file the subject changes is among the run-list differences')
    rerun = {}
    for side, commit in (('base', BASE), ('head', HEAD)):
        d = load(f'rerun-alone-{side}.json')
        r = next((r for r in d['rows'] if r['file'] == SWEEP), None)
        if d['commit'] != commit or not d['cleanAfter'] or r is None or r['exit'] != 0 or r['failed'] or r['passed'] != r['total']:
            problems.append(f'rerun-alone-{side}.json: the authority sweep does not pass alone at {side}')
        else:
            rerun[side] = {'total': r['total'], 'passed': r['passed'], 'load1': r['load1']}

    # The differential: every comparison equal, the gate's too, and its selftest as stated.
    diff = load('diff-out/differential.json')
    if (diff['base'], diff['head']) != (BASE, HEAD):
        problems.append('differential.json: not BASE against HEAD')
    for c in COMPARISONS:
        if diff[c] is not True:
            problems.append(f'differential.json: {c} is {diff[c]}')
    gate = diff['gate']
    if gate['differing'] or not gate['gateEqual'] or gate['refusedAtBase'] != gate['refusedAtHead']:
        problems.append(f'differential.json: {len(gate["differing"])} gate decisions differ')
    if not any(p.startswith('packages/cap1-daemon/') for p in gate['refusedAtHead']):
        problems.append('differential.json: the gate refuses no cap1-daemon path at HEAD')
    if not diff['asExpected']:
        problems.append('differential.json: not as expected')
    outcomes = {o['mutant']: o for o in diff.get('selftest', [])}
    if set(outcomes) != set(MUTANTS):
        problems.append(f'differential.json: selftest mutants {sorted(outcomes)} are not the seven stated')
    for name, (check, expected) in MUTANTS.items():
        o = outcomes.get(name)
        if o is None:
            continue
        if o['check'] != check or o['expected'] != expected or o['detected'] is not (expected == 'detected'):
            problems.append(f'differential.json {name}: {o["check"]} {"detected" if o["detected"] else "held"}, not {check} {expected}')
        if o['file'].endswith('.ts') and blob(HEAD, o['file']).count(o['old']) != 1:
            problems.append(f'differential.json {name}: old fragment does not occur once in {o["file"]} at HEAD')
    if not diff.get('selftestPassed'):
        problems.append('differential.json: selftest not passed')
    for name, digest in diff['records'].items():
        if sha((HERE / 'diff-out' / name).read_bytes()) != digest:
            problems.append(f'differential.json: diff-out/{name} is not the record it ran')
    for name, digest in diff['toolsSha256'].items():
        if sha((HERE / 'diff-tools' / name).read_bytes()) != digest:
            problems.append(f'differential.json: diff-tools/{name} is not the tool it ran')

    trees_base, version_base = surface_version(BASE)
    trees_head, version_head = surface_version(HEAD)
    if trees_base[1] != trees_head[1]:
        problems.append('packages/three-surface-poc-core/src changed')
    return {
        'bead': 'syzygy-bpyt.7.15', 'base': BASE, 'head': HEAD, 'subject': SUBJECT,
        'subjectSha256': {p: sha(blob(HEAD, p)) for p in SUBJECT},
        'serverLinesChanged': changed, 'pocCap1DaemonNames': importers,
        'pocAlone': alone,
        'tests': {'titles': titles['head'], 'files': len(titles['perFile']), 'added': len(titles['added']), 'removed': len(titles['removed']),
                  'run': {k: suite[k] for k in ('total', 'passed', 'failed', 'skipped', 'files', 'load1')}, 'authoritySweepAlone': rerun},
        'differential': {**{c: diff[c] for c in COMPARISONS}, 'gatePaths': gate['paths'], 'gateDiffering': len(gate['differing']),
                         'refused': len(gate['refusedAtHead']),
                         'selftest': {n: 'detected' if o['detected'] else 'held' for n, o in sorted(outcomes.items())}},
        'surfaceVersion': {'base': version_base, 'head': version_head, 'moves': version_base != version_head,
                           'why': 'apps/three-surface-poc/src holds the 13 test files N12 changes; the core tree is unchanged'},
        'toolsSha256': {p.name: sha(p.read_bytes()) for p in sorted(HERE.iterdir()) if p.suffix in ('.py', '.cjs')},
        'problems': problems,
    }


def first(d, name):
    return next(o for o in d['selftest'] if o['mutant'] == name)


SELFTEST = {
    'a product file in the subject': {'@names': lambda names: sorted([*names, f'{POC}/src/routes.ts'])},
    'a test file whose import stays on cap1-daemon': {f'@+{TESTS[0]}': lambda lines: [lines[0].replace(NEW_SPEC, OLD_SPEC)]},
    'a test file with a second line changed': {f'@-{TESTS[3]}': lambda lines: [*lines, "import { it } from 'vitest';"]},
    'a manifest that adds a line': {f'@+{MANIFEST}': lambda lines: [*lines, '    "@syzygy/http-host": "0.0.0",']},
    'a tsconfig reference left half removed': {f'@-{TSCONFIG}': lambda lines: lines[1:]},
    'a lock that changes another entry': {'@lockRest': lambda d: (d['packages'][POC].__setitem__('version', '9.9.9'), d)[1]},
    'a POC file still naming cap1-daemon': {'@importersHead': lambda files: [*files, f'{POC}/src/routes.test.ts']},
    'a code change in the server header': {'code-equal.json': lambda d: (d['rows'][0].update(codeEqual=False), d)[1]},
    'a comparison of other bytes': {'code-equal.json': lambda d: (d['rows'][1].update(head='0' * 64), d)[1]},
    'a printer selftest that sees no rename': {'code-equal.json': lambda d: (d['rows'][0]['selftest']['identifierRenamed'].update(equal=True), d)[1]},
    'a server line that moves': {'@serverHead': lambda text: '\n' + text},
    'a server line changed below the header': {'@serverHead': lambda text: text.replace('const response: RouteResponse', 'const  response: RouteResponse', 1)},
    'a code line added to shutdown.ts': {f'@+{SHUTDOWN}': lambda lines: [*lines[:5], 'export const X = 1;']},
    'the POC still building cap1-daemon at HEAD': {'poc-alone-head.json': lambda d: (d['builds'][0]['distAfter'].append('packages/cap1-daemon/dist'), d)[1]},
    'the mutant import building at HEAD': {'poc-alone-head.json': lambda d: (d['builds'][1].update(exit=0, errors=[]), d)[1]},
    'the mutant import failing at BASE': {'poc-alone-base.json': lambda d: (d['builds'][1].update(exit=2), d)[1]},
    'a build with a dist present': {'poc-alone-base.json': lambda d: (d['builds'][0]['distBefore'].append('packages/cap1-core/dist'), d)[1]},
    'a title removed': {'titles.json': lambda d: (d['removed'].append([TESTS[0], 'x']), d)[1]},
    'titles of another commit': {'titles.json': lambda d: (d.update(headCommit=BASE), d)[1]},
    'a failing suite': {'suite-head.json': lambda d: (d.update(failed=1, passed=d['passed'] - 1, exit=1), d)[1]},
    'a file run that the list lacks': {'suite-head.json': lambda d: (d['perFile'].update({TESTS[0]: d['perFile'][TESTS[0]] + 1}), d)[1]},
    'a sweep failing alone at base': {'rerun-alone-base.json': lambda d: (d['rows'][0].update(failed=1, passed=4, exit=1), d)[1]},
    'a host answer that differs': {'diff-out/differential.json': lambda d: (d.update(hostEqualThroughHttpHost=False), d)[1]},
    'a gate decision that differs': {'diff-out/differential.json': lambda d: (d['gate'].update(differing=[['x', 'clean', 'refused']], gateEqual=False), d)[1]},
    'a gate that refuses no cap1-daemon path': {'diff-out/differential.json': lambda d: (d['gate'].update(
        refusedAtHead=[p for p in d['gate']['refusedAtHead'] if not p.startswith('packages/cap1-daemon/')],
        refusedAtBase=[p for p in d['gate']['refusedAtBase'] if not p.startswith('packages/cap1-daemon/')]), d)[1]},
    'a surface mutant that survives': {'diff-out/differential.json': lambda d: (first(d, 'shim-binding-swapped').update(detected=False, checkHeld=True), d)[1]},
    'the limit mutant detected': {'diff-out/differential.json': lambda d: (first(d, 'source-value-changed').update(detected=True, checkHeld=False), d)[1]},
    'a selftest missing a mutant': {'diff-out/differential.json': lambda d: (d.update(selftest=d['selftest'][:-1]), d)[1]},
    'a mutant fragment HEAD lacks': {'diff-out/differential.json': lambda d: (first(d, 'shim-type-dropped').update(old='  type NoSuch,\n'), d)[1]},
    'a record that is not the one run': {'diff-out/differential.json': lambda d: (d['records'].update({'e2e-head.json': '0' * 64}), d)[1]},
    'a differential by another tool': {'diff-out/differential.json': lambda d: (d['toolsSha256'].update({'differential.py': '0' * 64}), d)[1]},
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
    result = json.loads(text)
    if '--check' in sys.argv[2:]:
        same = (HERE / 'summary.json').read_text() == text
        print('summary.json', 'matches' if same else 'DIFFERS', '; problems:', len(result['problems']))
        sys.exit(0 if same and not result['problems'] else 1)
    (HERE / 'summary.json').write_text(text)
    print('wrote summary.json; problems:', len(result['problems']))
    for p in result['problems']:
        print(' -', p)


main()
