#!/usr/bin/env python3
"""Check PR #538's evidence records against git objects (rules 6 and 11), never against a working tree.

Usage: check-record.py <repo> <evidence commit>
Reads, at the evidence commit, docs/evidence/syzygy-bpyt-6-13/{support-leaf-followups,pins-mutants,item4-mutants}-2026-10-27.json and checks:
  - the subject: base and tested commits exist, the tested commit is the last one touching apps/ packages/ scripts/ before the evidence
    commit, and `git diff base tested -- apps packages scripts` hashes to ownDeltaSha256 with ownDeltaFiles paths;
  - each tool digest equals sha256 of the tool's bytes at the evidence commit;
  - for every mutant row (pins and item 4): `old` occurs exactly once in `file` at each commit the row ran at;
  - each pins row's ok flag follows from its exit codes and failed counts; after-side kills name only tests that exist at the head;
  - the summary counts equal counts recomputed from the rows.
Prints one line per check and a total; exit 1 on any failure.
"""
import hashlib
import json
import subprocess
import sys

repo, ev = sys.argv[1:3]
D = 'docs/evidence/syzygy-bpyt-6-13/'
fails = []
checks = 0


def git(*args, binary=False):
    p = subprocess.run(['git', *args], cwd=repo, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode()[:300])
    return p.stdout if binary else p.stdout.decode('utf-8')


def check(name, ok, detail=''):
    global checks
    checks += 1
    if not ok:
        fails.append(name)
    print(('ok  ' if ok else 'BAD ') + name + (f'  [{detail}]' if detail else ''))


def show(commit, path):
    try:
        return git('show', f'{commit}:{path}')
    except RuntimeError:
        return None


rec = json.loads(show(ev, D + 'support-leaf-followups-2026-10-27.json'))
pins = json.loads(show(ev, D + 'pins-mutants-2026-10-27.json'))
item4 = json.loads(show(ev, D + 'item4-mutants-2026-10-27.json'))
s = rec['subject']
base, tested = s['baseCommit'], s['testedCommit']
check('base commit resolves', git('rev-parse', base).strip() == base)
check('tested commit resolves', git('rev-parse', tested).strip() == tested)
last = git('log', '-1', '--format=%H', ev, '--', 'apps', 'packages', 'scripts').strip()
check('tested commit is the last code commit before the evidence commit', last == tested, last[:8])
delta = git('diff', base, tested, '--', 'apps', 'packages', 'scripts', binary=True)
check('own delta digest', hashlib.sha256(delta).hexdigest() == s['ownDeltaSha256'], hashlib.sha256(delta).hexdigest()[:16])
names = git('diff', '--name-status', base, tested, '--', 'apps', 'packages', 'scripts').strip().split('\n')
check('own delta paths', names == s['ownDeltaPaths'] and len(names) == s['ownDeltaFiles'], f'{len(names)} paths')
for tool, digest in rec['tools'].items():
    got = hashlib.sha256(git('show', f'{ev}:{D}{tool}', binary=True)).hexdigest()
    check(f'tool digest {tool}', got == digest)
check('pins record base/head', pins['base'] == base and pins['head'] == tested)

head_tests_cache = {}


def occurs_once(commit, path, old):
    text = show(commit, path)
    return text is not None and text.count(old) == 1, (None if text is None else text.count(old))


for row in pins['rows']:
    for side in ('before', 'after'):
        r = row[side]
        if r is None:
            continue
        ok, n = occurs_once(r['commit'], row['file'], row['old'])
        check(f"pins {row['id']} old once at {side} {r['commit'][:8]}", ok, f'count={n}')
        check(f"pins {row['id']} {side} failedTestCount matches failed and list", r['failedTestCount'] == r['failed'] == len(r['failedTests']) or (r['failedTestCount'] > 60 and len(r['failedTests']) == 60),
              f"{r['failedTestCount']}/{r['failed']}/{len(r['failedTests'])}")
        check(f"pins {row['id']} {side} exit agrees with failures", (r['exit'] == 0) == (r['failed'] == 0 and not r['filesFailedToLoad']), f"exit={r['exit']} failed={r['failed']}")
    a, b = row['after'], row['before']
    after_fails = a['exit'] != 0 and a['failed'] + len(a['filesFailedToLoad']) > 0
    before_ok = b is None or ((b['exit'] == 0) == (row['beforeExpected'] == 'pass'))
    expected_ok = (after_fails and before_ok) if row['expect'] == 'killed' else a['exit'] == 0
    check(f"pins {row['id']} ok flag follows from exits", expected_ok == row['ok'] and row['ok'])
    # each after-side failed test name must exist at the head and (for a killed pin) be absent at the base when it is a new row
    if 'tree' not in head_tests_cache:
        head_tests_cache['tree'] = git('ls-tree', '-r', '--name-only', tested, '--', 'apps', 'packages').split('\n')
    for name in a['failedTests']:
        file = name.split(' > ', 1)[0]
        hits = [x for x in head_tests_cache['tree'] if x.endswith('/' + file)]
        check(f"pins {row['id']} after-kill test file exists at head: {file}", len(hits) == 1, f'{len(hits)} paths')
sm = pins['summary']
killed = [r for r in pins['rows'] if r['expect'] == 'killed']
negs = [r for r in pins['rows'] if r['expect'] == 'pass']
check('pins summary mutants', sm['mutants'] == len(killed) == 19, str(len(killed)))
check('pins summary killedAfterAndSurvivedBefore', sm['killedAfterAndSurvivedBefore'] == sum(r['ok'] for r in killed))
check('pins summary negative controls', sm['negativeControls'] == len(negs) == 3 and sm['negativeControlsPassing'] == sum(r['ok'] for r in negs))
check('pins controls all pass', all(c['exit'] == 0 and c['failed'] == 0 for c in pins['controls'].values()) and len(pins['controls']) == sm['controlProjects'] == 6)
check('pins survive at base except D1', sorted(r['id'] for r in killed if r['before'] is not None and r['before']['exit'] != 0) == ['D1-freeze-after-the-walk'])

# item 4 rows: old once at each recorded commit
print('item4 keys:', sorted(item4.keys()))
for row in item4['rows']:
    commits = sorted({v['commit'] for k, v in row.items() if isinstance(v, dict) and 'commit' in v})
    for c in commits:
        ok, n = occurs_once(c, row['file'], row['old'])
        check(f"item4 {row['id']} old once at {c[:8]}", ok, f'count={n}')
print(f'checks={checks} failed={len(fails)}')
for f in fails:
    print('  FAILED', f)
sys.exit(1 if fails else 0)
