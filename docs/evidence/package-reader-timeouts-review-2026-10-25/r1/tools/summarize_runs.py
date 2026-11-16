#!/usr/bin/env python3
"""Summarize rev-520's own runs: per run the load, exit, failures and slowest tests; per sized test the worst duration I
measured against its timeout; and every test outside the sixteen that exceeded 2,500 ms (rev-520).

usage: python3 -I summarize_runs.py RUNS_DIR SOURCE_PLACEMENT.json"""
import glob, json, os, sys

runs_dir, placement = sys.argv[1], sys.argv[2]
sized = {r['fullName']: r['timeout'] for r in json.load(open(placement))}
worst, outside = {}, []
total_runs = 0
for path in sorted(glob.glob(os.path.join(runs_dir, '*.summary.json'))):
    s = json.load(open(path))
    for r in s['runs']:
        total_runs += 1
        ts = [t for t in r['tests'] if t['durationMs'] is not None]
        slow = sorted(ts, key=lambda t: -t['durationMs'])[:3]
        print(f"{s['label']}#{r['index']} {s['commit'][:8]} extra={' '.join(s.get('extraArgs', [])) or '-'} full={s['full']} exit={r['exitCode']} "
              f"load1 {r['load1']['start']}-{r['load1']['end']} (min {r['load1']['min']}, max {r['load1']['max']}) tests={r['fileTests']} "
              f"notPassed={sum(t['status'] != 'passed' for t in r['tests'])} | " + '; '.join(f"{t['durationMs']} {t['name'][:42]}" for t in slow))
        for t in ts:
            if t['name'] in sized:
                if t['durationMs'] > worst.get(t['name'], (0,))[0]: worst[t['name']] = (t['durationMs'], f"{s['label']}#{r['index']}", r['load1']['max'])
            elif t['durationMs'] > 2500:
                outside.append((t['durationMs'], t['name'], f"{s['label']}#{r['index']}"))
print('runs:', total_runs)
print('tests outside the sixteen above 2,500 ms:', len(outside), outside[:10])
largest_unsized = 0
for path in sorted(glob.glob(os.path.join(runs_dir, '*.summary.json'))):
    for r in json.load(open(path))['runs']:
        for t in r['tests']:
            if t['name'] not in sized and t['durationMs'] is not None: largest_unsized = max(largest_unsized, t['durationMs'])
print('largest duration of any test outside the sixteen, over all my runs:', largest_unsized)
print('sized tests: my worst measured duration vs its timeout')
for n, t in sorted(sized.items(), key=lambda kv: -kv[1]):
    w = worst.get(n)
    print(f"  {t:>6} ms  my worst {w[0]:>5} ms ({w[1]}, load1 max {w[2]})  timeout/worst {t / w[0]:6.1f}x  {n[:70]}")
