#!/usr/bin/env python3
"""rev-532b: independent checks of PR 532's round-1-repair record at a commit, from git objects only. Reviewer tool, not authority.

usage: python3 -I record_check_r2.py TREE COMMIT

Reads every file from `git show COMMIT:<path>` (never the working tree). Prints one OK / FAIL / INFO line per check.
  - the two CPU separations: head max and mutant min re-derived from the runs (a capped run counts at its cap reading;
    a mutant row counts only when its min is >= 10x head max, as the lane's tool defines `reached`), against the
    recorded figures; both 10x margins at the bound the test file holds at COMMIT; the margins in the record;
  - each result's cases digest against tools/mutant-cases.json at the evidence commit and at COMMIT; tool digests;
  - the daemon-entry results: R1-R3 and the dropped equivalents, per test side;
  - the record's `fail (by the test timeout)` sides, and the rows behind them;
  - the N2 dispositions; the record's file digests against the files at COMMIT.
"""
import hashlib, json, re, subprocess, sys

tree, commit = sys.argv[1], sys.argv[2]
EV = 'docs/evidence/syzygy-bpyt-4-5'
g = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, check=True).stdout
show = lambda c, p: g('show', f'{c}:{p}')
js = lambda p: json.loads(show(commit, f'{EV}/{p}'))
sha = lambda b: hashlib.sha256(b).hexdigest()
fails = 0
def check(ok, text):
    global fails
    fails += 0 if ok else 1
    print(('OK   ' if ok else 'FAIL ') + text)

rec = js('bounds-and-pins.json')
ev = rec['subject']['evidenceCommit']
check(subprocess.run(['git', 'merge-base', '--is-ancestor', ev, commit], cwd=tree).returncode == 0, f'evidence commit {ev[:8]} is an ancestor of {commit}')
tests = [t['path'] for t in rec['subject']['testFiles']]
check(all(sha(show(commit, p)) == t['sha256'] for p, t in zip(tests, rec['subject']['testFiles'])), f'{len(tests)} test-file digests equal the files at {commit}')
check(sha(g('diff', rec['subject']['main'], commit, '--', *tests)) == rec['subject']['testDiffSha256'], 'testDiffSha256 recomputed over main..COMMIT')
bad = [f['path'] for f in rec['files'] if sha(show(commit, f['path'])) != f['sha256']]
tracked = sorted(p for p in g('ls-tree', '-r', '--name-only', commit, '--', EV).decode().split('\n') if p and not p.endswith('bounds-and-pins.json'))
check(not bad and sorted(f['path'] for f in rec['files']) == tracked, f"record `files` covers {len(tracked)} tracked evidence files, digests equal (mismatches {bad})")
bounds = {}
for f in ('packages/polaris-generation-core/src/dossier-profile.test.ts', 'packages/polaris-generation-core/src/excerpt.test.ts',
          'packages/three-surface-poc-core/src/test-artifact-verification.test.ts'):
    for m in re.finditer(r'^const ([A-Z_]+_CPU_MS) = ([0-9_]+);', show(commit, f).decode(), re.M): bounds[m.group(1)] = int(m.group(2).replace('_', ''))
print('INFO bounds at COMMIT', bounds)
cases_ev, cases_now = sha(show(ev, f'{EV}/tools/mutant-cases.json')), sha(show(commit, f'{EV}/tools/mutant-cases.json'))
check(cases_ev == cases_now, f'mutant-cases.json unchanged from the evidence commit to {commit} ({cases_now[:12]})')
table = {}
for name in ('cpu-separation.json', 'cpu-separation-node22.json'):
    d = js(name)
    check(d['cases']['sha256'] == cases_now, f'{name}: cases digest is the retained file')
    check(sha(show(commit, f'{EV}/tools/{d["tool"]["name"]}')) == d['tool']['sha256'], f'{name}: tool digest equals tools/{d["tool"]["name"]} at {commit}')
    for s in d['sites']:
        b = s['bound']
        head = [r['cpuMs'] for h in s['headRuns'] for r in h['regions'] if r['bound'] == b]
        hmax = max(head)
        rows = []
        for m in s['mutants']:
            vals = [x['capped']['regionCpuMsAtLeast'] if x['capped'] else min(r['cpuMs'] for r in x['regions'] if r['bound'] == b) for x in m['runs']]
            rows.append((m['title'], min(vals), len(m['runs']), sum(1 for x in m['runs'] if x['capped'])))
        reached = [r for r in rows if r[1] >= 10 * hmax]
        mmin = min(r[1] for r in reached)
        fb = bounds[b]
        ho, mo = fb / hmax, mmin / fb
        check(len(s['headRuns']) == 10 and all(h['exit'] == 0 for h in s['headRuns']), f'{name} {b}: 10 head runs, each exit 0')
        check(abs(hmax - s['headMaxMs']) < 1e-9 and abs(mmin - s['mutantMinMs']) < 1e-9, f'{name} {b}: head max {hmax} and mutant min {mmin} re-derived from runs equal the recorded figures')
        check(ho >= 10 and mo >= 10, f'{name} {b}: at the held bound {fb}, bound/head {ho:.2f}x and mutant/bound {mo:.2f}x (both >= 10)')
        check(round(ho, 1) == s['fileBound']['overHeadMax'] and round(mo, 1) == s['fileBound']['mutantMinOver'] and s['fileBound']['ms'] == fb,
              f'{name} {b}: fileBound ratios {s["fileBound"]["overHeadMax"]}, {s["fileBound"]["mutantMinOver"]} at {s["fileBound"]["ms"]} re-derived')
        loads = [x for h in s['headRuns'] for x in (h['load1Start'], h['load1End'])]
        print(f'INFO {name} {b}: node {d["node"]} cpu {d["cpuSource"]} tree {d["tree"][:8]} headLoad1 {min(loads)}-{max(loads)} mutant rows {rows} geometricMeanNow {s["proposedBoundMs"]}')
        table[(name, b)] = (round(hmax, 1), mmin, round(ho, 1), round(mo, 1))
        r = rec['sites'][[x.get('bound') for x in rec['sites']].index(b)]['separation']
        tgt = r if name == 'cpu-separation.json' else r['underProcessCpuFallback']
        check(abs(tgt['headMaxMs'] - hmax) < 1e-9 and abs(tgt['mutantMinMs'] - mmin) < 1e-9 and tgt['boundOverHeadMax'] == round(ho, 1) and tgt['mutantMinOverBound'] == round(mo, 1),
              f'record {b} ({"thread" if tgt is r else "fallback"}): {tgt["boundOverHeadMax"]}x and {tgt["mutantMinOverBound"]}x as re-derived')
print('INFO table', json.dumps({f'{k[0]}:{k[1]}': v for k, v in table.items()}))
for name in ('daemon-entry-head.json', 'daemon-entry-base-test.json', 'daemon-entry-prior-test.json'):
    d = js(name)
    check(sha(show(commit, f'{EV}/tools/{d["tool"]["name"]}')) == d['tool']['sha256'], f'{name}: tool digest equals the tool at {commit}')
    out = {(r['mutant'] or {}).get('id', 'control'): r for r in d['results']}
    for mid in ('control', 'R1-flag-between-branches', 'R2-flag-createRequire-before-daemon', 'R3-runtime-hook', 'E-comment-in-branch', 'E-renamed-binding', 'E-branch-swap', 'E-type-only-import'):
        r = out[mid]
        print(f'INFO {name} {mid}: exit {r["exit"]} passed {r["passed"]} skipped {r.get("skipped")} failed {[t[-80:] for t in r["failed"]]}')
    print(f'INFO {name}: {len(out)} results, testFileFrom {d["testFileFrom"][:8]}, commit {d["commit"][:8]}')
timeouts = []
for s in rec['sites']:
    for mid, sides in s.get('outcomes', {}).items():
        for side, word in sides.items():
            if word == 'fail (by the test timeout)': timeouts.append(f'{mid}/{side}')
mut = js('bound-and-pin-mutants.json')
by = sorted(f"{c['id']}/{s['side']}" for c in mut['results'] for s in c['sides'] if s['outcome'] == 'fail' and any(r.get('byTimeout') for r in s.get('rows', [])))
print('INFO record sides said "fail (by the test timeout)":', sorted(timeouts), '; sides with a byTimeout row:', by)
check(mut['cases']['sha256'] == cases_now, 'bound-and-pin-mutants.json: cases digest is the retained file')
kept = [s['site'] for s in rec['sites'] if s.get('disposition') == 'kept']
print('INFO N2 kept dispositions:', kept)
print(f'TOTAL FAIL {fails}')
