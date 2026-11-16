#!/usr/bin/env python3
"""rev-520b: summarize every probe record under rev-520b/probes/ (one line each, then counts per group). usage: python3 -I summarize_probes.py DIR"""
import glob, json, os, re, sys

root = sys.argv[1]
files = sorted(glob.glob(os.path.join(root, 'probes', '**', '*.json'), recursive=True))
groups = {}
for f in files:
    d = json.load(open(f))
    frames = re.findall(r'File "([^"]+)", line (\d+), in (<?\w+>?)', d['outputTail'])
    where = ' > '.join(f'{os.path.basename(x[0])}:{x[1]}' for x in frames[-4:]) if 'TRACE-EXIT' in d['outputTail'] or d['inject'] == 'trace-exit' else ''
    rel = os.path.relpath(f, root)
    g = os.path.dirname(rel) + ':' + d['version'] + ':' + d['mode'] + (':' + d['inject'] if d['inject'] and d['inject'] != 'trace-exit' else '')
    s = groups.setdefault(g, {'n': 0, 'dirty': 0, 'survivors': 0})
    s['n'] += 1; s['dirty'] += not d['clean']; s['survivors'] += not d['noSurvivor']
    print(f"{rel:<52} sha {d['scriptSha256'][:8]} exit {d['exitCode']:>4} clean {str(d['clean']):<5} survivors {len(d['survivors3sAfterExit']):>2} {where}")
print()
for g, s in groups.items(): print(f"{g:<48} attempts {s['n']:>2}  dirty {s['dirty']:>2}  with survivors {s['survivors']:>2}")
print('records', len(files))
