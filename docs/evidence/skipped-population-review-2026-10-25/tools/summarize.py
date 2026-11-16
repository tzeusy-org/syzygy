#!/usr/bin/env python3
"""rev-527: one line per run-*.json in DIR, and the duration/load extremes over the passing unmutated runs.

usage: python3 -I summarize.py DIR
"""
import glob, json, os, sys

UNMUTATED = ('control', 'control-fc', 'control-ci', 'full', 'full-fc', 'full-merged', 'full-fc-merged', 'noshim-merged',
             'real-merge-full', 'real-merge-fc', 'main-merge-full', 'main-merge-fc')
rows, durs = [], []
for p in sorted(glob.glob(os.path.join(sys.argv[1], 'run-*.json'))):
    d = json.load(open(p))
    cr = d['checkRow'] if isinstance(d['checkRow'], dict) else {}
    rows.append((d['case'], d['n'], d['head'][:8], d['exitCode'], d['counts'], cr.get('status'), cr.get('durationMs'),
                 len(d['survivors']), d['sessionsSeen'], d['loadavgStart'][0], d['treeCleanAfter']))
    if d['case'] in UNMUTATED and not d['edits']:
        durs.append((cr.get('durationMs'), d['case'], d['n'], float(d['loadavgStart'][0]), float(d['loadavgEnd'][0]), cr.get('status')))
for r in rows:
    print('%-34s n=%d head=%s exit=%s counts=%s check=%s %sms survivors=%d sessions=%d load1=%s clean=%s' % r)
print(f'runs: {len(rows)}')
ok = [x for x in durs if x[5] == 'passed']
print(f'unmutated runs: {len(durs)}, check passed in {len(ok)}; check-row ms min {min(x[0] for x in ok)} max {max(x[0] for x in ok)} '
      f'(max at {max(ok)[1]}#{max(ok)[2]}); load1 range {min(min(x[3], x[4]) for x in durs)}-{max(max(x[3], x[4]) for x in durs)}')
