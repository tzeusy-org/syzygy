"""analyze_removals.py: per removed site, its worst observed time over the reviewer's runs (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 analyze_removals.py <removal-check.json> <runs-dir> <label> <out.json>
The removed sites are removal-check.json's `holding` rows. A test site is matched to tree tests of its file by title (a
`${...}` or %s placeholder matches anything) and its suites; a hook site to the suite it sits in (the file, for a top-level
hook). Per run: the test's duration and state, or the hook's suite `hookMs` (duration less its children's) and whether the
suite or file carries a "Hook timed out" error. A site exceeds when any test run is not a pass or is over the threshold, or
any hook run carries a hook timeout or a hookMs over the threshold. Load is the run's load1 before and after.
"""
import glob, json, os, re, sys

rc_path, runs_dir, label, out_path = sys.argv[1:5]
rc = json.load(open(rc_path))
holding = [r for r in rc['rows'] if r['holds']]
runs = [json.loads(l) for l in open(os.path.join(runs_dir, f'{label}.jsonl'))]

def pattern(title):
    t = title[1:-1] if title.startswith('`') and title.endswith('`') else title
    parts = re.split(r'(\$\{[^}]*\}|%[sdifjoc#%]|\$[A-Za-z_][\w.]*)', t)
    return re.compile('^' + ''.join('.*' if i % 2 else re.escape(p) for i, p in enumerate(parts)) + '$')

def tests_of(node, suites=()):
    for c in node.get('tasks', []):
        if c['type'] == 'suite': yield from tests_of(c, suites + (c['name'],))
        else: yield suites, c

def suite_of(node, names):
    if not names: return node
    for c in node.get('tasks', []):
        if c['type'] == 'suite' and c['name'] == names[0]: return suite_of(c, names[1:])
    return None

out = []
for site in holding:
    path, kind, thr = site['site'].rsplit(':', 1)[0], site['kind'], site['thresholdMs']
    obs = []
    for run in runs:
        if run['file'] != path: continue
        stem = os.path.basename(path).replace('.ts', '')
        tree_path = os.path.join(runs_dir, f"{label}-r{run['round']}-{stem}.json")
        if not os.path.exists(tree_path):
            obs.append({'round': run['round'], 'missing': True}); continue
        files = json.load(open(tree_path))['files']
        f = next((x for x in files if x['file'].endswith(path)), None)
        load = [float(run['load1Before']), float(run['load1After'])]
        if f is None:
            obs.append({'round': run['round'], 'missing': True, 'load1': load}); continue
        if kind == 'test':
            pat = pattern(site['title'])
            hits = [(s, t) for s, t in tests_of(f) if pat.match(t['name']) and list(s) == site['suites']]
            for s, t in hits:
                obs.append({'round': run['round'], 'name': t['name'], 'state': t['state'], 'ms': t['durationMs'], 'errors': t['errors'], 'load1': load})
            if not hits: obs.append({'round': run['round'], 'missing': True, 'load1': load})
        else:
            s = suite_of(f, site['suites'])
            errs = (s or {}).get('errors', []) + (f.get('errors', []) if s is not f else [])
            obs.append({'round': run['round'], 'hookMs': None if s is None else s.get('hookMs'),
                        'hookTimedOut': any('Hook timed out' in e for e in errs), 'errors': errs, 'load1': load})
    if kind == 'test':
        worst = max((o['ms'] for o in obs if o.get('ms') is not None), default=None)
        exceeds = [o for o in obs if o.get('missing') or o.get('state') != 'pass' or (o.get('ms') or 0) > thr]
    else:
        worst = max((o['hookMs'] for o in obs if o.get('hookMs') is not None), default=None)
        exceeds = [o for o in obs if o.get('hookTimedOut') or (o.get('hookMs') or 0) > thr]
    loads = [x for o in obs for x in o.get('load1', [])]
    out.append({'site': site['site'], 'kind': kind, 'thresholdMs': thr, 'observations': len([o for o in obs if not o.get('missing')]),
                'worstMs': None if worst is None else round(worst), 'load1Range': [min(loads), max(loads)] if loads else None,
                'exceeds': len(exceeds), 'exceeding': exceeds, 'laneAloneWorstMs': site['alone']['worstMs'],
                'laneFullWorstMs': max((b['boundMs'] for b in site['full']['bounds'] if b.get('boundMs') is not None), default=None)})
json.dump({'label': label, 'sites': len(out), 'rows': out}, open(out_path, 'w'), indent=1)
for r in out:
    print(f"{r['site']:85} {r['kind']:4} obs={r['observations']:2} worst={r['worstMs']} thr={r['thresholdMs']} exceeds={r['exceeds']} load1={r['load1Range']} lane alone/full={r['laneAloneWorstMs']}/{r['laneFullWorstMs']}")
print('sites', len(out), 'with an exceeding run', sum(1 for r in out if r['exceeds']))
