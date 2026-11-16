"""Check each copied hunk of PR 553 equals the round-1 reviewer's text: the raw's N2/N3 blocks and hook_fix_839.py."""
import re, subprocess, sys
tree = sys.argv[1]
show = lambda rev, p: subprocess.run(['git', '-C', tree, 'show', f'{rev}:{p}'], capture_output=True, text=True, check=True).stdout
raw = show('6f9c0a5b', 'docs/reviews/R-GP-IMPL-GUARD-PINS-NOTES-1-RAW.md')
hook = show('a1b9bde2', 'docs/evidence/guard-pins-notes-review-2026-10-28/r1/tools/hook_fix_839.py')
ns = {}
exec('\n'.join(l for l in hook.splitlines() if l.startswith(('FIXED =', 'ENTRY =', 'ADDED ='))), ns)
r839_base, r839 = show('a1b9bde2', 'docs/evidence/syzygy-bpyt-8-39/record.py'), show('6f9c0a5b', 'docs/evidence/syzygy-bpyt-8-39/record.py')
old = "    since = hooked('since', [p for p in git('diff', '--name-only', REPAIR1, HEAD).split() if not p.startswith(f'{HERE_REL}/')])\n"
want = r839_base.replace(old, ns['FIXED']).replace(ns['ENTRY'], ns['ADDED'])
print('N2 8.39 record.py == base with hook_fix_839 FIXED/ADDED applied:', want == r839, r839_base.count(old), r839_base.count(ns['ENTRY']))
print('N2 FIXED at line', [i + 1 for i, l in enumerate(r839.splitlines(True)) if l == ns['FIXED']])
# N3: the raw's fenced block of seven entries, and the check block, and the eighth entry quoted inline
blocks = re.findall(r'\n  ```python\n(.*?)\n  ```', raw, re.S)
n3 = raw[raw.index('### N3 '):raw.index('### N4 ')]
b = re.findall(r'\n  ```python\n(.*?)\n  ```', n3, re.S)
entries = [l[2:] for l in b[0].split('\n')]
check = [l[2:] for l in b[1].split('\n')]
r39_base, r39 = show('a1b9bde2', 'docs/evidence/syzygy-bpyt-39/record.py'), show('6f9c0a5b', 'docs/evidence/syzygy-bpyt-39/record.py')
lines = r39.splitlines()
print('N3 seven entries:', len(entries), 'each present once:', [lines.count(e) for e in entries])
print('N3 check lines:', len(check), [lines.count(c) for c in check])
eighth = "    'a root-exception trace of another run': {'npmrc-trace-root-exception-probe.json': lambda d: (d.update(recordSha256='0' * 64), d)[1]},"
inline = re.search(r"entry `('a root-exception trace of another run':\s*\{'npmrc-trace-root-exception-probe\.json': lambda d: \(d\.update\(recordSha256='0' \* 64\), d\)\[1\]\})`", n3)
print('N3 eighth entry inline in raw:', bool(inline), 'in record:', lines.count(eighth))
base_lines = r39_base.splitlines()
anchor = "            problems.append(f'npmrc-trace {name}: compared with another record')"
print('check after base :112 anchor:', base_lines.index(anchor) + 1, 'new index of first check line:', lines.index(check[0]) + 1, lines.index(anchor) + 1)
# the whole diff of r39 = exactly these 10 lines added
import difflib
d = [l for l in difflib.unified_diff(base_lines, lines, lineterm='', n=0) if l[:1] in '+-' and not l.startswith(('+++', '---'))]
print('r39 diff lines:', len(d), 'all additions:', all(l.startswith('+') for l in d), 'set == entries+check+eighth:', sorted(l[1:] for l in d) == sorted(entries + check + [eighth]))
