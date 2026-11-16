#!/usr/bin/env python3
"""Sweep every tracked JSON under docs/evidence outside syzygy-bpyt-4-13 for a package-reader.test.ts test (by full name, or
by its last describe plus title, or by title alone when unique) paired with a numeric duration field above 2,500 ms (rev-520).

usage: python3 -I sweep_other_evidence.py TREE HEAD_SUMMARY.json SOURCE_PLACEMENT.json"""
import json, os, re, subprocess, sys

tree, head_path, placement = sys.argv[1:4]
names = [t['name'] for t in json.load(open(head_path))['runs'][0]['tests']]
sized = {r['fullName'] for r in json.load(open(placement))}
# a second name form used by some records: '<innermost describe> > <title>' (from my head report's ancestorTitles)
report = json.load(open(head_path.replace('head.summary.json', 'head-1.report.json')))
forms = {' '.join([*a['ancestorTitles'], a['title']]): f"{a['ancestorTitles'][-1]} > {a['title']}" if a['ancestorTitles'] else a['title'] for s_ in report['testResults'] for a in s_['assertionResults']}
files = subprocess.run(['git', 'ls-files', '-z', 'docs/evidence'], cwd=tree, capture_output=True, text=True, check=True).stdout.split('\0')
files = [f for f in files if f.endswith('.json') and 'syzygy-bpyt-4-13' not in f]
DUR = re.compile(r'(^duration$|ms$)', re.I)   # any key named duration or ending in Ms/ms (durationMs, summedMs, totalMs, ...)
hits, scanned, mentioning = [], 0, 0
def walk(node, path, file):
    if isinstance(node, dict):
        strs = [v for v in node.values() if isinstance(v, str)]
        nums = {k: v for k, v in node.items() if isinstance(v, (int, float)) and DUR.search(k)}
        for s in strs:
            for n in names:
                if s == n or s == forms[n] or (len(s) > 30 and n.endswith(s)):
                    for k, v in nums.items():
                        if v > 2500: hits.append((file, path, k, v, n, n in sized))
        for k, v in node.items(): walk(v, f'{path}.{k}', file)
    elif isinstance(node, list):
        for i, v in enumerate(node): walk(v, f'{path}[{i}]', file)
for f in files:
    if not f: continue
    try: data = json.load(open(os.path.join(tree, f)))
    except Exception: continue
    scanned += 1
    text = json.dumps(data)
    if 'package-reader' in text or any(n[-40:] in text for n in names[:50]): mentioning += 1
    walk(data, '$', f)
print('JSON files scanned:', scanned, '| mentioning package-reader or a test title:', mentioning)
print('duration > 2500 ms paired with a package-reader test name:', len(hits))
for h in hits: print('  ', h[0], h[2], h[3], 'SIZED' if h[5] else 'NOT SIZED', h[4][:90])
