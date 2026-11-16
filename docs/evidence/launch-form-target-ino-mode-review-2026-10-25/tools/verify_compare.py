"""rev-526: compare the 8.35 'b' fix runs with the 8.33 record's fix rows, per mutant, by failed-test set and count. Git objects only."""
import json, subprocess, sys, collections
CL, HEAD = sys.argv[1], sys.argv[2]
FIX = '2a21f2b0e95e3731a3f975a0cbad8aaccd3a9b3b'
def git(*a): return subprocess.run(['git', '-C', CL, *a], capture_output=True, check=True).stdout
bad = 0
for fs in ('tmpfs', 'ext4'):
    prior = json.loads(git('show', f'{FIX}:docs/evidence/launch-form-target-ctime-2026-10-25/mutants-{fs}.json'))
    rows = {m['id']: m for m in prior['mutants'] if m['tests'] == 'fix'}
    now = json.loads(git('show', f'{HEAD}:docs/evidence/launch-form-target-ino-mode-2026-10-25/mutants-b-{fs}.json'))
    by = collections.defaultdict(list)
    for r in now['runs']:
        if r['side'] == 'fix': by[r['id']].append(r)
    print(fs, 'prior fix rows:', len(rows), 'ids in b fix runs:', len(by))
    for mid, m in sorted(rows.items()):
        pset = {t['test'] for t in m.get('failedTests', [])}
        runs = by.get(mid, [])
        sets = [frozenset(t['test'] for t in r['failedTests']) for r in runs]
        outs = collections.Counter(r['outcome'] for r in runs)
        same = all(s == pset for s in sets)
        if not same or outs.get(m['outcome'], 0) != len(runs) or not runs: bad += 1
        print(f'  {mid:55s} prior={m["outcome"]:8s} n={len(pset):2d} now={dict(outs)} sizes={sorted(len(s) for s in sets)} sameSet={same}')
    extra = sorted(set(by) - set(rows))
    print('  ids only in b:', extra)
    for mid in extra:
        outs = collections.Counter(r['outcome'] for r in by[mid])
        print(f'    {mid}: {dict(outs)} sizes={sorted(len(r["failedTests"]) for r in by[mid])}')
print('mismatches:', bad)
