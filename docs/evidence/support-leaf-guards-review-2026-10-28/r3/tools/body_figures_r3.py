#!/usr/bin/env python3
"""Round 3: re-derive the figures the PR body's Tests and Residuals sections give from the committed records at the evidence head.

Usage: body_figures_r3.py <clone> <out.json>
"""
import json, subprocess, sys

clone, out = sys.argv[1:3]
D = 'docs/evidence/syzygy-bpyt-6-14'
EV = '12d70cf0'
S10 = 'the S10 bundle takes each workspace package from the source its entry names (syzygy-bpyt.6.14)'
BUNDLE_TEST = f'{S10} bundles the driver with every @syzygy specifier inside packages/*/src or apps/*/src'
N4_ROW = f'{S10} bundles the driver only under the guard: an alias that leaves the sources fails it'


def load(name):
    return json.loads(subprocess.run(['git', '-C', clone, 'show', f'{EV}:{D}/{name}'], check=True, capture_output=True, text=True).stdout)


res = {}
s = load('suite-head.json')
res['suite'] = {k: s[k] for k in ['commit', 'command', 'exit', 'files', 'total', 'passed', 'failed', 'skipped', 'load1', 'wallSeconds', 'cleanAfter']}
res['suite']['distDirs'] = len(s['distDirs'])
res['suite']['perFileSum'] = sum(s['perFile'].values())
res['suite']['perFileCount'] = len(s['perFile'])
t = load('titles.json')
res['titles'] = {'base': t['base'], 'head': t['head'], 'added': len(t['added']), 'removed': len(t['removed']), 'headCommit': t['headCommit'],
                 'perFile': t['perFile']}
b = load('bundle-test-durations.json')
bt = [next(x['durationMs'] for x in r['tests'] if x['name'] == BUNDLE_TEST) for r in b['runs']]
gt = [next(x['durationMs'] for x in r['tests'] if x['name'] == N4_ROW) for r in b['runs']]
res['bundleTestDurations'] = {'commit': b['subject']['commit'], 'mode': b['mode'], 'runs': len(b['runs']), 'load1': [r['load1'] for r in b['runs']],
                              'exit': [r['exitCode'] for r in b['runs']], 'bundleMs': [min(bt), max(bt)], 'guardMs': [min(gt), max(gt)],
                              'suiteTotals': [r['suiteTotals'] for r in b['runs']]}
h = load('no-egress-hook-durations.json')
ba = [next(x['beforeAllMs'] for x in r['suites'] if x['suite'] == '(file)') for r in h['runs']]
res['hookDurations'] = {'commit': h['subject']['commit'], 'runs': len(h['runs']), 'load1': [r['load1'] for r in h['runs']],
                        'beforeAllMs': [min(ba), max(ba)], 'exit': [r['exitCode'] for r in h['runs']]}
r = load('residuals-head.json')
res['residuals'] = {'commit': r['commit'], 'statusAfter': r['statusAfter'],
                    'rows': {row['id']: [row['expected'], row['observed'], row['passed'], row['failed']] for row in r['rows']},
                    'other': {k: v for k, v in r.items() if k not in ('rows',)}}
d = load('bundle-differential.json')
res['bundleDifferential'] = {'identical': d['identical'], 'runs': [{k: x[k] for k in ['commit', 'distDirs', 'exit', 'passed', 'failed', 'pending',
                                                                                       'bytes', 'sha256', 'statusAfter']} for x in d['runs']]}
for st in ['absent', 'present']:
    m = load(f'mutants-head-{st}.json')
    res[f'unmutated-{st}'] = {row['id']: [row['observed'], row['passed'], row['failed'], row['pending']] for row in m['rows']
                              if row['id'].startswith(('C0', 'D0')) or 'unmutated' in row['id']}
json.dump(res, open(out, 'w'), indent=2)
print(json.dumps(res, indent=2))
