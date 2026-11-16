"""Independent reviewer sweep (rev-530): is any changed file's base digest (sha256 of the blob, full or as a
12+ hex prefix) or git blob id (full or 12+ prefix) cited anywhere in the tracked tree at the base?
Usage: digest_citers.py <repo> <base> <head>"""
import hashlib, re, subprocess, sys, json
repo, base, head = sys.argv[1:4]
g = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True).stdout
changed = [n for n in g('diff', '--name-only', '-z', base, head).decode().split('\0') if n]
ids = {}
for p in changed:
    r = subprocess.run(['git', '-C', repo, 'rev-parse', f'{base}:{p}'], capture_output=True, text=True)
    if r.returncode: continue
    blob = g('cat-file', 'blob', f'{base}:{p}')
    ids[p] = {'sha256': hashlib.sha256(blob).hexdigest(), 'blob': r.stdout.strip()}
tracked = [n for n in g('ls-tree', '-r', '-z', '--name-only', base).decode().split('\0') if n]
HEX = re.compile(rb'(?<![0-9a-fA-F])[0-9a-f]{12,64}(?![0-9a-fA-F])')
tokens = {}
for n in tracked:
    data = g('cat-file', 'blob', f'{base}:{n}')
    for m in HEX.finditer(data):
        tokens.setdefault(m.group(0).decode(), set()).add(n)
hits = []
for p, d in ids.items():
    for kind, full in d.items():
        for tok, files in tokens.items():
            if len(tok) >= 12 and full.startswith(tok):
                hits.append({'file': p, 'kind': kind, 'token': tok[:12] + '…', 'len': len(tok), 'citers': sorted(files)})
print(json.dumps({'changedFilesExistingAtBase': len(ids), 'trackedFilesScanned': len(tracked), 'distinctHexTokens12to64': len(tokens), 'hits': hits}, indent=1))
