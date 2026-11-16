"""syzygy-bpyt.7.16: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

The subject is HEAD over BASE (main after PR 539): the PR 535 review's notes N3, N4, N5 and N7, as rows in three test files. HEAD
merges the code commit CODE (over CODE_BASE, main after PR 487) with BASE, and its diff over BASE must equal CODE's over CODE_BASE.
Inputs (all in this directory):
  rev535-at-base.json, rev535-at-head.json  all 13 of the PR 535 reviewer's mutants and its CONTROL, run unchanged from
                       docs/evidence/host-pins-review-2026-10-27/rev535-specs.json with that reviewer's rev535_mut.py, at BASE and HEAD;
  own-specs.json       two own mutants (own_specs.py here) for the two added forms no reviewer mutant reaches alone;
  own-base.json, own-head.json  own-specs.json at BASE and at HEAD, with the same runner;
  titles.json, repeat-runs.json  docs/evidence/syzygy-bpyt-7-14/tools/titles.py (every title in the repository at both commits)
                       and repeats.py (the three changed files five times at HEAD);
  suite.json           suite_summary.py here, over Vitest JSON reports of the three affected projects' suites in a clean clone at HEAD.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, re, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-7-16'
BASE = 'eb8fb6cb523c7d415390ac60c15f7c2c56db2398'
HEAD = '0d7eaf08a19dd64bdeb294d3995861fbfbaad759'
CODE_BASE = 'd38d7a3ce632a34c2a41bdb77ad323ba0b05b777'
CODE = 'acb92078c6d81e3af25be3600c122ce5174679bc'
CRED = 'packages/http-host/src/credentials.test.ts'
ORIGIN = 'apps/three-surface-poc/src/browser-origin.test.ts'
SERVER = 'packages/cap1-daemon/src/server.test.ts'
SUBJECT = [CRED, ORIGIN, SERVER]
REVIEW_DIR = 'docs/evidence/host-pins-review-2026-10-27'
RUNNER = f'{REVIEW_DIR}/tools/rev535_mut.py'
REVIEW_SPECS = f'{REVIEW_DIR}/rev535-specs.json'
TOOLS = {name: f'docs/evidence/syzygy-bpyt-7-14/tools/{name}' for name in ('titles.py', 'repeats.py')}
OWN_TOOLS = ['own_specs.py', 'suite_summary.py', 'record.py']
WRITE = f'{CRED} > RT3 — state-write boundary '
BEARER = f'{CRED} > RT3 — credential verification through core admission the minted token behind any other whitespace refuses, named'
WHOLE = f'{ORIGIN} > browserRequestAllowed — the Origin is compared whole '
BREACH = (f'{SERVER} > RT3 — credential-classed admission at the transport logs a 503 breach diagnostic for each listed Unknown population '
          'and withholds an unlisted one')
CASE_ROW = f'{WRITE}refuses a sibling whose name differs from the state dir name only in case, as traversal'
SUFFIX_ROW = f'{WHOLE}refuses an origin that only ends with the host origin, and the opaque origin null'
NBSP = '\u00a0'
# Each target, the one row that must be its only failure at HEAD, and text its first failure must hold (the form that failed).
TARGETS = {
    'V2-bearer-leading-whitespace-admitted': (BEARER, '" Bearer a'),
    'V4-containment-case-insensitive': (CASE_ROW, 'expected true to be false'),
    'V6-origin-suffix-match': (SUFFIX_ROW, 'expected true to be false'),
    'V10-listed-reason-matched-case-insensitively': (BREACH, 'to deeply equal'),
}
OWN = {
    'O1-bearer-no-break-space-admitted': (BEARER, f'"Bearer{NBSP}a'),
    'O2-origin-null-allowed': (SUFFIX_ROW, 'expected true to be false'),
}
# Survivors at both commits: V1 a timing property no behaviour row sees; V7 and V8 case variants a browser never sends; V11 fails
# closed; V12 the observer-input gate's N6, which syzygy-bpyt.6.15 (PR 540) carries.
RESIDUAL = ['V1-token-compare-not-constant-time', 'V7-origin-compared-case-insensitively', 'V8-host-lower-cased-before-check',
            'V11-gate-prefix-without-trailing-slash', 'V12-gate-prefix-src-and-manifest-only']
# The 2 titles this bead adds, each with the `it(` line that must be in HEAD's blob and not in BASE's.
# (Vitest's list joins describe and title with ' > '; the mutant runner's failed rows join them with a space.)
ADDED = {
    f'{CRED} > RT3 — state-write boundary > refuses a sibling whose name differs from the state dir name only in case, as traversal': (CRED, "  it('refuses a sibling whose name differs from the state dir name only in case, as traversal', () => {\n"),
    f'{ORIGIN} > browserRequestAllowed — the Origin is compared whole > refuses an origin that only ends with the host origin, and the opaque origin null': (ORIGIN, "  it('refuses an origin that only ends with the host origin, and the opaque origin null', () => {\n"),
}
# The only lines the subject removes: the bearer row's list and comment, and the breach row's reasons and unlisted event.
REMOVED = {
    CRED: ['  // token is every character after it, never trimmed.\n',
           '    for (const header of [`Bearer  ${TOKEN}`, `Bearer\\t${TOKEN}`, `Bearer ${TOKEN} `, `Bearer ${TOKEN}\\n`]) {\n'],
    SERVER: ["    const reasons = ['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed', "
             "'project shape unlisted-sentinel'];\n",
             "      { kind: 'daemon-http-outcome', method: 'GET', route: '/breach-3', status: 503, reason: 'route-non-success', "
             "contentType: 'application/json' },\n"],
    ORIGIN: [],
}
# The forms each changed row must now carry at HEAD.
ADDED_FORMS = {CRED: ['` Bearer ${TOKEN}`', '`Bearer\\u00a0${TOKEN}`'], SERVER: ["'Project shape not-admitted'", "not.toContain('Project shape')"],
               ORIGIN: ["origin: 'http://attacker.invalid.http://127.0.0.1:7478'", "origin: 'null'"]}
CHANGED_ROWS = [BEARER, BREACH]
# Their title lines, which must be byte-unchanged; and the three files' title count at HEAD (53 at BASE, plus the 2 added).
CHANGED_ROW_LINES = {CRED: "  it('the minted token behind any other whitespace refuses, named', () => {\n",
                     SERVER: "  it('logs a 503 breach diagnostic for each listed Unknown population and withholds an unlisted one', async () => {\n"}
REPEAT_TOTAL = 55
SKIPS = ['opening index in a real browser', 'live Butlers project-shape discovery']
SURFACE_TREES = ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src']
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


def hooked(key, value):
    """A git-derived value, which --selftest may replace through MUTATE['@<key>']."""
    return MUTATE[f'@{key}'](value) if f'@{key}' in MUTATE else value


def check_runs(name, commit, specs, problems):
    d = load(name)
    if d['commit'] != commit:
        problems.append(f'{name}: ran at {d["commit"]}, not {commit}')
    rows = {}
    for r in d['results']:
        spec = specs.get(r['id'])
        if spec is None:
            problems.append(f'{name} {r["id"]}: no such spec')
            continue
        if r.get('edits') != spec['edits'] or r.get('commit') != commit or r.get('files') != spec.get('files', specs['@files']):
            problems.append(f'{name} {r["id"]}: edits, commit or file list differ from the spec')
        for e in spec['edits']:
            if (blob(commit, e['file']) or '').count(e['old']) != 1:
                problems.append(f'{name} {r["id"]}: old fragment does not occur once in {e["file"]} at {commit[:8]}')
        failed = r.get('failed', [])
        expected = 'survived' if r.get('exit') == 0 and not failed else ('killed' if r.get('exit') != 0 and failed else 'error')
        if r.get('outcome') != expected or r.get('failedTests') != len(failed):
            problems.append(f'{name} {r["id"]}: outcome {r.get("outcome")} disagrees with exit {r.get("exit")} and {len(failed)} failed rows')
        if any(f['timedOut'] for f in failed):
            problems.append(f'{name} {r["id"]}: a failure timed out, so a kill may be load, not the mutant')
        if not r.get('cleanAfter') or r.get('reportError'):
            problems.append(f'{name} {r["id"]}: tree not clean after, or no report')
        rows[r['id']] = {'outcome': r.get('outcome'), 'failedRows': sorted(f['title'] for f in failed),
                         'first': failed[0]['message'] if failed else None, 'total': r.get('totalTests')}
    missing = sorted(set(specs) - {'@files'} - set(rows))
    if missing:
        problems.append(f'{name}: {len(missing)} specs never ran: {missing[:3]}')
    return rows


def removed_lines(path):
    return hooked(f'-{path}', [line[1:] + '\n' for line in git('diff', '-U0', BASE, HEAD, '--', path).splitlines()
                               if line.startswith('-') and not line.startswith('--- ')])


def grep_files(text, commit):
    """Every path at `commit` holding `text`; git grep exits 1 for none, and any other nonzero exit is an error."""
    run = subprocess.run(['git', '-C', str(TREE), 'grep', '-l', '-F', text, commit], capture_output=True, text=True)
    if run.returncode not in (0, 1):
        raise RuntimeError(run.stderr)
    return run.stdout.split()


def surface(commit):
    trees = [git('rev-parse', f'{commit}:{p}').strip() for p in SURFACE_TREES]
    return f'polaris@{sha(chr(10).join(trees))[:12]}'


def main_summary():
    problems = []
    doc = json.loads(blob(HEAD, REVIEW_SPECS) or '{"files": [], "mutants": []}')
    review = {m['id']: m for m in doc['mutants']} | {'@files': doc['files']}
    if blob(BASE, REVIEW_SPECS) != blob(HEAD, REVIEW_SPECS) or len(doc['mutants']) != 14:
        problems.append('the reviewer specs differ between BASE and HEAD, or are not CONTROL and 13 mutants')
    base = check_runs('rev535-at-base.json', BASE, review, problems)
    head = check_runs('rev535-at-head.json', HEAD, review, problems)
    for d in (base, head):
        if d.get('CONTROL', {}).get('outcome') != 'survived':
            problems.append('CONTROL: the unmutated tree did not pass')
    if {base.get('CONTROL', {}).get('total'), head.get('CONTROL', {}).get('total')} != {580, 582}:
        problems.append('CONTROL: the population is not 580 at BASE and 582 at HEAD')
    for i, (own_row, text) in TARGETS.items():
        b, h = base.get(i, {}), head.get(i, {})
        if (b.get('outcome'), h.get('outcome')) != ('survived', 'killed') or h.get('failedRows') != [own_row] or text not in (h.get('first') or ''):
            problems.append(f'{i}: {b.get("outcome")} at base, {h.get("outcome")} at head by {h.get("failedRows")}, not by its own row alone')
    for i in RESIDUAL:
        if (base.get(i, {}).get('outcome'), head.get(i, {}).get('outcome')) != ('survived', 'survived'):
            problems.append(f'{i}: the residual is not a survivor at both commits')
    compare = {'stronger': [], 'unchanged': [], 'weaker': []}
    for i in sorted(set(review) - {'@files', 'CONTROL'} - set(TARGETS) - set(RESIDUAL)):
        b, h = base.get(i), head.get(i)
        if b is None or h is None:
            continue
        if b['outcome'] != 'killed' or h['outcome'] != 'killed' or not set(b['failedRows']) <= set(h['failedRows']):
            compare['weaker'].append(i)
        else:
            compare['stronger' if set(h['failedRows']) > set(b['failedRows']) else 'unchanged'].append(i)
    if compare['weaker']:
        problems.append(f'weaker at head, or not killed at base: {compare["weaker"]}')

    own_doc = load('own-specs.json')
    own_specs = {m['id']: m for m in own_doc['mutants']} | {'@files': own_doc['files']}
    if sorted(m['id'] for m in own_doc['mutants']) != sorted(OWN) or own_doc['files'] != doc['files'] \
            or any(NBSP in e['new'] for m in own_doc['mutants'] for e in m['edits']):
        problems.append("own-specs.json: not the two own mutants over the reviewer's files, or a fragment holds a literal no-break space")
    own_base = check_runs('own-base.json', BASE, own_specs, problems)
    own_head = check_runs('own-head.json', HEAD, own_specs, problems)
    for i, (own_row, text) in OWN.items():
        b, h = own_base.get(i, {}), own_head.get(i, {})
        if (b.get('outcome'), h.get('outcome')) != ('survived', 'killed') or h.get('failedRows') != [own_row] or text not in (h.get('first') or ''):
            problems.append(f'own {i}: {b.get("outcome")} at base, {h.get("outcome")} at head by {h.get("failedRows")}, not by its own row alone')

    titles = load('titles.json')
    added = [f'{f} > {n}' for f, n in titles['added']]
    if (titles['base'], titles['head']) != (BASE, HEAD) or titles['removed'] or sorted(added) != sorted(ADDED) \
            or titles['duplicates']['base'] != titles['duplicates']['head'] or titles['titles']['head'] - titles['titles']['base'] != len(ADDED) \
            or sorted(titles['addedPerFile']) != sorted({path for path, _ in ADDED.values()}):
        problems.append(f'titles: not BASE and HEAD, a title removed or duplicated anew, or added {sorted(set(added) ^ set(ADDED))[:2]}')
    for title, (path, fragment) in ADDED.items():
        if (blob(HEAD, path) or '').count(fragment) != 1 or fragment in (blob(BASE, path) or ''):
            problems.append(f'titles: the row of {title.rsplit(" > ", 1)[-1]!r} is not new at HEAD')
    for path, fragment in hooked('rowlines', CHANGED_ROW_LINES).items():
        if (blob(BASE, path) or '').count(fragment) != 1 or (blob(HEAD, path) or '').count(fragment) != 1:
            problems.append(f'titles: a changed row does not keep its title line once at both commits in {path}')
    repeat = load('repeat-runs.json')
    if repeat['commit'] != HEAD or len(repeat['runs']) < 5 or any(r['exit'] or r['failed'] or r['passed'] != r['total'] or r['total'] != REPEAT_TOTAL
                                                               for r in repeat['runs']):
        problems.append(f'repeat-runs: not at HEAD, fewer than 5 ran, a run failed, or a total is not the {REPEAT_TOTAL} titles of the three files at HEAD')

    suite = load('suite.json')
    runs = {r['label']: r for r in suite['runs']}
    if suite['commit'] != HEAD or not suite['cleanAfter'] or sorted(runs) != ['full-1', 'full-2']:
        problems.append('suite: not a clean tree at HEAD, or not the two runs')
    for label, r in runs.items():
        skipped = [t for t in r['notPassed'] if t['status'] != 'failed']
        if r['total'] != r['passed'] + r['failed'] + r['skipped'] or len(skipped) != len(SKIPS) \
                or any(not any(s in t['name'] for t in skipped) for s in SKIPS) or any(t['status'] != 'skipped' for t in skipped):
            problems.append(f'suite {label}: totals do not close, or a test other than the two known skips did not run')
        if any(t['file'] != 'apps/three-surface-poc/src/polaris-authority-sweep.test.ts' or t['ms'] < 5000
               for t in r['notPassed'] if t['status'] == 'failed'):
            problems.append(f'suite {label}: a failure outside the authority sweep, or before the 5 s timeout')
    if not runs.get('full-2', {}).get('success') or runs.get('full-2', {}).get('failed') or runs.get('full-2', {}).get('total') != runs.get('full-1', {}).get('total'):
        problems.append('suite: the second full run failed, or ran another population')

    if hooked('parents', git('rev-parse', f'{HEAD}^1', f'{HEAD}^2').split()) != [CODE, BASE]:
        problems.append('HEAD is not the merge of CODE and BASE')
    if hooked('diff', git('diff', BASE, HEAD)) != git('diff', CODE_BASE, CODE):
        problems.append("HEAD's diff over BASE is not CODE's over CODE_BASE")
    changed = hooked('names', git('diff', '--name-only', BASE, HEAD).split())
    if sorted(changed) != sorted(SUBJECT):
        problems.append(f'the subject touches {changed}, not the three test files')
    for path, lines in REMOVED.items():
        if removed_lines(path) != lines:
            problems.append(f'{path}: the subject removes lines beyond the changed rows')
        if any((blob(HEAD, path) or '').count(form) != 1 or form in (blob(BASE, path) or '') for form in hooked('forms', ADDED_FORMS)[path]):
            problems.append(f'{path}: a form this bead adds is not new at HEAD, once')
    if hooked('nbsp', [path for path in SUBJECT if NBSP in (blob(HEAD, path) or '')]):
        problems.append('a subject file holds a literal no-break space, not its escape')
    versions = {'base': surface(BASE), 'head': surface(HEAD)}
    carriers = hooked('carriers', [line for v in versions.values() for line in grep_files(v.split('@')[1], HEAD)])
    if carriers:
        problems.append(f'a tracked file at HEAD carries a surface version: {carriers[:2]}')
    return {
        'bead': 'syzygy-bpyt.7.16', 'base': BASE, 'head': HEAD, 'code': {'base': CODE_BASE, 'commit': CODE},
        'subject': {'what': f'git diff {BASE[:8]} {HEAD[:8]}', 'sha256': sha(git('diff', BASE, HEAD)),
                    'files': {f: {'base': sha(blob(BASE, f)), 'head': sha(blob(HEAD, f))} for f in SUBJECT}},
        'productFilesChanged': [f for f in changed if not f.endswith('.test.ts')],
        'runnerSha256': sha(blob(HEAD, RUNNER) or ''), 'reviewSpecsSha256': sha(blob(HEAD, REVIEW_SPECS) or ''),
        'targets': {i: {'base': base.get(i, {}).get('outcome'), 'head': head.get(i, {}).get('outcome'),
                        'headFailedRows': head.get(i, {}).get('failedRows')} for i in [*TARGETS, *RESIDUAL]},
        'otherReviewMutants': compare,
        'own': {i: {'base': own_base.get(i, {}).get('outcome'), 'head': own_head.get(i, {}).get('outcome'),
                    'headFailedRows': own_head.get(i, {}).get('failedRows')} for i in OWN},
        'titles': {'base': titles['titles']['base'], 'head': titles['titles']['head'], 'added': len(added), 'removed': len(titles['removed']),
                   'bodiesChanged': CHANGED_ROWS, 'line': f'Tests: +{len(added)} ~{len(CHANGED_ROWS)} -{len(titles["removed"])}'},
        'repeats': {'runs': len(repeat['runs']), 'passed': [r['passed'] for r in repeat['runs']], 'load1': [r['load1'] for r in repeat['runs']]},
        'suite': {label: {k: r[k] for k in ('total', 'passed', 'failed', 'skipped', 'load1Before', 'load1After')} for label, r in runs.items()},
        'suiteTimeouts': sorted(t['name'] for r in runs.values() for t in r['notPassed'] if t['status'] == 'failed'),
        'surfaceVersion': versions, 'surfaceVersionCarriers': len(carriers),
        'tools': {**{name: sha(blob(HEAD, path) or '') for name, path in TOOLS.items()}, **{name: sha((HERE / name).read_text()) for name in OWN_TOOLS}},
        'problems': problems,
    }


def first(d, i):
    return next(r for r in d['results'] if r['id'] == i)


def kill(r, title='packages/x/src/x.test.ts > x > y'):
    r.update(outcome='killed', exit=1, failedTests=1, failed=[{'title': title, 'timedOut': False, 'message': 'x'}])


def survive(r):
    r.update(outcome='survived', exit=0, failedTests=0, failed=[])


def run(d, label):
    return next(r for r in d['runs'] if r['label'] == label)


SELFTEST = {
    'a target that survives at head': {'rev535-at-head.json': lambda d: (survive(first(d, 'V4-containment-case-insensitive')), d)[1]},
    'a target killed at base': {'rev535-at-base.json': lambda d: (kill(first(d, 'V6-origin-suffix-match')), d)[1]},
    'a target killed by another row too': {'rev535-at-head.json': lambda d: (first(d, 'V10-listed-reason-matched-case-insensitively')['failed'].append({'title': BEARER, 'timedOut': False, 'message': 'x'}), first(d, 'V10-listed-reason-matched-case-insensitively').update(failedTests=2), d)[2]},
    'V2 killed by a form the bead did not add': {'rev535-at-head.json': lambda d: (first(d, 'V2-bearer-leading-whitespace-admitted')['failed'][0].update(message='"Bearer  a": x'), d)[1]},
    'O1 killed by a form other than the no-break space': {'own-head.json': lambda d: (first(d, 'O1-bearer-no-break-space-admitted')['failed'][0].update(message='" Bearer a": x'), d)[1]},
    'a target never run at head': {'rev535-at-head.json': lambda d: (d.update(results=[r for r in d['results'] if r['id'] != 'V2-bearer-leading-whitespace-admitted']), d)[1]},
    'a residual killed at head': {'rev535-at-head.json': lambda d: (kill(first(d, 'V7-origin-compared-case-insensitively')), d)[1]},
    'a base kill lost at head': {'rev535-at-head.json': lambda d: (survive(first(d, 'V13-shim-local-copy-of-object-export')), d)[1]},
    'a base kill with a row lost at head': {'rev535-at-head.json': lambda d: (first(d, 'V5-lexical-check-before-normalising')['failed'].pop(0), first(d, 'V5-lexical-check-before-normalising').update(failedTests=2), d)[2]},
    'a CONTROL that fails': {'rev535-at-base.json': lambda d: (kill(first(d, 'CONTROL')), d)[1]},
    'a run at another commit': {'rev535-at-head.json': lambda d: (d.update(commit=BASE), d)[1]},
    'a kill by a timeout': {'rev535-at-head.json': lambda d: (first(d, 'V9-withheld-diagnostic-leaks-one-reason-character')['failed'][0].update(timedOut=True), d)[1]},
    'an outcome that disagrees with its exit': {'rev535-at-base.json': lambda d: (first(d, 'V3-bearer-token-first-non-space-run').update(exit=0), d)[1]},
    'a run whose edits are not its spec': {'rev535-at-base.json': lambda d: (first(d, 'V4-containment-case-insensitive')['edits'][0].update(new='x'), d)[1]},
    'a run over other test files': {'own-base.json': lambda d: (first(d, 'O2-origin-null-allowed').update(files=['apps/three-surface-poc/src/routes.test.ts']), d)[1]},
    'a tree left dirty': {'own-head.json': lambda d: (first(d, 'O2-origin-null-allowed').update(cleanAfter=False), d)[1]},
    'an own mutant that survives at head': {'own-head.json': lambda d: (survive(first(d, 'O2-origin-null-allowed')), d)[1]},
    'an own mutant killed at base': {'own-base.json': lambda d: (kill(first(d, 'O1-bearer-no-break-space-admitted')), d)[1]},
    'an own fragment with a literal no-break space': {'own-specs.json': lambda d: (d['mutants'][0]['edits'][0].update(new=d['mutants'][0]['edits'][0]['new'].replace('\\u00a0', NBSP)), d)[1],
                                                      'own-base.json': lambda d: (d['results'][0]['edits'][0].update(new=d['results'][0]['edits'][0]['new'].replace('\\u00a0', NBSP)), d)[1],
                                                      'own-head.json': lambda d: (d['results'][0]['edits'][0].update(new=d['results'][0]['edits'][0]['new'].replace('\\u00a0', NBSP)), d)[1]},
    'a title removed': {'titles.json': lambda d: (d['removed'].append([CRED, 'x']), d)[1]},
    'an added title this bead does not add': {'titles.json': lambda d: (d['added'][0].__setitem__(1, 'x > y'), d)[1]},
    'a title listing of another commit': {'titles.json': lambda d: (d.update(head=BASE), d)[1]},
    'a new duplicate title': {'titles.json': lambda d: (d['duplicates']['head'].append([CRED, 'x', 2]), d)[1]},
    'a repeat run that fails': {'repeat-runs.json': lambda d: (d['runs'][1].update(failed=True), d)[1]},
    "a repeat run of BASE's population": {'repeat-runs.json': lambda d: ([r.update(total=53, passed=53) for r in d['runs']], d)[1]},
    'a suite at another commit': {'suite.json': lambda d: (d.update(commit=BASE), d)[1]},
    'a second full run with a failure': {'suite.json': lambda d: (run(d, 'full-2').update(success=False, failed=1, passed=run(d, 'full-2')['passed'] - 1), d)[1]},
    'a full-run failure in another file': {'suite.json': lambda d: (run(d, 'full-1')['notPassed'].append({'file': CRED, 'name': 'x', 'status': 'failed', 'ms': 9000, 'error': ''}), d)[1]},
    'a full-run failure before the timeout': {'suite.json': lambda d: (next(t for t in run(d, 'full-1')['notPassed'] if t['status'] == 'failed').update(ms=40), d)[1]},
    'a full run that skips another test': {'suite.json': lambda d: (run(d, 'full-2')['notPassed'].append({'file': CRED, 'name': 'y', 'status': 'skipped', 'ms': None, 'error': ''}), d)[1]},
    'a diff that is not the code commit': {'@diff': lambda text: text + ' '},
    'a product file in the subject': {'@names': lambda names: [*names, 'packages/http-host/src/credentials.ts']},
    'another line removed from a test file': {f'@-{ORIGIN}': lambda lines: [*lines, "  it('allows no Origin and the exact origin of each allowed host', () => {\n"]},
    'the bearer row left unchanged': {f'@-{CRED}': lambda lines: lines[:1]},
    'a tracked file carrying a surface version': {'@carriers': lambda lines: [*lines, 'docs/x.md']},
    'HEAD not the merge of CODE and BASE': {'@parents': lambda parents: parents[::-1]},
    'a changed row whose title line moved': {'@rowlines': lambda rows: {**rows, CRED: rows[CRED].replace('refuses, named', 'refuses')}},
    'a form the bead says it adds that HEAD lacks': {'@forms': lambda forms: {**forms, CRED: [*forms[CRED], '`Bearer\\u2003${TOKEN}`']}},
    'a subject file with a literal no-break space': {'@nbsp': lambda paths: [*paths, CRED]},
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
