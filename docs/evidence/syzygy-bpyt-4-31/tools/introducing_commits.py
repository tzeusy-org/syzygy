#!/usr/bin/env python3
"""The commit that introduced each explicit timeout a census lists, and what that commit says about it (syzygy-bpyt.4.31).
Evidence tool, not authority; it reads git objects only.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/introducing_commits.py REPO CENSUS.json OUT.json

For each site in CENSUS.json (written by timeout_census.mjs), the introducing commit is the one `git blame -w` names for the line
that carries the timeout value: the timeout expression's own line, or, when the expression is a constant, its declaration line.
For that commit the record keeps its subject, its date and every body line matching TIMING (case-insensitive). A body line matching TIMING is a candidate rationale, read by a person before it is cited;
the tool decides nothing."""
import json, re, subprocess, sys

TIMING = re.compile(r'time ?out|timed out|load(1| average)?\b|\b\d[\d_.,]*\s?(ms|s|seconds?|min(ute)?s?)\b|slow|default|budget|took|under load', re.I)
repo, census_path, out_path = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
census = json.load(open(census_path, encoding='utf8'))
commit = census['commit']

def blame(path, line):
    head = git('blame', '-w', '--porcelain', '-L', f'{line},{line}', commit, '--', path).split('\n')[0]
    return head.split()[0]

cache = {}
def describe(sha):
    if sha not in cache:
        subject, _, body = git('show', '-s', '--format=%s%n%n%b', sha).partition('\n\n')
        cache[sha] = {'commit': sha, 'subject': subject.strip(), 'date': git('show', '-s', '--format=%cs', sha).strip(),
                      'timingLines': [l.strip() for l in body.split('\n') if TIMING.search(l)]}
    return cache[sha]

rows = []
for s in census['sites']:
    path, line = s['path'], s['line']
    c = s.get('constant') or {}
    if c.get('at'):
        path, line = c['at'].rsplit(':', 1)
        line = int(line)
    sha = blame(path, line)
    rows.append({'site': f"{s['path']}:{s['line']}", 'expression': s['expression'], 'valueMs': s['valueMs'], 'kind': s['kind'],
                 'hasReason': s['reason'] is not None, 'blamed': f'{path}:{line}', **describe(sha)})
out = {'tool': 'introducing_commits.py', 'census': census_path.rsplit('/', 1)[-1], 'commit': commit, 'sites': len(rows),
       'commits': len({r['commit'] for r in rows}), 'rows': rows}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1) + '\n')
print(f"{len(rows)} sites, {out['commits']} introducing commits")
