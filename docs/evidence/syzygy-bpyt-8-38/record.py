"""syzygy-bpyt.8.38: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

The subject is the code commit HEAD over BASE (main after PR 531): the PR 531 review's notes N1-N4. Inputs (all in this directory):
  premise-base.json, targets-head.json  all 18 of the PR 531 reviewer's mutants, run unchanged from
                       docs/evidence/guard-pins-review-2026-10-27/rev-specs-head.json at BASE and at HEAD;
  own-specs.json       one mutant per row this bead adds that the reviewer's specs leave unsplit (written by own_specs.py here);
  own-base.json, own-head.json  own-specs.json at BASE and at HEAD;
  island-diff.json, island-diff-selftest.json  docs/evidence/syzygy-bpyt-8-36/island_diff.py, old testkit (BASE) against new (HEAD);
  repeat-runs.json, titles.json  docs/evidence/syzygy-bpyt-8-36/repeat.py (the four guard files five times at HEAD) and titles.py
                       (their Vitest titles at both commits);
  npa-probe.json       npa_probe.cjs here: npm-package-arg's type for every version form the testkit comment and the rows name.
Every mutant run is the PR 524 reviewer's mut.py, as copied by the PR 531 reviewer (docs/evidence/guard-pins-review-2026-10-27/tools/).
repeat-runs.json, titles.json and npa-probe.json carry no commit of their own; each is tied to HEAD by its content: the repeat total is
HEAD's title count, every added title's row is in HEAD's blob and not BASE's, and the probe's pattern line is HEAD's.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, re, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-8-38'
BASE = 'e5080f4dcdcc208127ae5dc0b915acf413df9764'
HEAD = '831f40c1ab98e4c9b40d98322109506b15ac8b97'
ARGV = 'packages/polaris-dossier/src/argv.test.ts'
REACH = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
CODE = [ARGV, REACH, KIT]
RUNNER = 'docs/evidence/guard-pins-review-2026-10-27/tools/mut.py'
RUNNER_524 = 'docs/evidence/argv-guards-review-2026-10-25/tools/mut.py'
ISLAND_DIFF = 'docs/evidence/syzygy-bpyt-8-36/island_diff.py'
REVIEW_SPECS = 'docs/evidence/guard-pins-review-2026-10-27/rev-specs-head.json'
WS = f'{REACH} > the shared workspace resolver > '
AR = f'{ARGV} > each policy copy above, against the spec its caller passes > '
NAMING = lambda label: f'{WS}reads a bare name declared as {label} as naming no module'
OUTSIDE = lambda label: f'{WS}leaves a bare name declared as {label} outside the workspace'
ROOT_ROW = f"{WS}reads the workspace root's manifest beside the packages'"
CENSUS_ROW = f'{AR}reads every module TypeScript compiles under src, .mts, .cts and .tsx among them, and no test module'
DEPTH_ROW = f'{AR}reads every src directory to its depth'
# Each of the review's N1 and N4 targets, and the new row (or changed row) that must be among its failures at HEAD.
TARGETS = {
    'RV531-R1-dot-slash-dropped': [NAMING('a ./ path dependency')],
    'RV531-R2-bare-dot-dropped': [NAMING('a dependency on its own directory')],
    'RV531-R3-tar-forms-dropped': [NAMING('a .tar dependency'), NAMING('a .tar.gz dependency')],
    'RV531-R4-tilde-loosened': [OUTSIDE('a registry tilde range')],
    'RV531-R5-tarball-end-anchor-dropped': [OUTSIDE('a git dependency whose path holds .tgz')],
    'RV531-R6-root-dependencies-dropped': [ROOT_ROW],
    'RV531-C1-extension-end-anchor-dropped': [CENSUS_ROW],
    'RV531-C4-test-dot-dropped': [CENSUS_ROW],
    'RV531-S2-tree-not-recursive': [DEPTH_ROW],
}
RESIDUAL = ['RV531-T3-root-bare-path-alias']  # N3: a bare directory spec, outside before and after
OWN = {
    'O1-tarball-url-reads-outside': [NAMING('a remote tarball URL dependency')],
    'O2-tar-unread': [NAMING('a .tar dependency')],
    'O3-tar-gz-unread': [NAMING('a .tar.gz dependency')],
    'O4-root-dev-dependencies-dropped': [ROOT_ROW],
}
# The 8 titles this bead adds, each with the row literal that must be in HEAD's blob and not in BASE's.
ADDED = {
    DEPTH_ROW: (ARGV, "  it('reads every src directory to its depth', () => {\n"),
    **{NAMING(label): (REACH, f"    ['{label}', 'dossier', {{ dependencies: {{ dossier: '{version}' }} }}, {{}}],\n") for label, version in (
        ('a ./ path dependency', './lib'), ('a dependency on its own directory', '.'), ('a .tar dependency', 'lib-0.0.0.tar'),
        ('a .tar.gz dependency', 'lib-0.0.0.tar.gz'), ('a remote tarball URL dependency', 'https://example.com/lib-1.0.0.tgz'))},
    **{OUTSIDE(label): (REACH, f"    ['{label}', 'dossier', {{ dependencies: {{ dossier: '{version}' }} }}],\n") for label, version in (
        ('a registry tilde range', '~1.2.3'), ('a git dependency whose path holds .tgz', 'git+https://example.com/lib.tgz.git'))},
}
# The only lines the subject removes from the two test files: the root row's and the census row's bodies, and one comment line.
REMOVED = {
    ARGV: ["    const texts = Object.fromEntries(['main.ts', 'reader.mts', ", "    expect(readArgvCallers(Object.keys(texts), read(texts)).calls).toEqual(['main.ts', "],
    REACH: ["  // workspace root's among them, since npm installs it where every workspace module resolves it.",
            "    expect(WORKSPACE.manifests.get('syzygy-workspace')?.dir).toBe('.');"],
}
CHANGED_ROWS = [ROOT_ROW, CENSUS_ROW]
# npm-package-arg's type for each form the testkit comment names, as the comment states it.
CLAIMS = {**{f: 'directory' for f in ('file:../x', '.', '..', './x', '../x', '/x', '~/x')}, **{f: 'file' for f in ('x.tgz', 'x.tar', 'x.tar.gz')},
          'link:../x': 'throws EUNSUPPORTEDPROTOCOL', 'workspace:*': 'throws EUNSUPPORTEDPROTOCOL', 'npm:@syzygy/lib@*': 'alias',
          'https://example.com/x.tgz': 'remote'}
RESIDUAL_FORMS = ['packages/polaris-dossier/', '.hidden-lib', 'a/b/c']
OUTSIDE_VERSIONS = ['2.9.0', '^1.0.0', 'github:someone/dossier', '~1.2.3', 'git+https://example.com/lib.tgz.git']
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


def row(line):
    """A mut.py FAIL line, less its project: `<file> > <describe> > <title>`."""
    match = re.fullmatch(r'FAIL\s+\S+\s+(\S.*)', line.strip())
    return match.group(1) if match else line


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
        expected = 'survives' if r.get('exit') == 0 else ('killed' if r.get('failed') else 'error')
        if r.get('outcome') != expected:
            problems.append(f'{name} {r["id"]}: outcome {r.get("outcome")} disagrees with exit {r.get("exit")} and {len(r.get("failed", []))} failed rows')
        if r.get('timeouts'):
            problems.append(f'{name} {r["id"]}: {r["timeouts"]} timeouts, so a failure may be load, not the mutant')
        if not r.get('cleanAfter'):
            problems.append(f'{name} {r["id"]}: tree not clean after')
        rows[r['id']] = {'outcome': r.get('outcome'), 'failedRows': sorted(row(f) for f in r.get('failed', [])), 'tests': r.get('tests')}
    missing = sorted(set(specs) - set(rows))
    if missing:
        problems.append(f'{name}: {len(missing)} specs never ran: {missing[:3]}')
    return rows


def hooked(key, value):
    """A git-derived value, which --selftest may replace through MUTATE['@<key>']."""
    return MUTATE[f'@{key}'](value) if f'@{key}' in MUTATE else value


def changed_lines(path, sign):
    return hooked(f'{sign}{path}', [line[1:] for line in git('diff', '-U0', BASE, HEAD, '--', path).splitlines()
                                    if line.startswith(sign) and not line.startswith(sign * 3 + ' ')])


def main_summary():
    problems = []
    review = {m['id']: m for m in json.loads(blob(HEAD, REVIEW_SPECS) or '{"mutants": []}')['mutants']}
    if blob(BASE, REVIEW_SPECS) != blob(HEAD, REVIEW_SPECS):
        problems.append('the reviewer specs differ between BASE and HEAD')
    premise = check_runs('premise-base.json', BASE, review, problems)
    targets = check_runs('targets-head.json', HEAD, review, problems)
    for i, own_rows in TARGETS.items():
        b, h = premise.get(i, {}), targets.get(i, {})
        if (b.get('outcome'), h.get('outcome')) != ('survives', 'killed'):
            problems.append(f'{i}: {b.get("outcome")} at base, {h.get("outcome")} at head')
        if not set(own_rows) <= set(h.get('failedRows', [])):
            problems.append(f'{i}: not killed by its own row at head')
    for i in RESIDUAL:
        if (premise.get(i, {}).get('outcome'), targets.get(i, {}).get('outcome')) != ('survives', 'survives'):
            problems.append(f'{i}: the N3 residual is not a survivor at both commits')
    compare = {'stronger': [], 'unchanged': [], 'weaker': []}
    for i in sorted(set(review) - set(TARGETS) - set(RESIDUAL)):
        b, h = premise.get(i), targets.get(i)
        if b is None or h is None:
            continue
        if b['outcome'] != 'killed' or h['outcome'] != 'killed' or not set(b['failedRows']) <= set(h['failedRows']):
            compare['weaker'].append(i)
        else:
            compare['stronger' if set(h['failedRows']) > set(b['failedRows']) else 'unchanged'].append(i)
    if compare['weaker']:
        problems.append(f'weaker at head, or not killed at base: {compare["weaker"]}')

    own_specs = {m['id']: m for m in load('own-specs.json')['mutants']}
    if sorted(own_specs) != sorted(OWN):
        problems.append('own-specs.json: not the four own mutants')
    own_base = check_runs('own-base.json', BASE, own_specs, problems)
    own_head = check_runs('own-head.json', HEAD, own_specs, problems)
    for i, own_rows in OWN.items():
        if (own_base.get(i, {}).get('outcome'), own_head.get(i, {}).get('outcome')) != ('survives', 'killed'):
            problems.append(f'own {i}: {own_base.get(i, {}).get("outcome")} at base, {own_head.get(i, {}).get("outcome")} at head')
        if own_head.get(i, {}).get('failedRows') != own_rows:
            problems.append(f'own {i}: killed at head by {own_head.get(i, {}).get("failedRows")}, not by its own row alone')

    diff, selftest = load('island-diff.json'), load('island-diff-selftest.json')
    tool = sha(blob(HEAD, ISLAND_DIFF) or '')
    for d, label in ((diff, 'island-diff'), (selftest, 'island-diff-selftest')):
        if (d['base'], d['head'], d['cleanAfter'], d['vitestExit'], d['toolSha256']) != (BASE, HEAD, True, 0, tool):
            problems.append(f'{label}: base, head, clean tree, exit or tool digest is not as required')
    if diff['selftest'] or diff['walks']['equal'] != diff['walks']['entries'] or diff['resolves']['equal'] != diff['resolves']['specifiers'] \
            or diff['walks']['unequal'] or diff['resolves']['unequal']:
        problems.append('island-diff: an answer differs')
    if not selftest['selftest'] or selftest['walks']['equal'] == selftest['walks']['entries'] or selftest['resolves']['equal'] == selftest['resolves']['specifiers']:
        problems.append('island-diff-selftest: the mutated testkit changed no answer')

    titles = load('titles.json')
    added = [f'{f} > {n}' for f, n in titles['addedNames']]
    per_file = titles['perFile']
    if titles['removed'] or titles['removedNames'] or titles['added'] != len(added) or titles['head'] - titles['base'] != len(added) \
            or sum(v['base'] for v in per_file.values()) != titles['base'] or sum(v['head'] for v in per_file.values()) != titles['head'] \
            or titles['duplicatesBase'] or titles['duplicatesHead']:
        problems.append('titles: a title was removed, the arithmetic does not close, or a title is duplicated')
    if sorted(added) != sorted(ADDED):
        problems.append(f'titles: added {sorted(set(added) ^ set(ADDED))[:2]} beyond or short of the 8 rows this bead adds')
    for title, (path, fragment) in ADDED.items():
        if (blob(HEAD, path) or '').count(fragment) != 1 or fragment in (blob(BASE, path) or ''):
            problems.append(f'titles: the row of {title.rsplit(" > ", 1)[-1]!r} is not new at HEAD')
    repeat = load('repeat-runs.json')
    if len(repeat['runs']) < 5 or any(r['exit'] or r['failed'] or r['passed'] != r['total'] or r['total'] != titles['head'] for r in repeat['runs']):
        problems.append("repeat-runs: fewer than 5 ran, a run failed, or a total is not HEAD's title count")

    removed = {path: changed_lines(path, '-') for path in REMOVED}
    for path, prefixes in REMOVED.items():
        if len(removed[path]) != len(prefixes) or any(sum(1 for line in removed[path] if line.startswith(p)) != 1 for p in prefixes):
            problems.append(f'{path}: the subject removes lines beyond the changed rows: {removed[path][:2]}')
    kit_lines = changed_lines(KIT, '-') + changed_lines(KIT, '+')
    if not kit_lines or any(not re.match(r'\s*(?:/\*\*|\*)', line) for line in kit_lines):
        problems.append('testkit: the subject changes a line that is not a comment')

    probe = load('npa-probe.json')
    pattern = [line for line in (blob(HEAD, KIT) or '').splitlines() if line.startswith('const LOCAL_VERSION = ')]
    if probe['pattern'] != (pattern[0] if len(pattern) == 1 else None) or probe['npaVersion'] != '12.0.2':
        problems.append("npa-probe: not HEAD's pattern line, or not npm-package-arg 12.0.2")
    comment = {r['spec']: r for r in probe['comment']}
    for form, kind in CLAIMS.items():
        if (comment.get(form, {}).get('npa'), comment.get(form, {}).get('local')) != (kind, True):
            problems.append(f'npa-probe: {form} is not {kind} and refused')
    for form in RESIDUAL_FORMS:
        if (comment.get(form, {}).get('npa'), comment.get(form, {}).get('local')) != ('directory', False) or f'`{form}`' not in blob(HEAD, KIT):
            problems.append(f'npa-probe: the residual {form} is not a directory npm reads that the pattern leaves outside, named in the comment')
    for r in probe['rows']:
        if f": '{r['spec']}' }}" not in blob(HEAD, REACH) or r['local'] != (r['spec'] not in OUTSIDE_VERSIONS):
            problems.append(f'npa-probe: the row version {r["spec"]} is not in HEAD\'s rows, or sits on the wrong side')
    if sorted(r['spec'] for r in probe['rows'] if not r['local']) != sorted(OUTSIDE_VERSIONS):
        problems.append('npa-probe: the outside rows are not the five controls')

    runner = sha(blob(HEAD, RUNNER) or '')
    if runner != sha(blob(HEAD, RUNNER_524) or 'x'):
        problems.append("the mutant runner is not the PR 524 reviewer's mut.py")
    changed = hooked('names', git('diff', '--name-only', BASE, HEAD).split())
    if sorted(changed) != sorted(CODE):
        problems.append(f'the subject touches {changed}, not the three files')
    tracked = [p for p in git('ls-tree', '-r', '--name-only', '-z', HEAD).split('\0') if p]
    manifests = [p for p in tracked if p == 'package.json' or re.fullmatch(r'(?:apps|packages)/[^/]+/package\.json', p)]
    versions = [[p, field, name, version] for p in manifests for field in ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')
                for name, version in json.loads(blob(HEAD, p)).get(field, {}).items()]
    return {
        'bead': 'syzygy-bpyt.8.38', 'base': BASE, 'head': HEAD,
        'subject': {'what': f'git diff {BASE[:8]} {HEAD[:8]}', 'sha256': sha(git('diff', BASE, HEAD)),
                    'files': {f: {'base': sha(blob(BASE, f)), 'head': sha(blob(HEAD, f))} for f in CODE}},
        'productFilesChanged': [f for f in changed if f not in CODE],
        'mutRunnerSha256': runner,
        'targets': {i: {'base': premise.get(i, {}).get('outcome'), 'head': targets.get(i, {}).get('outcome'),
                        'headFailedRows': targets.get(i, {}).get('failedRows')} for i in [*TARGETS, *RESIDUAL]},
        'otherReviewMutants': compare,
        'own': {i: {'what': own_specs[i]['what'], 'base': own_base.get(i, {}).get('outcome'), 'head': own_head.get(i, {}).get('outcome'),
                    'headFailedRows': own_head.get(i, {}).get('failedRows')} for i in OWN},
        'islandDiff': {'walks': {k: diff['walks'][k] for k in ('entries', 'equal', 'answersSha256')},
                       'resolves': {k: diff['resolves'][k] for k in ('files', 'specifiers', 'equal', 'byAnswer', 'answersSha256')},
                       'selftest': {'walksEqual': selftest['walks']['equal'], 'resolvesEqual': selftest['resolves']['equal']}, 'toolSha256': tool},
        'repeats': {'runs': len(repeat['runs']), 'passed': [r['passed'] for r in repeat['runs']], 'load1': [r['load1'] for r in repeat['runs']]},
        'titles': {'base': titles['base'], 'head': titles['head'], 'added': len(added), 'removed': titles['removed'],
                   'bodiesChanged': CHANGED_ROWS, 'perFile': per_file,
                   'line': f'Tests: +{len(added)} ~{len(CHANGED_ROWS)} -{titles["removed"]}'},
        'npaProbe': {'npaVersion': probe['npaVersion'], 'node': probe['node'], 'forms': len(probe['comment']) + len(probe['rows']),
                     'toolSha256': sha(blob(HEAD, 'docs/evidence/syzygy-bpyt-8-38/npa_probe.cjs') or (HERE / 'npa_probe.cjs').read_text())},
        'faithfulTree': {'manifests': len(manifests), 'dependencyVersions': len(versions),
                         'local': [v for v in versions if LOCAL_VERSION.search(v[3])],
                         'bareDirectoryShaped': [v for v in versions if ':' not in v[3] and ('/' in v[3] or v[3].startswith('.')) and not LOCAL_VERSION.search(v[3])]},
        'problems': problems,
    }


def first(d, i):
    return next(r for r in d['results'] if r['id'] == i)


def kill(r, rows=('FAIL   @syzygy/x  packages/x/src/x.test.ts > x > y',)):
    r.update(outcome='killed', exit=1, failed=list(rows))


SELFTEST = {
    'a target that survives at head': {'targets-head.json': lambda d: (first(d, 'RV531-R1-dot-slash-dropped').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a target killed at base': {'premise-base.json': lambda d: (kill(first(d, 'RV531-C4-test-dot-dropped')), d)[1]},
    'a target killed by another row': {'targets-head.json': lambda d: (kill(first(d, 'RV531-S2-tree-not-recursive')), d)[1]},
    'a target never run at base': {'premise-base.json': lambda d: (d.update(results=[r for r in d['results'] if r['id'] != 'RV531-R6-root-dependencies-dropped']), d)[1]},
    'the residual killed at head': {'targets-head.json': lambda d: (kill(first(d, RESIDUAL[0])), d)[1]},
    'a base kill lost at head': {'targets-head.json': lambda d: (first(d, 'RV531-R7-own-package-only').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a base kill with a row lost at head': {'targets-head.json': lambda d: (first(d, 'RV531-R8-git-reads-local')['failed'].pop(0), d)[1]},
    'a run at another commit': {'targets-head.json': lambda d: (d.update(head=BASE), d)[1]},
    'a run with a timeout': {'own-head.json': lambda d: (first(d, 'O2-tar-unread').update(timeouts=1), d)[1]},
    'an own mutant that survives at head': {'own-head.json': lambda d: (first(d, 'O1-tarball-url-reads-outside').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'an own mutant killed at base': {'own-base.json': lambda d: (kill(first(d, 'O4-root-dev-dependencies-dropped')), d)[1]},
    'an own mutant killed by another row too': {'own-head.json': lambda d: (first(d, 'O3-tar-gz-unread')['failed'].append('FAIL   @syzygy/x  ' + DEPTH_ROW), d)[1]},
    'an outcome that disagrees with its exit': {'own-head.json': lambda d: (first(d, 'O2-tar-unread').update(exit=0), d)[1]},
    'a run whose edits are not its spec': {'own-head.json': lambda d: (first(d, 'O1-tarball-url-reads-outside')['edits'][0].update(new='x'), d)[1]},
    'a spec whose fragment HEAD lacks': {'own-specs.json': lambda d: (d['mutants'][0]['edits'][0].update(old='no such text'), d)[1],
                                         'own-head.json': lambda d: (d['results'][0]['edits'][0].update(old='no such text'), d)[1],
                                         'own-base.json': lambda d: (d['results'][0]['edits'][0].update(old='no such text'), d)[1]},
    'a tree left dirty': {'own-base.json': lambda d: (d['results'][3].update(cleanAfter=False), d)[1]},
    'a walk that differs': {'island-diff.json': lambda d: (d['walks'].update(equal=d['walks']['equal'] - 1), d)[1]},
    'an island diff by another tool': {'island-diff.json': lambda d: (d.update(toolSha256='0' * 64), d)[1]},
    'a differential selftest that changes nothing': {'island-diff-selftest.json': lambda d: (d['resolves'].update(equal=d['resolves']['specifiers']), d['walks'].update(equal=d['walks']['entries']), d)[2]},
    'a repeat run that fails': {'repeat-runs.json': lambda d: (d['runs'][2].update(failed=['x'], passed=d['runs'][2]['passed'] - 1), d)[1]},
    "a repeat run of BASE's population": {'repeat-runs.json': lambda d: ([r.update(total=157, passed=157) for r in d['runs']], d)[1]},
    'a title removed': {'titles.json': lambda d: (d.update(removed=1), d['removedNames'].append([ARGV, 'x']), d)[2]},
    'an added title this bead does not add': {'titles.json': lambda d: (d['addedNames'][0].__setitem__(1, 'x > y'), d)[1]},
    "a probe of another pattern": {'npa-probe.json': lambda d: (d.update(pattern=d['pattern'].replace('tgz|', '')), d)[1]},
    'a comment claim npm does not make': {'npa-probe.json': lambda d: (next(r for r in d['comment'] if r['spec'] == 'npm:@syzygy/lib@*').update(npa='remote'), d)[1]},
    'a residual the pattern refuses': {'npa-probe.json': lambda d: (next(r for r in d['comment'] if r['spec'] == 'a/b/c').update(local=True), d)[1]},
    'a code line changed in the testkit': {f'@+{KIT}': lambda lines: [*lines, 'const LOCAL_VERSION = /^file:/iu;']},
    'another line removed from a test file': {f'@-{REACH}': lambda lines: [*lines, "  it('resolves a relative import', () => {"]},
    'the census row body left unchanged': {f'@-{ARGV}': lambda lines: lines[:1]},
    'a product file in the subject': {'@names': lambda names: [*names, 'packages/polaris-dossier/src/argv.ts']},
    'a row version on the wrong side': {'npa-probe.json': lambda d: (next(r for r in d['rows'] if r['spec'] == '~1.2.3').update(local=True), d)[1]},
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
