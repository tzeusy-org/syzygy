#!/usr/bin/env python3
"""AC1 sweeps for syzygy-bpyt.6.4 over the tracked non-test TypeScript of the POC core and app.

Usage: sweep.py <checkout>   (prints JSON; population = `git ls-files` *.ts under the two src trees,
excluding *.test.ts)

Predicates (Python re, one line at a time):
  cast      r"as keyof typeof UNKNOWN_REASON_ROUTES"
  closed    r"\\b(unknownReason|closedReason)\\??: string\\b"        a closed-reason field typed string
  revalid   r"\\b(closedReason|isUnknownReason)\\("                  the removed runtime re-validation
  prose     r"\\breason: string\\b"                                 every remaining string `reason` field,
            listed with its line so each can be classified (prose basis vs closed word)
"""
import json, re, subprocess, sys
root = sys.argv[1]
files = [f for f in subprocess.run(['git', 'ls-files', 'packages/three-surface-poc-core/src', 'apps/three-surface-poc/src'], cwd=root, capture_output=True, text=True).stdout.split('\n')
         if f.endswith('.ts') and not f.endswith('.test.ts')]
P = {'cast': r'as keyof typeof UNKNOWN_REASON_ROUTES', 'closed': r'\b(unknownReason|closedReason)\??: string\b',
     'revalid': r'\b(closedReason|isUnknownReason)\(', 'prose': r'\breason: string\b'}
hits = {k: [] for k in P}
for f in files:
    for n, line in enumerate(open(f'{root}/{f}', encoding='utf8').read().split('\n'), 1):
        for k, rx in P.items():
            if re.search(rx, line): hits[k].append(f'{f}:{n}: {line.strip()[:140]}')
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=root, capture_output=True, text=True).stdout.strip()
print(json.dumps({'commit': head, 'population': len(files), 'counts': {k: len(v) for k, v in hits.items()}, 'hits': hits}, indent=1))
