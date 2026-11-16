#!/usr/bin/env python3
"""rev-525b: check the PR 525 rule-6 record (schema 2) against git objects, round 1's raw and the PR body's figures.

usage: python3 -I check_record.py CLONE RAW1 [--selftest]

Reads every byte with `git show` at the named commits, never from the working tree. With --selftest, applies single-field
mutations to the record and requires each to make at least one check fail (rule 6 on this checker)."""
import copy, hashlib, json, subprocess, sys

CLONE, RAW1 = sys.argv[1], sys.argv[2]
SELFTEST = '--selftest' in sys.argv
REVIEWED = '7459cc7585205e270f90173737c6d59786af650a'
MAIN_NOW = 'a088f1caf061c1a2062527ce8521c9b64c3c7fd1'
RECORD = 'docs/evidence/syzygy-bpyt-4-22/runsync-and-root-probe.json'
TOOL = 'docs/evidence/syzygy-bpyt-4-22/tools/runsync_and_root_probe.py'
ENTRY_TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
RAW1_SHA = '77a873ebca6497b7d17c04f5f39c15c71d4c12cbbac3b55b0475bedb01028535'
TIMEOUT_MS = 20_000
RUNSYNC_SUFFIXES = ['prints the usage and exits 0', 'is refused with exit 1 and the same message',
                    'a state directory inside the governed plane is refused with the same message',
                    "`dossier` alone is a dossier usage error (exit 2), not the daemon's refusal",
                    '`dossier status <missing>` is a dossier refusal (exit 1) and starts no daemon',
                    '`dossier render <missing>` reaches the run with the renderer injected, and starts no daemon']


def git(*args, binary=False):
    out = subprocess.run(['git', '-C', CLONE, *args], capture_output=True, check=False)
    return out if binary else out.stdout.decode().strip()
def show(commit, path):
    done = subprocess.run(['git', '-C', CLONE, 'show', f'{commit}:{path}'], capture_output=True)
    return done.stdout if done.returncode == 0 else None
sha = lambda data: hashlib.sha256(data).hexdigest() if data is not None else None
ancestor = lambda a, b: subprocess.run(['git', '-C', CLONE, 'merge-base', '--is-ancestor', a, b]).returncode == 0
raw_bytes = open(RAW1, 'rb').read()
raw_lines = raw_bytes.decode().split('\n')


def checks(rec):
    out = []
    ok = lambda name, cond, detail='': out.append((name, bool(cond), detail))
    commit, base, prior = rec['commit'], rec['baseCommit'], rec['priorCommit']
    # identity
    ok('record commit resolves', git('rev-parse', '--verify', '-q', commit + '^{commit}') == commit, commit)
    ok('record commit is an ancestor of the reviewed commit', ancestor(commit, REVIEWED))
    ok('only the record changed between record commit and reviewed commit',
       git('diff', '--name-only', commit, REVIEWED).split('\n') == [RECORD], git('diff', '--name-only', commit, REVIEWED))
    ok('base is merge base with main now', git('merge-base', REVIEWED, MAIN_NOW) == base, base)
    ok('prior commit is f7bbb93a and ancestor of record commit', prior.startswith('f7bbb93a') and ancestor(prior, commit))
    for at in (commit, REVIEWED):
        ok(f'tool sha256 at {at[:8]}', sha(show(at, TOOL)) == rec['tool']['sha256'], sha(show(at, TOOL)))
    for path, d in rec['files'].items():
        ok(f'{path} head sha at record commit', sha(show(commit, path)) == d['head'])
        ok(f'{path} head sha at reviewed commit', sha(show(REVIEWED, path)) == d['head'])
        ok(f'{path} base sha', sha(show(base, path)) == d['base'])
        ok(f'{path} prior sha', sha(show(prior, path)) == d['prior'])
    # unmutated
    by = {r['case']: r for r in rec['unmutated']}
    for name in ('base', 'head'):
        r = by[name]
        failed = [t for t in r['tests'] if t['status'] == 'failed']
        ok(f'{name}: passes recomputed', r['passes'] == (r['exitCode'] == 0 and not failed))
        ok(f'{name}: passes and 21 tests', r['passes'] and len(r['tests']) == 21, len(r['tests']))
        ok(f'{name}: mean interval recomputed', r['meanSampleIntervalSeconds'] == round(r['wallSeconds'] / r['samples'], 2))
    titles = lambda r: [(t['name'], t['status']) for t in r['tests']]
    ok('populations recomputed', rec['populations'] == {'baseTests': len(by['base']['tests']), 'headTests': len(by['head']['tests']),
                                                       'sameTitlesAndStatuses': titles(by['base']) == titles(by['head'])})
    # mutants
    for m in rec['mutants']:
        n = m['case']
        if m['mutantRecord']:
            mr = show(commit, m['mutantRecord']['path'])
            ok(f'{n}: 8.2 mutant record sha', sha(mr) == m['mutantRecord']['sha256'])
            ok(f'{n}: edits equal the 8.2 record edits', json.loads(mr)['edits'] == m['edits'])
        for e in m['edits']:
            for at in (commit, REVIEWED, base, prior):
                src = show(at, e['file'])
                ok(f'{n}: old occurs once in {e["file"]} at {at[:8]}', src is not None and src.count(e['old'].encode()) == 1,
                   None if src is None else src.count(e['old'].encode()))
        ok(f'{n}: entryTestAt sha', sha(show(m['entryTestAt']['commit'], ENTRY_TEST)) == m['entryTestAt']['sha256'])
        failed = [t for t in m['tests'] if t['status'] == 'failed']
        timed = [t for t in failed if 'ETIMEDOUT' in (t['failure'] or '')]
        ok(f'{n}: failedRows recomputed', m['failedRows'] == len(failed), (m['failedRows'], len(failed)))
        ok(f'{n}: timedOutRows recomputed', m['timedOutRows'] == len(timed), (m['timedOutRows'], len(timed)))
        ok(f'{n}: slowestFailedRowMs recomputed', m['slowestFailedRowMs'] == max((t['durationMs'] or 0 for t in failed), default=None))
        ok(f'{n}: mean interval recomputed', m['meanSampleIntervalSeconds'] == round(m['wallSeconds'] / m['samples'], 2))
        ok(f'{n}: 7477 empty, no survivors, no deadline', not m['port7477ListenersSeen'] and m['port7477ListenersBefore'] == 0
           and not m['survivors'] and not m['killedAtDeadline'])
        if m['mustFailBy'] == 'survives':
            ok(f'{n}: survives (exit 0, none failed, passes)', m['exitCode'] == 0 and not failed and m['passes'] and len(m['tests']) == 15,
               (m['exitCode'], len(failed), len(m['tests'])))
        else:
            named = sorted(t['name'] for t in m['tests'] if any(t['name'].endswith(r) for r in m['mustFail']))
            ok(f'{n}: exit non-zero', m['exitCode'] not in (0, None), m['exitCode'])
            ok(f'{n}: failed rows exactly the named ones', len(named) == len(m['mustFail']) and sorted(t['name'] for t in failed) == named,
               [t['name'][-60:] for t in failed])
            ok(f'{n}: failure mode {m["mustFailBy"]}', (len(timed) == len(failed)) if m['mustFailBy'] == 'timeout' else not timed)
            ok(f'{n}: every failed row under timeout + 5 s', all((t['durationMs'] or 0) < TIMEOUT_MS + 5000 for t in failed))
            ok(f'{n}: passes true', m['passes'])
    # root shim
    want = {'root-shim': ('skipped', 'pending'), 'root-shim-base': ('passed',), 'root-control': ('passed',)}
    for r in rec['rootShim']:
        rows = [t for t in r['tests'] if t['name'].endswith('rejects an unreadable state-dir path as named invalid before writes or a listener')]
        ok(f"{r['case']}: target row status", len(rows) == 1 and rows[0]['status'] in want[r['case']] and r['row'] == rows[0]['status'])
    ok('allPass recomputed', rec['allPass'] == (all(r['passes'] for r in rec['unmutated'] + rec['mutants'] + rec['rootShim'])
                                               and rec['populations']['sameTitlesAndStatuses']))
    # reviewRuns against round 1's raw
    rr = rec['reviewRuns']
    ok('reviewRuns raw sha256 equals round 1 raw', rr['raw']['sha256'] == RAW1_SHA == sha(raw_bytes))
    for run in rr['runs']:
        line = raw_lines[run['rawLine'] - 1]
        pieces = run['outcome'].split(' ... ')
        ok(f"reviewRuns {run['case']}: outcome quoted from raw line {run['rawLine']}", all(p in line for p in pieces), pieces)
        stem = run['case'].split('-')[0]
        ok(f"reviewRuns {run['case']}: raw line names the case", run['case'] in line or f'{stem},' in line or f'`{run["case"]}`' in line)
    return out


def figures(rec):
    """The PR body's changed figures, recomputed from the record."""
    out = []
    ok = lambda name, cond, detail='': out.append((name, bool(cond), detail))
    m = {r['case']: r for r in rec['mutants']}
    dur = lambda case, suffix: [t['durationMs'] for t in m[case]['tests'] if t['name'].endswith(suffix)]
    ok('R5 43.9 s, 20,104 / 20,029 ms, 0 of 103, two listeners',
       m['R5']['wallSeconds'] == 43.9 and dur('R5', '["--port","0","dossier"] is refused with exit 1 and the same message') == [20104]
       and dur('R5', '["Dossier"] is refused with exit 1 and the same message') == [20029] and m['R5']['samples'] == 103
       and len(m['R5']['portsTheRunListenedOn']) == 2)
    ok('R9 24.1 s, 20,033 ms, 0 of 56, one listener', m['R9']['wallSeconds'] == 24.1 and m['R9']['slowestFailedRowMs'] == 20033
       and m['R9']['samples'] == 56 and len(m['R9']['portsTheRunListenedOn']) == 1)
    ok('P1 3.9 s, governed row 121 ms, 0 of 9', m['P1']['wallSeconds'] == 3.9 and m['P1']['slowestFailedRowMs'] == 121
       and m['P1']['samples'] == 9 and m['P1']['portsTheRunListenedOn'] == [])
    ok('P2 23.9 s, 20,037 ms, 0 of 57, one listener', m['P2']['wallSeconds'] == 23.9 and m['P2']['slowestFailedRowMs'] == 20037
       and m['P2']['samples'] == 57 and len(m['P2']['portsTheRunListenedOn']) == 1)
    ok('P1 control 15 passed', sum(t['status'] == 'passed' for t in m['P1-at-prior']['tests']) == 15)
    intervals = sorted(r['meanSampleIntervalSeconds'] for r in rec['mutants'])
    ok('mutant mean intervals within 0.42-0.44', intervals[0] == 0.42 and intervals[-1] == 0.44, intervals)
    head = next(r for r in rec['unmutated'] if r['case'] == 'head')
    rs = [t for t in head['tests'] if any(t['name'].endswith(s) for s in RUNSYNC_SUFFIXES)]
    slow = max(rs, key=lambda t: t['durationMs'])
    ok('head: 12 runSync rows', len(rs) == 12, len(rs))
    ok('head slowest runSync row 386 ms dossier status', slow['durationMs'] == 386 and '`dossier status <missing>`' in slow['name'],
       (slow['durationMs'], slow['name'][-70:]))
    ok('head load1 15.92-16.33', head['load1'] == {'start': 15.92, 'end': 16.33}, head['load1'])
    base = next(r for r in rec['unmutated'] if r['case'] == 'base')
    brs = [t for t in base['tests'] if any(t['name'].endswith(s) for s in RUNSYNC_SUFFIXES)]
    ok('info: base slowest runSync row', True, max(t['durationMs'] for t in brs))
    ok('info: head slowest row overall', True, max((t['durationMs'], t['name'][-60:]) for t in head['tests']))
    return out


rec_orig = json.loads(show(REVIEWED, RECORD))
results = checks(rec_orig) + figures(rec_orig)
for name, cond, detail in results:
    print(('OK  ' if cond else 'FAIL'), name, '' if detail in ('', None) else f'-- {detail}')
fails = sum(not c for _, c, _ in results)
print(f'{len(results) - fails} OK, {fails} FAIL, of {len(results)} checks')

if SELFTEST:
    def mutate(path, value):
        rec = copy.deepcopy(rec_orig)
        node = rec
        for key in path[:-1]: node = node[key]
        node[path[-1]] = value(node[path[-1]]) if callable(value) else value
        return rec
    find = lambda case: next(i for i, r in enumerate(rec_orig['mutants']) if r['case'] == case)
    mutants = {
        'tool sha': (['tool', 'sha256'], '0' * 64),
        'base commit': (['baseCommit'], 'f7bbb93a005b45c2866d8a9993afbca44cd1a34f'),
        'head file sha': (['files', ENTRY_TEST, 'head'], '0' * 64),
        'P1 failedRows': (['mutants', find('P1'), 'failedRows'], 2),
        'P2 timedOutRows': (['mutants', find('P2'), 'timedOutRows'], 0),
        'R5 old fragment': (['mutants', find('R5'), 'edits', 0, 'old'], "if (arg.startsWith('-')) return"),
        'P1 old fragment': (['mutants', find('P1'), 'edits', 0, 'old'], lambda v: v.replace('DEFAULT_PORT', 'DEFAULT_PORTS')),
        'P1 control exit': (['mutants', find('P1-at-prior'), 'exitCode'], 1),
        'R9 mustFail extra row': (['mutants', find('R9'), 'mustFail'], lambda v: v + ['["Dossier"] is refused with exit 1 and the same message']),
        'mean interval': (['mutants', find('R5'), 'meanSampleIntervalSeconds'], 0.25),
        'reviewRuns quote': (['reviewRuns', 'runs', 0, 'outcome'], '**hung**'),
        'reviewRuns line': (['reviewRuns', 'runs', 3, 'rawLine'], 248),
        'P1 entryTestAt commit': (['mutants', find('P1-at-prior'), 'entryTestAt', 'commit'], REVIEWED),
        'head test status': (['unmutated', 1, 'tests', 0, 'status'], 'skipped'),
    }
    killed = 0
    for label, (path, value) in mutants.items():
        bad = [n for n, c, _ in checks(mutate(path, value)) + figures(mutate(path, value)) if not c]
        killed += bool(bad)
        print(f"selftest {label}: {'killed' if bad else 'SURVIVED'} {bad[:2]}")
    print(f'selftest: {killed} of {len(mutants)} mutants killed; control clean: {fails == 0}')
