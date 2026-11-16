"""cite_lookup.py: the reviewer's own reading of what a kept site's citations hold (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 cite_lookup.py <repo> <census-head.json> <site>...   (site = path:line, as the census keys it)
Independent of citation_audit.py: for each cited JSON record (read at the census commit) it lists every key or string
value that contains the site's title (placeholders `${..}`/%s match anything; case-sensitive), with the JSON path and
every numeric sibling in the same object; and, separately, how many strings name the site's file name. For each cited
commit it prints the message lines and added lines that carry a duration (N ms, N s, N.N s, N-M s) and whether the
commit touches the site's file. It decides nothing; a human reads the output against ruling 6.
"""
import json, re, subprocess, sys

repo, census_path, *keys = sys.argv[1:]
census = json.load(open(census_path))
commit = census['commit']
sites = {f"{s['path']}:{s['line']}": s for s in census['sites']}
DUR = re.compile(r'\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s?(?:ms|s)\b')
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True).stdout

def title_re(t):
    t = t[1:-1] if t.startswith('`') and t.endswith('`') else t
    parts = re.split(r'(\$\{[^}]*\}|%[sdifjoc#%]|\$[A-Za-z_][\w.]*)', t)
    return re.compile(''.join('.*' if i % 2 else re.escape(p) for i, p in enumerate(parts)))

def walk(node, path, hits, tre, fname, counts):
    if isinstance(node, dict):
        nums = {k: v for k, v in node.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
        for k, v in node.items():
            for s in ([k] + ([v] if isinstance(v, str) else [])):
                if tre and tre.search(s):
                    hits.append({'at': path + [k], 'string': s[:160], 'numericSiblings': nums if s is not k else
                                 ({k: v} if isinstance(v, (int, float)) else {kk: vv for kk, vv in v.items() if isinstance(vv, (int, float))} if isinstance(v, dict) else {})})
                if fname in s: counts['file'] += 1
            walk(v, path + [k], hits, tre, fname, counts)
    elif isinstance(node, list):
        for i, v in enumerate(node): walk(v, path + [i], hits, tre, fname, counts)
    elif isinstance(node, str) and fname in node:
        counts['file'] += 1

for key in keys:
    s = sites[key]
    print('=' * 100)
    print(key, s['kind'], 'value', s.get('valueMs'), '| title:', (s.get('title') or '(none)')[:150])
    print('  reason:', (s.get('reason') or {}).get('text', '')[:400])
    tre = title_re(s['title']) if s.get('title') else None
    fname = s['path'].split('/')[-1] if s['kind'] != 'config' else s['path'].split('/')[-2]
    for p in s['citations']['measurements']:
        try: doc = json.loads(git('show', f'{commit}:{p}'))
        except ValueError: print('  record', p, ': not JSON'); continue
        hits, counts = [], {'file': 0}
        walk(doc, [], hits, tre, fname, counts)
        print(f'  record {p}: title hits {len(hits)}, strings naming {fname!r}: {counts["file"]}')
        for h in hits[:6]: print('    ', json.dumps(h)[:400])
    for c in s['citations']['commits']:
        msg = git('show', '-s', '--format=%B', c)
        added = [l[1:] for l in git('show', '--format=', c).splitlines() if l.startswith('+') and not l.startswith('+++')]
        files = git('show', '--format=', '--name-only', c).split()
        print(f'  commit {c}: touches the file: {s["path"] in files}')
        for l in msg.splitlines():
            if DUR.search(l): print('     msg|', l.strip()[:200])
        for l in added:
            if DUR.search(l) and ('timeout' in l.lower() or 'default' in l.lower() or 'took' in l.lower() or ' s ' in l or 'ms' in l): print('     add|', l.strip()[:200])
