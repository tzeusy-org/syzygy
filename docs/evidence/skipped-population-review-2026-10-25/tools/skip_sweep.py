#!/usr/bin/env python3
"""rev-527: skip-form sweep over the tracked files of packages/cap1-system/src at a commit, by Python re.

usage: python3 -I skip_sweep.py CLONE COMMIT

Patterns (case-sensitive, per line):
  modifier  \\b(it|test|describe|suite)\\.(skip|skipIf|runIf|todo|only|each|for|concurrent|sequential|fails)\\b
  runtime   \\b(ctx|context|t|task)\\.skip\\s*\\(   and a bare  (?<![.\\w])skip\\s*\\(
  guarded   a registration (it|test|describe|suite)( or .modifier( preceded on the same line by `if (`, `? `, `&& ` or `: `
  aliased   = (it|test|describe|suite)(\\.\\w+)*\\s*;  or  (it|test|describe|suite)\\s*\\?   (a registration function picked by value)
"""
import re, subprocess, sys

clone, commit = sys.argv[1], sys.argv[2]
files = [f for f in subprocess.run(['git', 'ls-tree', '-r', '-z', '--name-only', commit, 'packages/cap1-system/src/'], cwd=clone,
                                   capture_output=True, text=True, check=True).stdout.split('\0') if f]
P = {
    'modifier': re.compile(r'\b(it|test|describe|suite)\.(skip|skipIf|runIf|todo|only|each|for|concurrent|sequential|fails)\b'),
    'runtime': re.compile(r'\b(ctx|context|t|task)\.skip\s*\(|(?<![.\w])skip\s*\('),
    'guarded': re.compile(r'(if\s*\(.*\)\s*|\?\s*|&&\s*|:\s*)\b(it|test|describe|suite)(\.\w+)*\s*\('),
    'aliased': re.compile(r'=\s*(it|test|describe|suite)(\.\w+)*\s*;|\b(it|test|describe|suite)\s*\?'),
}
total = {k: 0 for k in P}
for f in files:
    text = subprocess.run(['git', 'show', f'{commit}:{f}'], cwd=clone, capture_output=True, text=True, check=True).stdout
    for i, line in enumerate(text.split('\n'), 1):
        for k, rx in P.items():
            if rx.search(line):
                total[k] += 1
                print(f'{k:8} {f.rsplit("/", 1)[1]}:{i}: {line.strip()[:150]}')
print(f'files swept: {len(files)}; hits: {total}')
