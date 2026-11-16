"""syzygy-bpyt.49: rule 6 for record.py here, per check. After the PR 547 round-1 reviewer's site_drop_b39.py
(docs/evidence/guard-pins-notes-review-2026-10-28/r1/tools/): each `problems.append(` site in turn becomes `(lambda *a: None)(` in a
scratch copy, whose --selftest runs over the tree; a site is exercised when at least one entry then survives. record.py does not
read this file's output, since it would be checking its own mutants.
Usage: python3 -I site_drop.py <tree> <scratch dir> <out.json>
"""
import hashlib, json, os, re, subprocess, sys

tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
RECORD = 'docs/evidence/syzygy-bpyt-49/record.py'
OLD, NEW = 'problems.append(', '(lambda *a: None)('
source = open(os.path.join(tree, RECORD)).read()
os.makedirs(scratch, exist_ok=True)
rows = []
for k in [m.start() for m in re.finditer(re.escape(OLD), source)]:
    path = os.path.join(scratch, 'record.py')
    open(path, 'w').write(source[:k] + NEW + source[k + len(OLD):])
    r = subprocess.run(['python3', '-I', path, tree, '--selftest'], capture_output=True, text=True, timeout=1800)
    line = source[:k].count('\n') + 1
    survived = [s.split(' | ')[1] for s in r.stdout.splitlines() if s.startswith('SURVIVED | ')]
    rows.append({'line': line, 'old': source.splitlines()[line - 1], 'new': source.splitlines()[line - 1].replace(OLD, NEW, 1),
                 'exit': r.returncode, 'survived': survived, 'exercised': bool(survived) and r.returncode != 0})
    print(line, 'exercised' if rows[-1]['exercised'] else 'UNEXERCISED', survived, flush=True)
os.remove(os.path.join(scratch, 'record.py'))
json.dump({'record': RECORD, 'recordSha256': hashlib.sha256(source.encode()).hexdigest(), 'sites': len(rows),
           'exercised': sum(r['exercised'] for r in rows), 'rows': rows}, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
