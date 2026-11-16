#!/usr/bin/env python3
"""Sweep a checkout's tracked prose for sentences that describe the pre-syzygy-bpyt.4.2 resolution and build model.

Usage: doc_sweep.py <checkout> <out.json>
Population: every tracked file ending .md, .txt or .yml/.yaml (workflows included), and every tracked `.ts`/`.mjs`/`.py`
comment line is out of scope (code is swept by dist_reader_sweep.py). Predicates (Python re, case-sensitive, per line):
  FORCE   = r'--force'                                   (any tsc -b --force, or another tool's --force)
  BUILD_OUTPUT = r'build-output\.test'                   (the deleted test)
  ALIAS   = r'\balias(?:es|ed)?\b'                        (alias wording)
  DIST_DECL = r'dist[` ]+declaration|through `?dist`? declarations|stale `?dist`?'   (typecheck through dist declarations)
  APP_TC  = r'tsc --noEmit -p apps'                      (the old app typecheck)
Hits are listed with path and line; the caller classifies them. Paths under docs/reviews/, round-* and history/ are counted
separately as retained or historical records.
"""
import json, re, subprocess, sys

root, out = sys.argv[1:3]
PRED = {
    'FORCE': re.compile(r'--force'),
    'BUILD_OUTPUT': re.compile(r'build-output\.test'),
    'ALIAS': re.compile(r'\balias(?:es|ed)?\b'),
    'DIST_DECL': re.compile(r'dist[` ]+declaration|through `?dist`? declarations|stale `?dist`?'),
    'APP_TC': re.compile(r'tsc --noEmit -p apps'),
}
files = [f for f in subprocess.run(['git', '-C', root, 'ls-files', '-z'], capture_output=True, text=True).stdout.split('\0')
         if f.endswith(('.md', '.txt', '.yml', '.yaml'))]
hits = []
for f in files:
    try:
        lines = open(f'{root}/{f}', encoding='utf-8').read().split('\n')
    except (UnicodeDecodeError, FileNotFoundError):
        continue
    for n, line in enumerate(lines, 1):
        for name, p in PRED.items():
            if p.search(line):
                retained = bool(re.search(r'(^|/)(reviews|history)/|/round-[^/]+/|-RAW\.md$', f))
                hits.append({'file': f, 'line': n, 'predicate': name, 'retained': retained, 'text': line.strip()[:260]})
json.dump({'population': len(files), 'hits': hits}, open(out, 'w'), indent=1)
live = [h for h in hits if not h['retained']]
print(len(files), 'files;', len(hits), 'hits;', len(live), 'outside retained/historical paths')
for h in live:
    print(f"{h['file']}:{h['line']} {h['predicate']} | {h['text'][:200]}")
