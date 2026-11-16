"""R-GP-IMPL-HOST-TIDY-1 reviewer tool: every Vitest title (file, full name) of the three projects the PR touches, at two
trees, compared as multisets. Usage: python3 -I titles.py <base tree> <head tree> <tmpdir> <out.json>"""
import collections, json, os, shutil, subprocess, sys

base, head, tmpdir, out = sys.argv[1:5]
PROJECTS = ['@syzygy/three-surface-poc-app', '@syzygy/http-host', '@syzygy/cap1-daemon']


def titles(tree):
    os.makedirs(tmpdir, exist_ok=True)
    f = os.path.join(tmpdir, 'list.json')
    args = ['npx', 'vitest', 'list', f'--json={f}']
    for p in PROJECTS:
        args += ['--project', p]
    r = subprocess.run(args, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=1800)
    rows = json.load(open(f))
    shutil.rmtree(tmpdir, ignore_errors=True)
    return r.returncode, collections.Counter((x['file'].replace(tree.rstrip('/') + '/', ''), x['name']) for x in rows)


eb, b = titles(base)
eh, h = titles(head)
rec = {'base': base, 'head': head, 'exit': [eb, eh], 'titles': [sum(b.values()), sum(h.values())], 'distinct': [len(b), len(h)],
       'added': sorted(map(list, (h - b).keys())), 'removed': sorted(map(list, (b - h).keys())),
       'files': [len({f for f, _ in b}), len({f for f, _ in h})]}
json.dump(rec, open(out, 'w'), indent=1)
print({k: (v if not isinstance(v, list) or len(v) < 4 else len(v)) for k, v in rec.items()})
