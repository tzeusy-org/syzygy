#!/usr/bin/env python3
"""Round 3: what changed in each evidence file between two commits. JSON files are compared value by value and the changed
leaf paths are listed with list indices collapsed to [*] (with a count and up to three examples); other files by line,
with the changed lines classified by a regex over their text.

Usage: evidence_diff_r3.py <clone> <old> <new> <out.json>
"""
import json, re, subprocess, sys
from collections import defaultdict

clone, old, new, out = sys.argv[1:5]
D = 'docs/evidence/syzygy-bpyt-6-14/'
git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
paths = git('diff', '--name-only', old, new, '--', D).split()


def leaves(x, p=''):
    if isinstance(x, dict):
        for k, v in x.items():
            yield from leaves(v, f'{p}.{k}')
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from leaves(v, f'{p}[{i}]')
    else:
        yield p, x


res = {'old': old, 'new': new, 'files': {}}
for path in paths:
    a, b = git('show', f'{old}:{path}'), git('show', f'{new}:{path}')
    entry = {}
    if path.endswith('.json'):
        la, lb = dict(leaves(json.loads(a))), dict(leaves(json.loads(b)))
        changed = defaultdict(list)
        for k in sorted(set(la) | set(lb)):
            if la.get(k, '<absent>') != lb.get(k, '<absent>'):
                changed[re.sub(r'\[\d+\]', '[*]', k)].append([k, la.get(k, '<absent>'), lb.get(k, '<absent>')])
        entry['changedLeafPatterns'] = {k: {'count': len(v), 'examples': [[e[0], str(e[1])[:120], str(e[2])[:120]] for e in v[:3]]}
                                        for k, v in changed.items()}
    else:
        da = git('diff', '-U0', old, new, '--', path)
        plus = [l[1:] for l in da.splitlines() if l.startswith('+') and not l.startswith('+++')]
        minus = [l[1:] for l in da.splitlines() if l.startswith('-') and not l.startswith('---')]
        entry['plus'], entry['minus'] = len(plus), len(minus)
        entry['plusLines'] = plus[:12]
        entry['minusLines'] = minus[:12]
        entry['setDiff'] = {'onlyNew': len(set(plus) - set(minus)), 'onlyOld': len(set(minus) - set(plus))}
    res['files'][path] = entry
json.dump(res, open(out, 'w'), indent=1)
for p, e in res['files'].items():
    print('==', p)
    if 'changedLeafPatterns' in e:
        for k, v in e['changedLeafPatterns'].items():
            print('  ', k, v['count'], v['examples'][0][1:])
    else:
        print('   +', e['plus'], '-', e['minus'], e['setDiff'])
