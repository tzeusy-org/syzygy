#!/usr/bin/env python3
"""Each holding removal's figure in my full-suite run (round-2 reviewer tool).
usage: python3 -I removals_in_full.py REMOVAL-CHECK.json FULL-REPORT.json
A test site is matched to tests whose full name ends with its suites and title joined by ' > ' (printf/$name placeholders
match anything); a hook site takes the hookMs of the suite it belongs to ('(file)' for a file-level hook)."""
import json, re, sys
rc, rep = (json.load(open(p)) for p in sys.argv[1:3])
files = {f['file'].split('/apps/', 1)[-1].split('/packages/', 1)[-1]: f for f in rep['files']}
def file_of(path):
    return next((f for k, f in files.items() if f['file'].endswith('/' + path)), None)
def pat(text):
    return re.escape(text).replace(re.escape('%s'), '.*').replace(re.escape('%d'), '.*').replace(re.escape('%i'), '.*')
worst, rows = {}, []
for r in rc['rows']:
    if not r['holds']: continue
    path = r['site'].rsplit(':', 1)[0]
    f = file_of(path)
    if f is None: rows.append((r['site'], 'FILE NOT IN RUN')); continue
    if r['kind'] == 'test':
        name = ' > '.join([*(r.get('suites') or []), r['title']])
        rx = re.compile(r'(^|> )' + re.sub(r'\\\$\w+', '.*', pat(name)) + '$')
        hits = [t for t in f['tests'] if rx.search(t['name'])]
        ms = [round(t['durationMs'] or 0) for t in hits]
        rows.append((r['site'], r['kind'], r['thresholdMs'], len(hits), max(ms) if ms else None, [t['state'] for t in hits]))
    else:
        suite = ' > '.join(r.get('suites') or []) or '(file)'
        s = [x for x in f['suites'] if x['name'] == suite]
        rows.append((r['site'], r['kind'], r['thresholdMs'], len(s), s[0]['hookMs'] if s else None, [x['state'] for x in s]))
over = [x for x in rows if len(x) > 4 and x[4] is not None and x[4] > x[2]]
unmatched = [x for x in rows if len(x) < 5 or x[3] == 0]
print('holding removals', len(rows), 'matched', len(rows) - len(unmatched), 'over threshold', len(over))
for x in over: print('  OVER', x)
for x in unmatched: print('  UNMATCHED', x)
print('worst test', max((x for x in rows if len(x) > 4 and x[1] == 'test' and x[4] is not None), key=lambda x: x[4]))
print('worst hook', max((x for x in rows if len(x) > 4 and x[1] == 'hook' and x[4] is not None), key=lambda x: x[4]))
