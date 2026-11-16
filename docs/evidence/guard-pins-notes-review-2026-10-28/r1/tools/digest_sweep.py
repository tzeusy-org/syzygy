"""Sweep every tracked blob at a commit for digests of given files' bytes at other commits, and for path:line locators.

Usage: python3 -I digest_sweep.py <repo> <commit> <out.json>
For each of the three 8.39 evidence files, take its bytes at OLD (the base) and NEW (the reviewed commit), and search every tracked
blob at <commit> for: the full sha256 (64 hex), its 8-hex prefix, and the git blob id (40 hex) and its 8-hex prefix, all
case-insensitive. Then search for locators: a basename of the three files followed by `:<digits>`, or `line(s) <digits>` within
the same line, and report each with its file and line.
"""
import hashlib, json, re, subprocess, sys

repo, commit, out = sys.argv[1:4]
OLD, NEW = '81862261ddbc2b3c8e8481851f3c27129217d477', '38fa15966db89bfede725fbde8073aef552daf0b'
DIR = 'docs/evidence/syzygy-bpyt-8-39'
FILES = ['record.py', 'npm_alias_probe.py', 'summary.json']
git = lambda *a, inp=None: subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True, input=inp).stdout

needles = {}
for f in FILES:
    for label, c in (('old', OLD), ('new', NEW)):
        data = git('show', f'{c}:{DIR}/{f}')
        s256 = hashlib.sha256(data).hexdigest()
        oid = git('rev-parse', f'{c}:{DIR}/{f}').decode().strip()
        needles[f'{label} {f} sha256'] = s256
        needles[f'{label} {f} sha256[:8]'] = s256[:8]
        needles[f'{label} {f} blob'] = oid
        needles[f'{label} {f} blob[:8]'] = oid[:8]

paths = [p for p in git('ls-tree', '-r', '-z', '--name-only', commit).decode().split('\0') if p]
batch = git('cat-file', '--batch', inp=''.join(f'{commit}:{p}\n' for p in paths).encode())
blobs, i = {}, 0
for p in paths:
    nl = batch.index(b'\n', i)
    header = batch[i:nl].split()
    size = int(header[2])
    blobs[p] = batch[nl + 1:nl + 1 + size]
    i = nl + 1 + size + 1
hits = {k: [] for k in needles}
for p, data in blobs.items():
    text = data.decode('utf-8', 'replace').lower()
    for k, n in needles.items():
        for m in re.finditer(re.escape(n.lower()), text):
            line = text.count('\n', 0, m.start()) + 1
            # a prefix hit inside a longer hex run is reported as such
            s, e = m.start(), m.end()
            longer = (s > 0 and text[s - 1] in '0123456789abcdef') or (e < len(text) and text[e] in '0123456789abcdef')
            hits[k].append({'path': p, 'line': line, 'insideLongerHex': longer})
loc_re = re.compile(r'(record\.py|npm_alias_probe\.py|summary\.json)(?::(\d+(?:[-–]\d+)?)|`?,? (?:at )?lines? (\d+))')
locators = []
for p, data in blobs.items():
    for n, line in enumerate(data.decode('utf-8', 'replace').splitlines(), 1):
        for m in loc_re.finditer(line):
            ctx = line[max(0, m.start() - 60):m.end() + 10]
            locators.append({'path': p, 'line': n, 'match': m.group(0), 'context': ctx})
json.dump({'commit': commit, 'trackedBlobs': len(paths), 'needles': needles, 'hits': hits, 'locators': locators}, open(out, 'w'), indent=1)
print('tracked blobs', len(paths))
for k, v in hits.items():
    print(f'{k}: {len(v)} hits', [(h['path'], h['line'], h['insideLongerHex']) for h in v][:12])
print('locators', len(locators))
