#!/usr/bin/env python3
"""rev-520c: re-check docs/evidence/syzygy-bpyt-4-13/measure-restore-probes.json (schema 2) by script.
usage: python3 -I check_probe_record.py CLONE
Read-only (git show). Recomputes the summary from the results, checks every digest against git, and prints per-probe detail."""
import collections, hashlib, json, subprocess, sys

clone = sys.argv[1]
HEAD = 'e7f3c71ef84f93cbdeef26db54fbdc63e05bc164'
REC = 'docs/evidence/syzygy-bpyt-4-13/measure-restore-probes.json'
sha = lambda b: hashlib.sha256(b).hexdigest()
def show(rev, path): return subprocess.run(['git', 'show', f'{rev}:{path}'], cwd=clone, capture_output=True, check=True).stdout
def say(k, v): print(f'{k}: {v}')

d = json.loads(show(HEAD, REC))
say('schema', d['schema'])
say('record commit', d['commit'])
tool = d['tool']
say('tool sha256 == git show <record commit>:tool', tool['sha256'] == sha(show(d['commit'], tool['path'])))
say('tool sha256 == git show HEAD:tool', tool['sha256'] == sha(show(HEAD, tool['path'])))
for s in d['scripts']:
    say(f"script {s['version']} {s['commit'][:8]} sha256 {s['sha256'][:8]} == git show", s['sha256'] == sha(show(s['commit'], s['path'])))
fix = next(s for s in d['scripts'] if s['version'] == 'fix')
say('fix script == HEAD script', fix['sha256'] == sha(show(HEAD, fix['path'])))

# recompute the summary from results
res = d['results']
say('results', len(res))
groups = collections.defaultdict(list)
for r in res:
    groups[(r['probe'], r['script'])].append(r)
recomputed_ok = True
for (probe, version), rs in sorted(groups.items()):
    passed = sum(bool(r['passes']) for r in rs)
    s = d['summary'][probe][version]
    match = (s['attempts'], s['passed']) == (len(rs), passed)
    recomputed_ok &= match
    exercised = collections.Counter(r.get('exercised', '-') for r in rs)
    exits = collections.Counter(r['exitCode'] for r in rs)
    dirty = sum(bool(r['treeAfterExit']) for r in rs)
    surv = sum(bool(r['survivors']) for r in rs)
    params = sorted(collections.Counter(r['param'] for r in rs).items(), key=lambda kv: (kv[0] is None, kv[0] or 0))
    print(f'  {probe:>2} {version:>6}: attempts {len(rs)}, passed {passed}, summary match {match}, exercised {dict(exercised)}, '
          f'exits {dict(exits)}, dirty {dirty}, with survivors {surv}, params {params}')
    for r in rs:
        if not r['passes']:
            print(f"      fail param={r['param']} exit={r['exitCode']} dirty={r['treeAfterExit']!r} survivors={len(r['survivors'])} "
                  f"exercised={r.get('exercised')} tests={r['recordTests']} prof={r['recordProfileRows']}")
say('summary recomputed from results matches', recomputed_ok)
say('summary keys', {p: sorted(v) for p, v in d['summary'].items()})
# expected outcomes the brief asks for: E, G, K, H fail >=1 against round1, pass every attempt against fix
for p in ('E', 'G', 'K', 'H'):
    r1 = groups[(p, 'round1')]; fx = groups[(p, 'fix')]
    say(f'{p}: round1 fails >=1 / fix passes all / fix all exercised',
        (any(not r['passes'] for r in r1), all(r['passes'] for r in fx), all(r.get('exercised') for r in fx)))
# fix E: every fix E exit code
say('fix E exit codes', collections.Counter(r['exitCode'] for r in groups[('E', 'fix')]))
say('fix G exit codes', collections.Counter(r['exitCode'] for r in groups[('G', 'fix')]))
say('fix H', [(r['exitCode'], r['recordTests'], r['recordProfileRows']) for r in groups[('H', 'fix')]])
say('fix K', [(r['exitCode'], r['recordTests'], r['killpgCalls']) for r in groups[('K', 'fix')]])
say('round1 K', [(r['exitCode'], r['treeAfterExit'], r['killpgCalls']) for r in groups[('K', 'round1')]])
say('fix I/T', [(r['probe'], r['exitCode'], r['outputTail'][-160:]) for r in groups[('I', 'fix')] + groups[('T', 'fix')]])
say('predicate', d['predicate'])
