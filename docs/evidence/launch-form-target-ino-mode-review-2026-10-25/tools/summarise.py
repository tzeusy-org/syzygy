"""rev-526: summarise rev526_mutants.py outputs per (mutant, variant, file system), with per-run checks. Usage: python3 -I summarise.py <out.json>..."""
import json, sys, collections
LINK = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: a symbolic link to the marker Syzygy writes'
table = collections.defaultdict(collections.Counter); problems = []; loads = collections.defaultdict(list); n = 0
for f in sys.argv[1:]:
    d = json.load(open(f))
    fs = d['dfT']
    if not d['trackedTreeCleanAfter']: problems.append(f'{f}: tree not clean')
    print(f, 'kernel', d['kernel'], 'node', d['node'], 'statF', d['statF'], 'dfT', d['dfT'], 'tmpRoot', d['tmpRoot'], 'tool', d['toolSha256'][:12])
    for r in d['runs']:
        n += 1
        k = (r['id'], r['variant'], fs)
        names = [t['test'] for t in r['failedTests']]
        exp = 'killed' if r['exitCode'] is None or (r['exitCode'] != 0 and names) else 'survived'
        if exp != r['outcome'] or not r['restored'] or not r['oldOccursOnce']: problems.append(f'{f} {k} {r["rep"]}')
        if r['counts'] and r['counts']['numFailedTests'] != len(names): problems.append(f'{f} {k} count')
        table[k][r['outcome']] += 1; table[k]['runs'] += 1
        if names == [LINK]: table[k]['linkRowOnly'] += 1
        if r['counts']: table[k][f"failed={r['counts']['numFailedTests']}"] += 1
        loads[fs].append(r['load1'])
print('runs', n, 'problems', len(problems), problems[:10])
for fs, l in loads.items(): print(fs, 'load1 min/max', min(l), max(l))
for k in sorted(table, key=lambda k: (k[2], k[0], k[1])):
    print(f'{k[2]:5s} {k[0][:42]:42s} @{k[1]:10s} {dict(table[k])}')
