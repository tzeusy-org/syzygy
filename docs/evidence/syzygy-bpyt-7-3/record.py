"""syzygy-bpyt.7.3: derive summary.json from the records beside it, checking each against the git objects of the tree given.

The subject is the code commit HEAD over BASE (the HTTP host extraction). Checked here, by git object, never by reading a record:
  moved bytes   credentials.ts and credentials.test.ts keep their blob ids across the move; escape-html.ts is the escapeHtml
                block routes-human.ts held; http-host's server.ts is the base server.ts with exactly three edits; the root
                route cap1-daemon keeps is the base server.ts tail unchanged;
  tests kept    every base test file naming a credential, an origin, a ceiling, a bearer token or an authorization header
                is the same blob at HEAD (at its own path, or at the path a 100% rename took it to);
  governed      no file under .syzygy/ or openspec/ changes, and every cap1-daemon source path such a file cites resolves;
  differential  diff/differential.json (written by tools/differential.py): every comparison equal but the gate, whose
                differing paths all lie under packages/http-host/; its record and tool digests are the files here;
  mutants       own-specs.json run by the PR 524 reviewer's mut.py (own-head.json): each fragment occurs once at HEAD, each
                outcome agrees with its exit code and failed rows, every mutant killed; m10-head.json (written by
                scripts/run_m10_conditional_mutations.mjs) ran at HEAD and killed every mutant;
  titles        titles.json: head - base == new titles, every removed title reappears in the moved credential file, and the
                parametrized titles listed twice or more are the same keys at both commits, in files the subject leaves alone;
  system        system-head.log: every system test file passed, the fresh-clone test among them.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, re, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/syzygy-bpyt-7-3'
BASE = '9b539e5f64241ed4ccb119753e9f4786a15be2f7'
HEAD = '9d55188734e5d7d315591a55daf3a7bb5970c5aa'
MOVED = {'packages/cap1-daemon/src/credentials.ts': 'packages/http-host/src/credentials.ts',
         'packages/cap1-daemon/src/credentials.test.ts': 'packages/http-host/src/credentials.test.ts'}
ROOT_ROUTE = "\n// --- This wave's minimal root route ---"
SERVER_EDITS = [("import { evaluationId, type AdmissionResult } from '@syzygy/cap1-core';\n", "import type { AdmissionResult } from '@syzygy/cap1-core';\n"),
                ("import type { ProjectEvaluation } from './pipeline.js';\n", '')]
KEPT_TESTS = re.compile(r'credential|origin|ceiling|bearer|authorization', re.I)
CITE = re.compile(r'cap1-daemon/src/[\w.-]+')
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


def blob_id(commit, path):
    try:
        return git('rev-parse', f'{commit}:{path}').strip()
    except subprocess.CalledProcessError:
        return None


def tracked(commit):
    return [p for p in git('ls-tree', '-r', '--name-only', '-z', commit).split('\0') if p]


def load(name, text=False):
    raw = (HERE / name).read_text()
    obj = raw if text else json.loads(raw)
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def hook(name, value):
    """A git-object reading the selftest may replace (its name starts with @), so the predicates over objects are mutated too."""
    return MUTATE[name](copy.deepcopy(value)) if name in MUTATE else value


def reexports(text):
    """The names a shim re-exports from @syzygy/http-host, values and types apart."""
    names = {'values': [], 'types': []}
    for block in re.findall(r"export \{([^}]*)\} from '@syzygy/http-host';", text):
        for item in (i.strip() for i in block.split(',')):
            if item:
                names['types' if item.startswith('type ') else 'values'].append(item.removeprefix('type ').strip())
    return {k: sorted(v) for k, v in names.items()}


def check_moved(problems):
    moved = {}
    for old, new in hook('@moved', MOVED).items():
        b, h = blob_id(BASE, old), blob_id(HEAD, new)
        moved[new] = {'from': old, 'blob': h, 'sameBlob': b == h and b is not None}
        if not moved[new]['sameBlob']:
            problems.append(f'{new}: blob {h} is not the base {old} blob {b}')
    escape = hook('@escape', blob(HEAD, 'packages/http-host/src/escape-html.ts') or '')
    base_routes = blob(BASE, 'packages/cap1-daemon/src/routes-human.ts') or ''
    if not escape or base_routes.count(escape) != 1:
        problems.append('escape-html.ts: not a block that occurs once in the base routes-human.ts')
    if 'export function escapeHtml' in (blob(HEAD, 'packages/cap1-daemon/src/routes-human.ts') or ''):
        problems.append('routes-human.ts: still defines escapeHtml at HEAD')
    base_server = blob(BASE, 'packages/cap1-daemon/src/server.ts') or ''
    expected = base_server[:base_server.find(ROOT_ROUTE)] if ROOT_ROUTE in base_server else None
    for old, new in hook('@server-edits', SERVER_EDITS):
        if expected is None or expected.count(old) != 1:
            problems.append(f'server.ts: edit fragment {old.strip()!r} does not occur once in the base')
            expected = None
            break
        expected = expected.replace(old, new)
    host_server = blob(HEAD, 'packages/http-host/src/server.ts')
    if expected is None or host_server != expected:
        problems.append('packages/http-host/src/server.ts: not the base server.ts with the three recorded edits')
    shim = hook('@shim', blob(HEAD, 'packages/cap1-daemon/src/server.ts') or '')
    if ROOT_ROUTE not in base_server or not shim.endswith(base_server[base_server.find(ROOT_ROUTE):]):
        problems.append('packages/cap1-daemon/src/server.ts: the root route tail is not the base bytes')
    moved['packages/http-host/src/escape-html.ts'] = {'from': 'packages/cap1-daemon/src/routes-human.ts (the escapeHtml block)', 'sha256': sha(escape)}
    moved['packages/http-host/src/server.ts'] = {'from': 'packages/cap1-daemon/src/server.ts', 'edits': [[o, n] for o, n in SERVER_EDITS] + [['the root route and rootStatement, from ' + ROOT_ROUTE.strip() + ' on', '']], 'sha256': sha(host_server or '')}
    return moved


def check_kept_tests(problems):
    renames = {}
    for line in git('diff', '--name-status', '-M', BASE, HEAD).splitlines():
        parts = line.split('\t')
        if parts[0].startswith('R'):
            renames[parts[1]] = parts[2]
    renames = hook('@renames', renames)
    tests = [p for p in tracked(BASE) if re.search(r'\.test\.(?:ts|mts|mjs|js)$', p)]
    kept = sorted(p for p in tests if KEPT_TESTS.search(blob(BASE, p) or ''))
    changed = [p for p in kept if blob_id(BASE, p) != blob_id(HEAD, renames.get(p, p))]
    if changed:
        problems.append(f'credential, origin or ceiling tests changed: {changed}')
    return {'predicate': KEPT_TESTS.pattern + ' (case-insensitive) over base test files', 'baseTestFiles': len(tests), 'matching': len(kept),
            'unchanged': len(kept) - len(changed), 'movedUnchanged': {p: renames[p] for p in kept if p in renames}, 'changed': changed,
            'filesSha256': sha('\0'.join(kept))}


def check_governed(problems):
    changed = hook('@changed', git('diff', '--name-only', BASE, HEAD).split())
    governed = [p for p in changed if p.startswith(('.syzygy/', 'openspec/'))]
    if governed:
        problems.append(f'governed files changed: {governed}')
    files = [p for p in tracked(HEAD) if p.startswith(('.syzygy/', 'openspec/'))]
    citing, cited = {}, set()
    for p in files:
        found = sorted(set(CITE.findall(blob(HEAD, p) or '')))
        if found:
            citing[p] = found
            cited.update(found)
    cited = hook('@cited', cited)
    resolves = {c: blob_id(HEAD, 'packages/' + c) is not None for c in sorted(cited)}
    for c, ok in resolves.items():
        if not ok:
            problems.append(f'governed citation {c} no longer resolves')
    shims = {p: reexports(hook('@shim-text', blob(HEAD, p) or '')) for p in ('packages/cap1-daemon/src/server.ts', 'packages/cap1-daemon/src/credentials.ts')}
    for p, names in shims.items():
        if not names['values']:
            problems.append(f'{p}: re-exports nothing from @syzygy/http-host')
    return {'governedFilesChanged': governed, 'filesSwept': len(files), 'citing': citing, 'citedPathsResolve': resolves, 'reexports': shims}


def check_differential(problems):
    d = load('diff/differential.json')
    if (d['base'], d['head']) != (BASE, HEAD):
        problems.append('differential: not run over BASE and HEAD')
    for key in ('surfaceEqual', 'hostEqualThroughCap1Daemon', 'hostEqualThroughHttpHost', 'e2eEqual', 'asExpected', 'selftestPassed'):
        if d.get(key) is not True:
            problems.append(f'differential: {key} is not true')
    gate = d['gate']
    if not gate['differing'] or any(not p.startswith('packages/http-host/') or (b, h) != ('accepted', 'refused') for p, b, h in gate['differing']):
        problems.append('differential: a gate decision outside packages/http-host/ differs, or one differs another way')
    if sorted(set(gate['refusedAtHead']) - set(gate['refusedAtBase'])) != sorted(p for p, _, _ in gate['differing']) or set(gate['refusedAtBase']) - set(gate['refusedAtHead']):
        problems.append('differential: the refused sets do not differ by exactly the differing paths')
    if len(d['selftest']) != 4 or not all(o['detected'] for o in d['selftest']):
        problems.append('differential: a selftest mutant went undetected')
    for name, digest in d['records'].items():
        if sha((HERE / 'diff' / name).read_bytes()) != digest:
            problems.append(f'differential: diff/{name} is not the record it compared')
    for name, digest in d['toolsSha256'].items():
        if sha((HERE / 'tools' / name).read_bytes()) != digest:
            problems.append(f'differential: tools/{name} is not the tool it ran')
    host = json.loads((HERE / 'diff/host-base.json').read_text())
    e2e = json.loads((HERE / 'diff/e2e-base.json').read_text())
    return {'surfaceEqual': d['surfaceEqual'], 'hostEqualThroughCap1Daemon': d['hostEqualThroughCap1Daemon'], 'hostEqualThroughHttpHost': d['hostEqualThroughHttpHost'],
            'e2eEqual': d['e2eEqual'], 'hostRequests': len(host['requests']), 'e2eRuns': len(e2e['runs']), 'e2eRequests': sum(len(r['requests']) for r in e2e['runs']),
            'e2eInvocations': len(e2e['invocations']),
            'gate': {'paths': gate['paths'], 'refusedAtBase': len(gate['refusedAtBase']), 'refusedAtHead': len(gate['refusedAtHead']), 'differing': gate['differing']},
            'selftest': [[o['mutant'], o['check'], o['detected']] for o in d['selftest']], 'records': d['records'], 'tools': d['toolsSha256']}


def check_mutants(problems):
    specs = {m['id']: m for m in load('own-specs.json')['mutants']}
    run = load('own-head.json')
    if run['head'] != HEAD:
        problems.append(f'own-head.json: ran at {run["head"]}, not HEAD')
    rows = {}
    for r in run['results']:
        spec = specs.get(r['id'])
        if spec is None:
            problems.append(f'own-head.json {r["id"]}: no such spec')
            continue
        if r.get('edits') != spec['edits']:
            problems.append(f'own-head.json {r["id"]}: edits differ from the spec')
        for e in spec['edits']:
            if (blob(HEAD, e['file']) or '').count(e['old']) != 1:
                problems.append(f'own {r["id"]}: old fragment does not occur once in {e["file"]} at HEAD')
        expected = 'survives' if r.get('exit') == 0 else ('killed' if r.get('failed') else 'error')
        if r.get('outcome') != expected or r['outcome'] != 'killed' or not r.get('cleanAfter'):
            problems.append(f'own {r["id"]}: outcome {r.get("outcome")}, exit {r.get("exit")}, {len(r.get("failed", []))} failed rows, clean {r.get("cleanAfter")}')
        rows[r['id']] = {'what': spec['what'], 'file': spec['edits'][0]['file'], 'outcome': r['outcome'], 'failedRows': len(r.get('failed', []))}
    if set(specs) - set(rows):
        problems.append(f'own specs never ran: {sorted(set(specs) - set(rows))}')
    m10 = load('m10-head.json')
    if m10['testedCommit'] != HEAD:
        problems.append(f'm10-head.json: tested {m10["testedCommit"]}, not HEAD')
    m10rows = {}
    for r in m10['results']:
        if (blob(HEAD, r['file']) or '').count(r['old']) != 1:
            problems.append(f'm10 {r["id"]}: old fragment does not occur once in {r["file"]} at HEAD')
        if r['exitCode'] == 0 or not r['testsExecuted'] or not r['failingTests']:
            problems.append(f'm10 {r["id"]}: not killed')
        m10rows[r['id']] = {'file': r['file'], 'failingTests': len(r['failingTests'])}
    if m10rows.get('auth-order-bypass', {}).get('file') != 'packages/http-host/src/server.ts':
        problems.append('m10: auth-order-bypass does not mutate the moved server.ts')
    return {'runnerSha256': sha(blob(HEAD, 'docs/evidence/argv-guards-review-2026-10-25/tools/mut.py') or ''), 'own': rows,
            'ownKilled': sum(1 for r in rows.values() if r['outcome'] == 'killed'), 'ownTotal': len(specs), 'm10': m10rows, 'm10Baseline': m10['baseline']}


def check_titles(problems):
    t = load('titles.json')
    if (t['base'], t['head']) != (BASE, HEAD):
        problems.append('titles: not listed at BASE and HEAD')
    if t['titles']['head'] - t['titles']['base'] != len(t['new']) or t['added'] - t['removed'] != len(t['new']) or t['moved'] != t['removed']:
        problems.append('titles: the arithmetic does not close')
    old_test = 'packages/cap1-daemon/src/credentials.test.ts'
    if any(m[0] != f'{old_test} -> {MOVED[old_test]}' for m in t['movedTitles']):
        problems.append('titles: a moved title came from or went to another file')
    changed = set(git('diff', '--name-only', BASE, HEAD).split())
    if t['duplicates']['base'] != t['duplicates']['head'] or any(f in changed for f, _, _ in t['duplicates']['head']) \
            or [t['duplicateKeys'][s] for s in ('base', 'head')] != [sum(n - 1 for _, _, n in t['duplicates'][s]) for s in ('base', 'head')]:
        problems.append('titles: duplicated keys differ between the commits, or lie in a changed file')
    per_file = {}
    for f, _ in t['new']:
        per_file[f] = per_file.get(f, 0) + 1
    return {'base': t['titles']['base'], 'head': t['titles']['head'], 'new': len(t['new']), 'newPerFile': per_file, 'removed': t['removed'] - t['moved'], 'moved': t['moved'],
            'duplicatedKeys': t['duplicateKeys'], 'line': f'Tests: +{len(t["new"])} ~0 -{t["removed"] - t["moved"]}'}


def check_system(problems):
    log = load('system-head.log', text=True)
    files = re.search(r'Test Files\s+(\d+) passed \((\d+)\)', log)
    tests = re.search(r'Tests\s+(\d+) passed \((\d+)\)', log)
    fresh = re.search(r'✓ src/fresh-clone\.system\.test\.ts \(1 test\)', log)
    if not files or files[1] != files[2] or not tests or tests[1] != tests[2] or not fresh or re.search(r'\bfailed\b|✗|×', log):
        problems.append('system-head.log: not every system test passed, or the fresh-clone test did not run')
    return {'files': files[0] if files else None, 'tests': tests[0] if tests else None, 'freshClone': bool(fresh),
            'clone': (re.search(r'RUN\s+\S+\s+(\S+)', log) or [None, None])[1], 'logSha256': sha((HERE / 'system-head.log').read_bytes())}


def main_summary():
    problems = []
    changed = git('diff', '--name-status', '-M', BASE, HEAD).splitlines()
    out = {
        'bead': 'syzygy-bpyt.7.3', 'base': BASE, 'head': HEAD,
        'subject': {'what': f'git diff {BASE[:8]} {HEAD[:8]}', 'sha256': sha(git('diff', BASE, HEAD)), 'files': len(changed), 'nameStatus': changed},
        'moved': check_moved(problems), 'keptTests': check_kept_tests(problems), 'governed': check_governed(problems),
        'differential': check_differential(problems), 'mutants': check_mutants(problems), 'titles': check_titles(problems),
        'system': check_system(problems),
    }
    out['problems'] = problems
    return out


def own(d, i):
    return next(r for r in d['results'] if r['id'] == i)


SELFTEST = {
    'a differential comparison that differs': {'diff/differential.json': lambda d: (d.update(hostEqualThroughHttpHost=False), d)[1]},
    'a gate path outside the host that differs': {'diff/differential.json': lambda d: (d['gate']['differing'].append(['packages/cap1-daemon/src/x.ts', 'accepted', 'refused']), d)[1]},
    'a gate path the head accepts that the base refused': {'diff/differential.json': lambda d: (d['gate']['differing'][0].__setitem__(2, 'accepted'), d)[1]},
    'a differential record retyped': {'diff/differential.json': lambda d: (d['records'].update({'e2e-head.json': '0' * 64}), d)[1]},
    'a differential selftest mutant undetected': {'diff/differential.json': lambda d: (d['selftest'][1].update(detected=False), d)[1]},
    'a differential over another commit': {'diff/differential.json': lambda d: (d.update(head=BASE), d)[1]},
    'an own mutant that survives': {'own-head.json': lambda d: (own(d, 'C1-any-presented-token-admitted').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'an outcome that disagrees with its exit': {'own-head.json': lambda d: (own(d, 'S3-close-failure-unreported').update(exit=0), d)[1]},
    'a run whose edits are not its spec': {'own-head.json': lambda d: (own(d, 'G1-observer-gate-leaves-out-the-host')['edits'][0].update(new='x'), d)[1]},
    'a spec whose fragment HEAD lacks': {'own-specs.json': lambda d: (d['mutants'][0]['edits'][0].update(old='no such text'), d)[1],
                                         'own-head.json': lambda d: (d['results'][0]['edits'][0].update(old='no such text'), d)[1]},
    'credentials.ts moved with other bytes': {'@moved': lambda m: {**m, 'packages/cap1-daemon/src/credentials.ts': 'packages/http-host/src/server.ts'}},
    'escape-html.ts not the routes-human block': {'@escape': lambda t: t.replace("'&#39;'", "'&apos;'")},
    'server.ts with an edit unrecorded': {'@server-edits': lambda e: e[:1]},
    'a root route tail that changed': {'@shim': lambda t: t.replace("lines.push('');\n  lines.push('machine", "lines.push('machine")},
    'a kept test moved to other bytes': {'@renames': lambda r: {**r, 'packages/cap1-daemon/src/credentials.test.ts': 'packages/http-host/src/shutdown.test.ts'}},
    'a kept test changed in place': {'@renames': lambda r: {**r, 'apps/three-surface-poc/src/response-limits.test.ts': 'apps/three-surface-poc/src/routes.test.ts'}},
    'a governed file changed': {'@changed': lambda c: c + ['openspec/changes/x/proposal.md']},
    'a governed citation that no longer resolves': {'@cited': lambda c: c | {'cap1-daemon/src/write-guard.ts'}},
    'a shim that re-exports nothing from the host': {'@shim-text': lambda t: t.replace("from '@syzygy/http-host';", "from './elsewhere.js';")},
    'an own run at another commit': {'own-head.json': lambda d: (d.update(head=BASE), d)[1]},
    'an m10 run at another commit': {'m10-head.json': lambda d: (d.update(testedCommit=BASE), d)[1]},
    'an m10 mutant that survives': {'m10-head.json': lambda d: (d['results'][6].update(exitCode=0, failingTests=[]), d)[1]},
    'a title removed': {'titles.json': lambda d: (d.update(removed=d['removed'] + 1, added=d['added'] + 1), d)[1]},
    'a duplicated title only at head': {'titles.json': lambda d: (d['duplicates']['head'].append(['packages/http-host/src/shutdown.test.ts', 'x', 2]), d)[1]},
    'a moved title from another file': {'titles.json': lambda d: (d['movedTitles'][0].__setitem__(0, 'a.test.ts -> b.test.ts'), d)[1]},
    'a system test that fails': {'system-head.log': lambda t: t.replace('Tests  48 passed (48)', 'Tests  1 failed | 47 passed (48)')},
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
