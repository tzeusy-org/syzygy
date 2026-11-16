#!/usr/bin/env python3
"""Reviewer's wider governed sweep for PR 533. Usage: governed_sweep.py <repo> <commit>
Population: tracked files under openspec/, .syzygy/governance/{policies,declarations,contracts}/, docs/polaris-generation/,
docs/PWB-IMPLEMENTATION-PLAN.md, docs/POLARIS-GENERATION-IMPLEMENTATION-PLAN.md, docs/plans/; paths containing round-,
/history/ or /reviews/ set aside (the lane's population as its record states it).
Regex (Python re, re.I, per line): CRLF|carriage|line[- ]ending|line terminator|\\r\\n|code span|inline code|inline span
Prints, per file, the hit lines; and the population size."""
import json
import re
import subprocess
import sys

repo, commit = sys.argv[1:3]
RX = re.compile(r'CRLF|carriage|line[- ]ending|line terminator|\\r\\n|code span|inline code|inline span', re.I)
PREFIXES = ('openspec/', '.syzygy/governance/policies/', '.syzygy/governance/declarations/', '.syzygy/governance/contracts/',
            'docs/polaris-generation/', 'docs/PWB-IMPLEMENTATION-PLAN.md', 'docs/POLARIS-GENERATION-IMPLEMENTATION-PLAN.md', 'docs/plans/')
raw = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], check=True, capture_output=True).stdout
paths = [p.decode('utf8') for p in raw.split(b'\0') if p]
pop = [p for p in paths if p.startswith(PREFIXES) and 'round-' not in p and '/history/' not in p and '/reviews/' not in p]
hits = {}
unreadable = 0
for p in pop:
    blob = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{p}'], check=True, capture_output=True).stdout
    try:
        text = blob.decode('utf8')
    except UnicodeDecodeError:
        unreadable += 1
        continue
    rows = [f'{i}: {l.strip()[:200]}' for i, l in enumerate(text.split('\n'), 1) if RX.search(l)]
    if rows:
        hits[p] = rows
print(json.dumps({'commit': commit, 'population': len(pop), 'unreadable': unreadable, 'filesWithAHit': len(hits), 'hits': hits}, indent=1))
