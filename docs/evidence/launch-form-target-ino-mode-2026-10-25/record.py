"""syzygy-bpyt.8.35: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

Inputs (all in this directory): mutants-{a,b,c}-{tmpfs,ext4}.json, written by the PR 523 reviewer's rev523_mutants.py (retained,
unchanged, under docs/evidence/launch-form-target-ctime-review-2026-10-25/tools/); faithful-probe*.json, written by faithful_probe.mjs
here; root-skip-{user,root}.json, vitest's JSON reporter over the whole of launched.test.ts, unfiltered, as the user and with the
worker-only getuid shim as-root-worker.mjs beside this script; list-{base,fix}.txt, `vitest list` of the test file at the base and at the fix.
The 8.33 record it compares with is read from the git object at the fix commit, never from the working tree.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import hashlib, json, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE = TREE / 'docs/evidence/launch-form-target-ino-mode-2026-10-25'
FIX = '2a21f2b0e95e3731a3f975a0cbad8aaccd3a9b3b'
BASE = '71334012548cccd46a5a95e313a6014da87c8e3c'
PRE_BASE = 'df6046a153fe130202abdf6bd3045a79ba143879'
READER = 'packages/polaris-dossier/src/launched.ts'
TEST = 'packages/polaris-dossier/src/launched.test.ts'
PRIOR = 'docs/evidence/launch-form-target-ctime-2026-10-25/mutants-{}.json'
TOOL = 'docs/evidence/launch-form-target-ctime-review-2026-10-25/tools/rev523_mutants.py'
X3 = ('X3c-target-replaced-by-identical-copy-no-realpath', 'X3d-target-replaced-by-copy-mode-0644-no-realpath')
X5 = 'X5-target-unlinked-then-rewritten'
NAMED = ('O1-same-bytes-rewrite', 'O8-link-target-chmod-cycle-rewrite', 'R-chmod-cycle-rewrite', 'D1-with-memoized-reader', 'D1-terminal-only',
         'D1-bang-only', 'D1-syzygy-launched-only', 'D1-any-remover', 'D3-repair-to-launched', 'D4-truncate', 'T-ask-of-an-unplanted-run')
SKIPPED = ['launchedMarkerState is unreadable for a file its reader may not read',
           'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: a file its reader may not read']


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], check=True, capture_output=True, text=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


MUTATE = {}


def text(name):
    raw = (HERE / name).read_text()
    return MUTATE[name](raw) if name in MUTATE and name.endswith(('.txt', '.mjs')) else raw


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](obj) if name in MUTATE else obj


def runs_summary():
    out, edits, problems = {}, {}, []
    reader_at = {}
    for fs in ('tmpfs', 'ext4'):
        for part in ('a', 'b', 'c'):
            d = load(f'mutants-{part}-{fs}.json')
            head = {k: d[k] for k in ('tool', 'toolSha256', 'reviewedCommit', 'base', 'kernel', 'node', 'tmpRoot', 'statF', 'dfT', 'trackedTreeCleanAfter')}
            if head['reviewedCommit'] != FIX or head['base'] not in (BASE, PRE_BASE):
                problems.append(f'{part}-{fs}: commit {head["reviewedCommit"]} base {head["base"]}')
            if head['toolSha256'] != sha(git('show', f'{FIX}:{TOOL}')):
                problems.append(f'{part}-{fs}: tool digest {head["toolSha256"]} is not the retained tool at the fix')
            if not head['trackedTreeCleanAfter']:
                problems.append(f'{part}-{fs}: tracked tree not clean after')
            side_test = {'fix': sha(git('show', f'{FIX}:{TEST}')), 'base': sha(git('show', f'{head["base"]}:{TEST}'))}
            rows = {}
            for r in d['runs']:
                if r['testSha256'] != side_test[r['side']]:
                    problems.append(f'{part}-{fs} {r["id"]} {r["side"]} {r["rep"]}: test digest is not the {r["side"]} test file')
                if not r['restored']:
                    problems.append(f'{part}-{fs} {r["id"]} {r["side"]} {r["rep"]}: bytes not restored')
                killed = r['exitCode'] != 0 and r['counts'].get('numFailedTests', 0) > 0
                if (r['outcome'] == 'killed') != killed and r['outcome'] != 'timeout':
                    problems.append(f'{part}-{fs} {r["id"]} {r["side"]} {r["rep"]}: outcome {r["outcome"]} disagrees with exit {r["exitCode"]}')
                for e in r['edits']:
                    text = reader_at.setdefault(FIX, git('show', f'{FIX}:{e["file"]}')) if e['file'] == READER else git('show', f'{FIX}:{e["file"]}')
                    if text.count(e['old']) != 1:
                        problems.append(f'{r["id"]}: old fragment occurs {text.count(e["old"])} times in {e["file"]} at the fix')
                prior = edits.setdefault(r['id'], r['edits'])
                if prior != r['edits']:
                    problems.append(f'{r["id"]}: edits differ between runs')
                key = f'{r["id"]} | {r["side"]} at {head["base"][:8] if r["side"] == "base" else FIX[:8]}'
                row = rows.setdefault(key, {'runs': 0, 'killed': 0, 'survived': 0, 'timeout': 0, 'failedTestsMin': None, 'failedTestsMax': None,
                                            'linkRowFailed': 0, 'failedRows': [], 'failedTests': []})
                row['runs'] += 1
                row[r['outcome']] += 1
                n = r['counts'].get('numFailedTests', 0)
                row['failedTestsMin'] = n if row['failedTestsMin'] is None else min(row['failedTestsMin'], n)
                row['failedTestsMax'] = n if row['failedTestsMax'] is None else max(row['failedTestsMax'], n)
                row['linkRowFailed'] += 1 if r['linkRowFailed'] else 0
                row['failedRows'] = sorted(set(row['failedRows']) | set(r['failedRows']))
                row['failedTests'] = sorted(set(row['failedTests']) | {f['test'] for f in r['failedTests']})
                if r['id'] == 'unmutated' and r['counts'] != {'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0}:
                    problems.append(f'unmutated {r["side"]} {r["rep"]} {fs}: {r["counts"]}')
            out.setdefault(fs, {})[part] = {'header': head, 'rows': rows}
    return out, edits, problems


def prior_fix_rows(fs):
    d = json.loads(git('show', f'{FIX}:{PRIOR.format(fs)}'))
    return d['commit'], {m['id']: m for m in d['mutants'] if m['tests'] == 'fix'}


def compare(runs):
    out, problems = {}, []
    for fs in ('tmpfs', 'ext4'):
        commit, prior = prior_fix_rows(fs)
        rows = runs[fs]['b']['rows']
        cmp_fs = {}
        for mid, m in prior.items():
            now = rows.get(f'{mid} | fix at {FIX[:8]}')
            if now is None:
                problems.append(f'{fs} {mid}: no fix run')
                continue
            before_rows = {t['test'] for t in m.get('failedTests', [])}
            now_set = set(now['failedTests'])
            now_rows_min = now['failedTestsMin']
            before_n = m['counts'].get('numFailedTests', 0)
            if m['outcome'] == 'survived':
                verdict = 'unchanged (survives)' if now['killed'] == 0 else 'stronger (killed)'
            elif now['killed'] != now['runs']:
                verdict = 'weaker'
            elif not before_rows <= now_set:
                verdict = 'weaker'
            elif now_rows_min > before_n or now_set > before_rows:
                verdict = 'stronger'
            elif now_rows_min == before_n and now['failedTestsMax'] == before_n and now_set == before_rows:
                verdict = 'unchanged'
            else:
                verdict = 'weaker'
            if verdict == 'weaker':
                problems.append(f'{fs} {mid}: weaker than the 8.33 record')
            cmp_fs[mid] = {'prior': f'{m["outcome"]}, {before_n} failed', 'now': f'{now["killed"]}/{now["runs"]} killed, {now["failedTestsMin"]}-{now["failedTestsMax"]} failed',
                           'failedTestsSameAsPrior': now_set == before_rows, 'verdict': verdict}
        out[fs] = {'priorRecord': PRIOR.format(fs), 'priorCommit': commit, 'rows': cmp_fs}
    return out, problems


def probes():
    out, problems = {}, []
    for f in sorted(HERE.glob('faithful-probe*.json')):
        d = load(f.name)
        differ = {}
        for p in d['plants'].values():
            for k, v in p['roundsDifferingByField'].items():
                differ[k] = differ.get(k, 0) + v
        nonnull = {name: p['rounds'] - p['targetInoNull'] for name, p in d['plants'].items() if p['targetInoNull'] != p['rounds']}
        if any(p['targetInoNull'] != p['targetModeNull'] or p['targetInoNull'] != p['targetCtimeNsNull'] for p in d['plants'].values()):
            problems.append(f'{f.name}: the three target fields are not null together')
        out[f.name] = {'root': d['root'], 'plants': len(d['plants']), 'rounds': sum(p['rounds'] for p in d['plants'].values()),
                       'roundsDifferingByField': differ, 'roundsWithTargetFields': nonnull,
                       'notUnreadable': sum(p['notUnreadable'] for p in d['plants'].values())}
        if f.name in ('faithful-probe-tmpfs.json', 'faithful-probe-ext4.json') and differ:
            problems.append(f'{f.name}: a faithful ask changed {differ}')
        if 'selftest' in f.name and not differ:
            problems.append(f'{f.name}: the selftest changed nothing')
    # the probe's snapshot helper is the test's, line for line, with the test's two type annotations removed
    test = git('show', f'{FIX}:{TEST}').splitlines()
    start = test.index("const markerSnapshot = (dir: string): Readonly<Record<string, unknown>> | null => {")
    helper = test[start:test.index('};', start) + 1]
    helper = [line.replace('(dir: string): Readonly<Record<string, unknown>> | null =>', '(dir) =>').replace('let bytes: string | null = null;', 'let bytes = null;')
              for line in helper]
    probe = text('faithful_probe.mjs').splitlines()
    pstart = probe.index('const markerSnapshot = (dir) => {')
    copied = probe[pstart:pstart + len(helper)] == helper
    if not copied:
        problems.append('faithful_probe.mjs: snapshot helper differs from the test file at the fix')
    out['helperCopiedFromTestAtFix'] = {'lines': len(helper), 'equal': copied}
    build = load('probe-build.json')
    if build['probeSha256'] != sha((HERE / 'faithful_probe.mjs').read_bytes()) or build['fixCommit'] != FIX:
        problems.append('probe-build.json: probe digest or commit is not the probe here')
    out['build'] = build
    return out, problems


def root_skip():
    out, problems, status = {}, [], {}
    for who in ('user', 'root'):
        d = load(f'root-skip-{who}.json')
        status[who] = {a['fullName']: a['status'] for t in d['testResults'] for a in t['assertionResults']}
        not_passed = sorted(f'{s}: {name}' for name, s in status[who].items() if s != 'passed')
        out[who] = {k: d[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests')} | {'notPassed': not_passed}
    if out['user']['numPassedTests'] != 43 or out['user']['notPassed']:
        problems.append('root-skip-user: not 43 passed')
    if out['root']['notPassed'] != sorted(f'skipped: {t}' for t in SKIPPED) or out['root']['numPassedTests'] != 41:
        problems.append('root-skip-root: not exactly the two mode-000 rows skipped')
    # per title, over the whole unfiltered file: the same 43 titles, and only the two mode-000 rows change status (passed to skipped)
    changed = sorted(f'{name}: {status["user"][name]} -> {status["root"].get(name)}' for name in status['user'] if status['user'][name] != status['root'].get(name))
    out['perTitle'] = {'titles': len(status['user']), 'sameTitles': set(status['user']) == set(status['root']), 'changed': changed}
    if len(status['user']) != 43 or set(status['user']) != set(status['root']) or changed != sorted(f'{t}: passed -> skipped' for t in SKIPPED):
        problems.append('root-skip: per-title statuses differ other than on the two mode-000 rows')
    shim = text('as-root-worker.mjs')
    if "if (!(process.argv[1] ?? '').endsWith('apps/syzygy/dist/main.js')) process.getuid = () => 0;" not in shim.splitlines():
        problems.append('as-root-worker.mjs: not the worker-only shim')
    out['shimSha256'] = sha(shim)
    return out, problems


def lists():
    base = text('list-base.txt').replace('launched-base835.test.ts', 'launched.test.ts').splitlines()
    fix = text('list-fix.txt').splitlines()
    ok = base == fix and len(fix) == 43
    return {'base': len(base), 'fix': len(fix), 'identicalInOrder': base == fix, 'sha256': sha('\n'.join(fix) + '\n')}, ([] if ok else ['lists differ'])


def acceptance(runs):
    def rows(fs, part, mid, side):
        for k, v in runs[fs][part]['rows'].items():
            if k.startswith(f'{mid} | {side} '):
                return v
        return None
    out, problems = {}, []
    for mid in (*X3, X5):
        for fs in ('tmpfs', 'ext4'):
            fixes = [rows(fs, p, mid, 'fix') for p in ('a', 'c')]
            killed, total = sum(r['killed'] for r in fixes), sum(r['runs'] for r in fixes)
            out[f'{mid} fix {fs}'] = f'{killed}/{total} killed'
            if killed != total:
                problems.append(f'{mid} not killed in every fix run on {fs}')
            out[f'{mid} base 71334012 {fs}'] = f'{rows(fs, "a", mid, "base")["survived"]}/{rows(fs, "a", mid, "base")["runs"]} survived'
            out[f'{mid} base df6046a1 {fs}'] = f'{rows(fs, "c", mid, "base")["survived"]}/{rows(fs, "c", mid, "base")["runs"]} survived'
    for fs in ('tmpfs', 'ext4'):
        r = rows(fs, 'a', 'unmutated', 'fix')
        out[f'unmutated fix {fs}'] = f'{r["survived"]}/{r["runs"]} at 43/43'
        if r['runs'] < 10 or r['survived'] != r['runs']:
            problems.append(f'unmutated fix {fs}: {r["survived"]}/{r["runs"]}')
    return out, problems


def build():
    runs, edits, p1 = runs_summary()
    cmp_, p2 = compare(runs)
    prb, p3 = probes()
    skip, p4 = root_skip()
    lst, p5 = lists()
    acc, p6 = acceptance(runs)
    summary = {
        'bead': 'syzygy-bpyt.8.35', 'fixCommit': FIX, 'base': BASE, 'preCtimeBase': PRE_BASE,
        'testSha256': {'fix': sha(git('show', f'{FIX}:{TEST}')), 'base': sha(git('show', f'{BASE}:{TEST}'))},
        'readerSha256AtFix': sha(git('show', f'{FIX}:{READER}')),
        'fileSystems': {fs: {part: {k: runs[fs][part]['header'][k] for k in ('tmpRoot', 'statF', 'dfT', 'kernel', 'node', 'base')}
                             for part in ('a', 'b', 'c')} for fs in ('tmpfs', 'ext4')},
        'acceptance': acc,
        'comparisonWith833Record': cmp_,
        'namedInAc1': {fs: {mid: cmp_[fs]['rows'][mid]['verdict'] for mid in NAMED} for fs in ('tmpfs', 'ext4')},
        'runs': {fs: {part: runs[fs][part]['rows'] for part in ('a', 'b', 'c')} for fs in ('tmpfs', 'ext4')},
        'faithfulProbe': prb,
        'rootSkip': skip,
        'titles': lst,
        'mutantFragments': edits,
        'problems': p1 + p2 + p3 + p4 + p5 + p6,
    }
    return summary


def first(runs_, mid, side):
    return next(r for r in runs_['runs'] if r['id'] == mid and r['side'] == side)


def kill_to_survive(d):
    r = first(d, X3[0], 'fix')
    r.update(outcome='survived', exitCode=0, counts={'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0}, failedTests=[], failedRows=[], linkRowFailed=False)
    return d


def weaker_d4(d):
    r = first(d, 'D4-truncate', 'fix')
    r['failedTests'] = r['failedTests'][1:]
    r['counts'] = r['counts'] | {'numFailedTests': r['counts']['numFailedTests'] - 1, 'numPassedTests': r['counts']['numPassedTests'] + 1}
    return d


def probe_moved(d):
    next(iter(d['plants'].values()))['roundsDifferingByField'] = {'targetIno': 1}
    return d


def third_skip(d):
    d['testResults'][0]['assertionResults'][0]['status'] = 'skipped'
    d['numPassedTests'] -= 1
    return d


SELFTEST = {
    'an X3c fix run that survives': {'mutants-c-ext4.json': kill_to_survive},
    'an X3c fix run outcome that disagrees with its exit code': {'mutants-a-tmpfs.json': lambda d: (first(d, X3[0], 'fix').update(outcome='survived'), d)[1]},
    'a D4 fix run that fails one test fewer': {'mutants-b-tmpfs.json': weaker_d4},
    'a test digest that is not the side\'s': {'mutants-b-ext4.json': lambda d: (first(d, 'O1-same-bytes-rewrite', 'fix').update(testSha256='0' * 64), d)[1]},
    'an unmutated fix run that fails': {'mutants-a-ext4.json': lambda d: (first(d, 'unmutated', 'fix')['counts'].update(numPassedTests=42, numFailedTests=1), d)[1]},
    'a faithful ask that moves targetIno': {'faithful-probe-ext4.json': probe_moved},
    'a selftest arm that changes nothing': {'faithful-probe-selftest-rename-tmpfs.json': lambda d: ([p.update(roundsDifferingByField={}) for p in d['plants'].values()], d)[1]},
    'a probe helper that drops targetMode': {'faithful_probe.mjs': lambda s: s.replace("    targetMode: followed?.isFile() ? followed.mode : null,\n", '', 1)},
    'a third row skipped under root': {'root-skip-root.json': third_skip},
    'a row that fails as the user and skips under root': {'root-skip-user.json': lambda d: (d['testResults'][0]['assertionResults'][-1].update(status='failed'), d)[1]},
    'a shim that reaches every node process': {'as-root-worker.mjs': lambda s: s.replace("if (!(process.argv[1] ?? '').endsWith('apps/syzygy/dist/main.js')) ", '', 1)},
    'a title list out of order': {'list-fix.txt': lambda s: '\n'.join([s.splitlines()[1], s.splitlines()[0], *s.splitlines()[2:]]) + '\n'},
}


def main():
    if '--selftest' in sys.argv[2:]:
        if build()['problems']:
            print('selftest: the unmutated inputs already fail')
            sys.exit(1)
        survived = []
        for name, mutation in SELFTEST.items():
            MUTATE.clear()
            MUTATE.update(mutation)
            problems = build()['problems']
            print('killed' if problems else 'SURVIVED', '|', name, '|', problems[:1])
            if not problems:
                survived.append(name)
        MUTATE.clear()
        print(f'selftest: {len(SELFTEST) - len(survived)}/{len(SELFTEST)} mutations make a check fail')
        sys.exit(1 if survived else 0)
    summary = build()
    text_ = json.dumps(summary, indent=1, ensure_ascii=False) + '\n'
    if '--check' in sys.argv[2:]:
        same = (HERE / 'summary.json').read_text() == text_
        print('summary.json', 'matches' if same else 'DIFFERS', '; problems:', len(summary['problems']))
        sys.exit(0 if same and not summary['problems'] else 1)
    (HERE / 'summary.json').write_text(text_)
    print('problems:', len(summary['problems']))
    for p in summary['problems']:
        print(' ', p)
    sys.exit(1 if summary['problems'] else 0)


main()
