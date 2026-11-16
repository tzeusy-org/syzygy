#!/usr/bin/env python3
"""Summarize the head of each duration record and the load-127 extract, without printing per-test rows (rev-520)."""
import json, sys, os

ev = sys.argv[1]
for name in sorted(os.listdir(ev)):
    p = os.path.join(ev, name)
    d = json.load(open(p))
    print('==', name, 'schema', d.get('schema'))
    if d.get('schema') == 'vitest-test-durations/1':
        print('  script', d['script'], '\n  subject', d['subject'], '\n  mode', d['mode'], 'profile', d['profile'], 'host', d['host'])
        for r in d['runs']:
            fails = [t['name'][:90] for t in r['tests'] if t['status'] != 'passed']
            print('  run', r['index'], r['startedAt'], 'exit', r['exitCode'], 'wall', r['wallSeconds'], 'load1', {k: r['load1'][k] for k in ('start', 'end', 'min', 'max', 'samples')},
                  'totals', r['suiteTotals'], 'fileTests', r['fileTests'], 'nonpassed', len(fails), fails[:5])
            print('    command', r['command'])
    elif d.get('schema') in (None,) or 'testResults' in d:
        keys = [k for k in d if k != 'testResults']
        print('  keys', keys)
        for k in keys:
            v = d[k]
            print('   ', k, (json.dumps(v)[:400]))
        trs = d.get('testResults', [])
        print('  testResults', len(trs), [ (t['name'][-70:], len(t['assertionResults'])) for t in trs])
    else:
        print('  keys', list(d)[:20])
