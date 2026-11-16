"""ruling7_sweep.py: does every timed run in the lane's records carry its own load1, and is the host recorded once?
(R-GP-IMPL-TEST-TIMEOUTS-1). Usage: python3 ruling7_sweep.py <repo> <commit>
Population: every .json tracked under docs/evidence/syzygy-bpyt-4-31/ at <commit>. A timed run is any object in a list
named `runs` (at any depth) that has a `wallSeconds`, `startedAt`, `durationMs` or `exitCode` key. It carries load1 when
it has a `load1` key (number or object) or `load1AtStart`. A host record is a file whose name starts `host`, or a
top-level key `host` holding an object with a cpu/model field; printed so a human can read whether host is restated.
"""
import json, subprocess, sys
repo, commit = sys.argv[1:3]
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True).stdout
paths = [p for p in git('ls-tree', '-r', '--name-only', commit, 'docs/evidence/syzygy-bpyt-4-31/').split('\n') if p.endswith('.json')]
records, runs, without, hosts = 0, 0, [], []
def walk(node, p):
    global runs
    if isinstance(node, dict):
        for k, v in node.items():
            if k == 'runs' and isinstance(v, list):
                for i, r in enumerate(v):
                    if isinstance(r, dict) and any(x in r for x in ('wallSeconds', 'startedAt', 'durationMs', 'exitCode')):
                        runs += 1
                        if not ('load1' in r or 'load1AtStart' in r): without.append(f'{p} runs[{i}]')
            walk(v, p)
    elif isinstance(node, list):
        for v in node: walk(v, p)
for p in paths:
    d = json.loads(git('show', f'{commit}:{p}'))
    before = runs
    walk(d, p)
    if runs > before: records += 1
    name = p.rsplit('/', 1)[-1]
    if name.startswith('host') or (isinstance(d, dict) and isinstance(d.get('host'), dict)):
        hosts.append((p, json.dumps(d.get('host') if isinstance(d, dict) and 'host' in d else d)[:140]))
print('json files', len(paths), 'records with timed runs', records, 'timed runs', runs, 'without load1', len(without))
for w in without[:20]: print('  WITHOUT', w)
print('files carrying a host object', len(hosts))
for h in hosts: print('  HOST', h[0], h[1])
