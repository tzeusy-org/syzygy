#!/usr/bin/env python3
"""How many static-census sites carry literal None although the line holds a quoted multi-segment prefix?

Usage: literal_check.py <clone> <commit> <static-sites.json>

Re-reads each listed file's line at <commit> and applies the published LITERAL regex and a corrected one that admits '-' inside the
prefix. Prints the totals and the neverSeen files (apps/, packages/) whose label changes.
"""
import json
import re
import subprocess
import sys

clone, commit, static_path = sys.argv[1:4]
static = json.load(open(static_path))
PUBLISHED = re.compile(r'''['"`]([A-Za-z0-9._]+[-_])(?=['"`]|\$\{)''')
CORRECTED = re.compile(r'''['"`]([A-Za-z0-9._][A-Za-z0-9._-]*[-_])(?=['"`]|\$\{)''')
total = none = recovered = mismatch = 0
changed_files = {}
for f, sites in static['files'].items():
    text = subprocess.run(['git', 'show', f'{commit}:{f}'], cwd=clone, capture_output=True, check=True).stdout.decode('utf-8', 'replace').splitlines()
    for s in sites:
        total += 1
        line = text[s['line'] - 1]
        p = PUBLISHED.search(line)
        if (p.group(1) if p else None) != s['literal']:
            mismatch += 1
        if s['literal'] is None:
            none += 1
            c = CORRECTED.search(line)
            if c:
                recovered += 1
                changed_files.setdefault(f, set()).add(c.group(1))
print('sites', total, 'literalNone', none, 'noneButCorrectedRegexFindsAPrefix', recovered, 'publishedRegexDisagreesWithRecord', mismatch,
      'filesAffected', len(changed_files))
for f in sorted(changed_files):
    if f.split('/')[0] in ('apps', 'packages'):
        print(' ', f, sorted(changed_files[f]))
