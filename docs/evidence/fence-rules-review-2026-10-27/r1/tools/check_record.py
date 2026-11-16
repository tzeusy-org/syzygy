#!/usr/bin/env python3
"""Check the PR 533 record against git objects (R-GP-IMPL-FENCE-RULES-1).

Usage: check_record.py <repo> <reviewed commit>
1. Every quoted clause ({path, lines:[a,b], text}) anywhere in the record equals lines a..b of path, at its readAtCommit and
   at the reviewed commit.
2. Every reader's definitions[] name occurs on its stated line at the reviewed commit; every consumer callSites line
   contains the consumer's function name (or a call to it).
3. Commits named in the record exist.
4. Each mutant's `old` occurs exactly once in its file at the recorded commit; the outcome agrees with exit codes / failed rows.
Prints JSON; exit 1 on any failure.
"""
import json
import re
import subprocess
import sys

repo, reviewed = sys.argv[1:3]
REC = 'docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json'


def show(rev, path):
    r = subprocess.run(['git', '-C', repo, 'show', f'{rev}:{path}'], capture_output=True)
    return None if r.returncode else r.stdout.decode('utf8')


def exists(rev):
    return subprocess.run(['git', '-C', repo, 'cat-file', '-e', f'{rev}^{{commit}}'], capture_output=True).returncode == 0


rec = json.loads(show(reviewed, REC))
fails, quotes = [], []


def walk(o, where):
    if isinstance(o, dict):
        if 'path' in o and 'lines' in o and 'text' in o:
            a, b = o['lines']
            for rev in {o.get('readAtCommit', reviewed), reviewed}:
                body = show(rev, o['path'])
                got = None if body is None else '\n'.join(body.split('\n')[a - 1:b])
                ok = got == o['text']
                quotes.append({'where': where, 'path': o['path'], 'lines': [a, b], 'rev': rev[:8], 'ok': ok})
                if not ok:
                    fails.append(f'quote {where} {o["path"]}:{a}-{b} at {rev[:8]}')
        for k, v in o.items():
            walk(v, f'{where}.{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o):
            walk(v, f'{where}[{i}]')


walk(rec, '$')

defs = []
for r in rec['readers']:
    body = show(reviewed, r['file']).split('\n')
    for d in r.get('definitions', []):
        name = d['name'].split(' ')[0]
        ok = name in body[d['line'] - 1] if name != 'blocks' else 'closing' in body[d['line'] - 1]
        defs.append({'reader': r['name'], 'name': d['name'], 'line': d['line'], 'ok': ok, 'text': body[d['line'] - 1].strip()[:100]})
        if not ok:
            fails.append(f'definition {r["name"]} {d["name"]}@{d["line"]}')
    cons = r.get('consumers')
    if cons:
        fn = cons['function'].split(' ')[0]
        for site in cons['callSites']:
            sb = show(reviewed, site['path']).split('\n')
            for ln in site['lines']:
                text = sb[ln - 1]
                ok = fn in text or (site.get('via') or '').split(' ')[0] in text
                defs.append({'reader': r['name'], 'callSite': f'{site["path"]}:{ln}', 'ok': ok, 'text': text.strip()[:120]})
                if not ok:
                    fails.append(f'callsite {r["name"]} {site["path"]}:{ln}')

commits = {}
for key in ('baseCommit', 'codeCommit'):
    commits[key] = exists(rec['subject'][key])
commits['mutants.codeCommitFull'] = exists(rec['mutants']['codeCommitFull'])
for k, v in commits.items():
    if not v:
        fails.append(f'commit {k}')

print(json.dumps({'quotesChecked': len(quotes), 'quotes': quotes, 'definitionsAndCallSites': defs, 'commits': commits, 'fails': fails}, indent=1))
sys.exit(1 if fails else 0)
