#!/usr/bin/env python3
"""rev-532: check PR 532's evidence record against git objects (rules 6 and 11). Reviewer tool, not authority.

usage: python3 -I record_check_rev.py REPO HEAD BASE

Reads every evidence file from git objects at HEAD (never a worktree). Prints one line per check: OK or FAIL and detail.
"""
import hashlib, json, math, subprocess, sys

repo, head, base = sys.argv[1], sys.argv[2], sys.argv[3]
E = 'docs/evidence/syzygy-bpyt-4-5'
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True).stdout
show = lambda c, p: git('show', f'{c}:{p}')
sha = lambda b: hashlib.sha256(b).hexdigest()
J = lambda p: json.loads(show(head, f'{E}/{p}'))
fails = 0
def check(name, ok, detail=''):
    global fails
    fails += 0 if ok else 1
    print(('OK   ' if ok else 'FAIL ') + name + (f' :: {detail}' if detail else ''))

rec = J('bounds-and-pins.json')
head, base = git('rev-parse', head).decode().strip(), git('rev-parse', base).decode().strip()
# 1. Commits named by the record: each exists and is an ancestor of HEAD.
named = {**{f'subject.{k}': v for k, v in rec['subject'].items() if k in ('base', 'main', 'evidenceCommit')}, **{f'resultsRanAt.{k}': v for k, v in rec['resultsRanAt'].items()}}
for k, c in named.items():
    anc = subprocess.run(['git', '-C', repo, 'merge-base', '--is-ancestor', c, head]).returncode == 0
    check(f'commit {k}={c[:8]} is an ancestor of HEAD', anc)
check('subject.main is the PR base', rec['subject']['main'] == base, rec['subject']['main'])
# 2. Subject digest and test files.
tests = [t['path'] for t in rec['subject']['testFiles']]
ev = rec['subject']['evidenceCommit']
check('testDiffSha256 recomputed over git diff main..evidenceCommit', sha(git('diff', base, ev, '--', *tests)) == rec['subject']['testDiffSha256'])
check('test files unchanged from evidenceCommit to HEAD', git('diff', ev, head, '--', *tests) == b'')
for t in rec['subject']['testFiles']:
    check(f'test file digest {t["path"].split("/")[-1]}', sha(show(head, t['path'])) == t['sha256'])
changed = [p for p in git('diff', '--name-only', base, head).decode().split('\n') if p]
product = [p for p in changed if not p.startswith(f'{E}/') and p not in tests]
check('no product file changed base..HEAD', product == [], str(product))
check('changed test files equal the record subject', sorted(p for p in changed if not p.startswith(f'{E}/')) == sorted(tests))
# 3. Every evidence file digest in record.files equals the bytes at HEAD.
for f in rec['files']:
    check(f'file digest {f["path"].removeprefix(E + "/")}', sha(show(head, f['path'])) == f['sha256'])
listed = {f['path'] for f in rec['files']} | {f'{E}/bounds-and-pins.json'}
tracked = {p for p in git('ls-tree', '-r', '--name-only', head, '--', E).decode().split('\n') if p}
check('record.files covers every tracked evidence file', listed == tracked, str(sorted(tracked ^ listed)))
# 4. Tool digests recorded by each result equal the tool's bytes at the commit the result ran and at HEAD.
for res, at_key in (('bound-and-pin-mutants.json', 'tree'), ('cpu-separation.json', 'tree'), ('daemon-entry-head.json', 'commit'),
                    ('daemon-entry-base-test.json', 'commit'), ('census-head.json', 'commit'), ('census-base.json', 'commit')):
    r = J(res); tool = f'{E}/tools/{r["tool"]["name"]}'
    for c in (ev, head):
        check(f'{res}: tool {r["tool"]["name"]} digest at {c[:8]}', sha(show(c, tool)) == r['tool']['sha256'])
    if 'cases' in r:
        check(f'{res}: cases digest at HEAD', sha(show(head, f'{E}/tools/{r["cases"]["path"]}')) == r['cases']['sha256'])
# 5. Rule-6 mutants: fragments, `old` once at the recorded commit, outcomes consistent with exit codes and rows.
mut = J('bound-and-pin-mutants.json'); cases = {c['id']: c for c in J('tools/mutant-cases.json')}
check('mutants ran at evidenceCommit', mut['tree'] == ev)
check('mutant base side is subject.base', mut['base'] == rec['subject']['base'])
check('mutant result ids equal mutant-cases ids', [r['id'] for r in mut['results']] == list(cases))
n_sides = n_ok = 0
for r in mut['results']:
    c = cases[r['id']]
    check(f'{r["id"]}: fragments in the result equal mutant-cases.json', r['mutations'] == c.get('mutations', []) and r['expect'] == c['expect'])
    for s in r['sides']:
        n_sides += 1
        at = mut['tree']
        for m in r['mutations']:
            text = show(at, m['file']).decode() if not (s['side'] == 'base' and m['file'] == r['test']) else show(mut['base'], m['file']).decode()
            check(f'{r["id"]}/{s["side"]}: old occurs once in {m["file"].split("/")[-1]}', text.count(m['old']) == 1, str(text.count(m['old'])))
        rows = s.get('rows', [])
        if s['outcome'] == 'pass': consistent = s['exit'] == 0 and rows and all(x['status'] == 'passed' for x in rows) and not s['killedAfterLimit']
        elif s['outcome'] == 'fail': consistent = any(x['status'] == 'failed' for x in rows) and s['exit'] != 0 and not s['killedAfterLimit']
        elif s['outcome'] == 'killed': consistent = s['killedAfterLimit'] is True
        else: consistent = False
        want = r['expect'][s['side']]
        as_exp = s['outcome'] == want or (want == 'fail-or-killed' and s['outcome'] in ('fail', 'killed'))
        n_ok += as_exp
        check(f'{r["id"]}/{s["side"]}: outcome {s["outcome"]} agrees with exit {s.get("exit")} and rows; expected {want}', consistent and as_exp == s['asExpected'] and as_exp)
        if s['outcome'] == 'fail':
            failed = [x for x in rows if x['status'] == 'failed']
            check(f'{r["id"]}/{s["side"]}: a failed row names the title', all(r['title'] in x['title'] for x in failed))
check(f'mutant totals cases={len(mut["results"])} sides={n_sides} asExpected={n_ok}', rec['mutantTotals'] == {'cases': len(mut['results']), 'sides': n_sides, 'asExpected': n_ok})
# 6. Daemon-entry probe: tree identity and fragments.
for res in ('daemon-entry-head.json', 'daemon-entry-base-test.json'):
    r = J(res)
    same = git('diff', r['commit'], head, '--', 'apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/state-directory.ts',
               'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts') == b''
    check(f'{res}: main.ts, state-directory.ts and the test identical at {r["commit"][:8]} and HEAD', same)
    tf = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
    test_bytes = show(r['commit'], tf) if r['testFileFrom'] == 'the tree' else show(r['testFileFrom'], tf)
    check(f'{res}: testFileSha256', sha(test_bytes) == r['testFileSha256'], r['testFileFrom'])
    for x in r['results']:
        m = x['mutant']
        if not m: continue
        src = show(r['commit'], m['file']).decode() if m['file'] != tf else test_bytes.decode()
        n = src.count(m['old'])
        check(f'{res}: {m["id"]} old occurs {"once" if not x.get("skipped") else "not once (skipped)"}', (n == 1) == (not x.get('skipped')), str(n))
        if not x.get('skipped'):
            check(f'{res}: {m["id"]} exit agrees with failed rows', (x['exit'] == 0) == (not x['failed']), f'exit {x["exit"]}, {len(x["failed"])} failed')
# 7. CPU separation: tree differs from evidenceCommit only in bound lines; arithmetic.
sep = J('cpu-separation.json')
files = sorted({s['file'] for s in sep['sites']})
diff = [l for l in git('diff', '-U0', sep['tree'], ev, '--', *files).decode().split('\n') if l.startswith(('+', '-')) and not l.startswith(('+++', '---'))]
import re
check('cpu-separation tree differs from evidenceCommit only in bound constants', all(re.match(r'^[+-]const [A-Z_]+_CPU_MS = [0-9_]+;', l) for l in diff), str(len(diff)))
for s in sep['sites']:
    vals = [g['cpuMs'] for h in s['headRuns'] for g in h['regions'] if g['bound'] == s['bound']]
    check(f'{s["bound"]}: headRuns={len(s["headRuns"])} >= 10 and headMax recomputed', len(s['headRuns']) >= 10 and max(vals) == s['headMaxMs'], f'{max(vals)}')
    mins = []
    for m in s['mutants']:
        per = [x['capped']['regionCpuMsAtLeast'] if x['capped'] else min(g['cpuMs'] for g in x['regions'] if g['bound'] == s['bound']) for x in m['runs']]
        check(f'{s["bound"]}/{m["title"][-28:]}: mutant min recomputed over {len(m["runs"])} runs ({m["cappedRuns"]} capped)', min(per) == m['min'])
        if m['min'] >= 10 * s['headMaxMs']: mins.append(m['min'])
    gm = math.sqrt(s['headMaxMs'] * min(mins)); e = math.floor(math.log10(gm)) - 1
    check(f'{s["bound"]}: proposed bound = floor-2sf(geomean) = {math.floor(gm / 10 ** e) * 10 ** e}', math.floor(gm / 10 ** e) * 10 ** e == s['proposedBoundMs'])
    committed = int(re.search(rf'^const {s["bound"]} = ([0-9_]+);', show(head, s['file']).decode(), re.M).group(1).replace('_', ''))
    check(f'{s["bound"]}: committed {committed} at HEAD equals proposed; {committed / s["headMaxMs"]:.1f}x head, {min(mins) / committed:.1f}x mutant',
          committed == s['proposedBoundMs'] and committed / s['headMaxMs'] >= 10 and min(mins) / committed >= 10)
    mr = [m for m in s['mutants']]
    check(f'{s["bound"]}: mutant runs per row {[len(m["runs"]) for m in mr]} (brief asks >= 10)', all(len(m['runs']) >= 10 for m in mr))
# 8. Full-suite attempts.
for k in range(1, 6):
    a = J(f'full-suite/attempt-{k}.json')
    print(f'INFO full-suite attempt-{k}: ' + json.dumps({kk: v for kk, v in a.items() if not isinstance(v, (list, dict))})[:400])
print(f'TOTAL FAIL {fails}')
