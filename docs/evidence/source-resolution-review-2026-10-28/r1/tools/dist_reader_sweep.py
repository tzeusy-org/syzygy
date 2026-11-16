#!/usr/bin/env python3
"""Sweep a checkout's tracked code, config and workflow files for every line that names a `dist` path or an alias.

Usage: dist_reader_sweep.py <checkout> <out.json>
Population: tracked files under apps/, packages/, scripts/, .github/, plus root *.json, *.ts, *.mjs, *.js, whose suffix is
one of .ts .mts .cts .js .mjs .cjs .json .yml .yaml .py .sh. Predicates (Python re, per line):
  DIST  = r'(?<![\w-])dist(?![\w-])'   a `dist` path segment or word
  ALIAS = r'\balias\b'                 any alias key or word
Each hit is listed with file, line and text; the caller classifies them.
"""
import json, re, subprocess, sys

root, out = sys.argv[1:3]
DIST = re.compile(r'(?<![\w-])dist(?![\w-])')
ALIAS = re.compile(r'\balias\b')
SUFFIXES = ('.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.py', '.sh')
files = subprocess.run(['git', '-C', root, 'ls-files', '-z'], capture_output=True, text=True).stdout.split('\0')
population = [f for f in files if f and f.endswith(SUFFIXES) and (
    f.startswith(('apps/', 'packages/', 'scripts/', '.github/')) or '/' not in f)]
population = [f for f in population if not f.startswith('docs/')]
hits = []
for f in population:
    try:
        text = open(f'{root}/{f}', encoding='utf-8').read()
    except (UnicodeDecodeError, FileNotFoundError):
        continue
    for n, line in enumerate(text.split('\n'), 1):
        for name, pattern in (('dist', DIST), ('alias', ALIAS)):
            if pattern.search(line):
                hits.append({'file': f, 'line': n, 'predicate': name, 'text': line.strip()[:240]})
files_hit = sorted({h['file'] for h in hits})
json.dump({'populationFiles': len(population), 'hitLines': len(hits), 'filesHit': files_hit, 'hits': hits}, open(out, 'w'), indent=1)
print(len(population), 'files;', len(hits), 'hit lines in', len(files_hit), 'files')
for f in files_hit:
    print(f, sum(1 for h in hits if h['file'] == f))
