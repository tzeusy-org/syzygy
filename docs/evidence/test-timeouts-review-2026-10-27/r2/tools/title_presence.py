#!/usr/bin/env python3
"""Independent check of ruling 6 for titled tests (round-2 reviewer tool): for each kept titled test site of the census,
whether any cited JSON record carries its title (placeholders %s/%d/$x and template `${...}` parts as wildcards) in a key
or string, and which cite only commits. Sites with no record carrying the title and no commit are listed: each must be a
counted residual or a hand reading the audit names.
usage: python3 -I title_presence.py REPO CENSUS.json DECISIONS.json"""
import json, re, subprocess, sys
repo, census_p, dec_p = sys.argv[1:4]
census = json.load(open(census_p)); blocked = set(json.load(open(dec_p)).get('blocked', []) or [])
blocked |= {'apps/three-surface-poc/src/main.test.ts', 'apps/three-surface-poc/src/polaris-generation/redis-shaped-discovery.test.ts', 'packages/polaris-dossier/src/git-object-reader.test.ts'}
def strings(n):
    if isinstance(n, dict):
        for k, v in n.items(): yield k; yield from strings(v)
    elif isinstance(n, list):
        for v in n: yield from strings(v)
    elif isinstance(n, str): yield n
cache = {}
def rec(p):
    if p not in cache:
        try: cache[p] = list(strings(json.loads(subprocess.run(['git', '-C', repo, 'show', f"{census['commit']}:{p}"], capture_output=True, text=True, check=True).stdout)))
        except Exception: cache[p] = None
    return cache[p]
no_title, commit_only, ok = [], [], 0
for s in census['sites']:
    if s['path'] in blocked or s['kind'] != 'test' or not s.get('title'): continue
    t = s['title'].strip('`\'"')
    parts = [re.escape(x) for x in re.split(r'%[sdif]|\$\{[^}]*\}|\$\w+', t)]
    rx = re.compile('.*'.join(parts))
    recs = s['citations']['measurements']; commits = s['citations']['commits']
    hit = [p for p in recs if rec(p) and any(rx.search(x) for x in rec(p))]
    if hit: ok += 1
    elif commits: commit_only.append((f"{s['path']}:{s['line']}", commits))
    else: no_title.append((f"{s['path']}:{s['line']}", recs))
print('kept titled test sites with a cited record carrying the title:', ok)
print('carried by a commit citation only:', len(commit_only)); [print('  ', x) for x in commit_only]
print('no record carries the title and no commit cited:', len(no_title)); [print('  ', x) for x in no_title]
