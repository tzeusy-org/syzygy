#!/usr/bin/env python3
"""Reviewer's check (R-GP-IMPL-SPREAD-LOOPS-2): is each round-1 replacement text present, verbatim, in the reviewed bytes?

Usage: exact-texts.py <clone> <commit> <round-1 raw> <pr body file>
Each item is a text copied by this script from the round-1 raw (by a regex over the raw, never retyped), and the file it must
appear in at <commit> (read by `git show`). Two comparisons per item: EXACT (a substring of the file as it is) and NORMALISED
(both sides with `//` comment markers at line starts removed and every whitespace run folded to one space), because the raw's
comment texts are unwrapped prose and the repository wraps comments. Prints one line per item and exits 1 if any item is absent
under both comparisons.
"""
import re, subprocess, sys

clone, commit, raw_path, body_path = sys.argv[1:5]
raw = open(raw_path, encoding='utf8').read()
body = open(body_path, encoding='utf8').read()


def show(path):
    return subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=clone, capture_output=True, text=True, check=True).stdout


def norm(s):
    s = re.sub(r'(?m)^[ \t]*//[ \t]?', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def between(start, end):
    i = raw.index(start)
    j = raw.index(end, i)
    return raw[i + len(start):j]


def backticked_after(anchor, nth=0):
    i = raw.index(anchor)
    found = re.findall(r'`([^`]+)`', raw[i:])
    return found[nth]


CORE = 'packages/three-surface-poc-core/src/'
EV = 'docs/evidence/syzygy-bpyt-1-18/'
items = []
# F1 steps 1-2: PR body; the raw's texts are the second backticked span after "replace `...` with"
f1 = raw[raw.index('**Exact fix.**'):raw.index('### N1')]
spans = re.findall(r'replace `([^`]+)` with\s+`([^`]+)`', f1.replace('\n   ', ' '))
for n, (old, new) in enumerate(spans):
    new = re.sub(r'\s+', ' ', new)
    target = {0: ('BODY', body), 1: ('BODY', body), 2: (EV + 'build-record.py', None), 3: (EV + 'build-record.py', None)}[n]
    items.append((f'F1 step {[1, 2, 3, 5][n]} new', target[0], new, target[1]))
    items.append((f'F1 step {[1, 2, 3, 5][n]} old ABSENT', target[0], re.sub(r'\s+', ' ', old), target[1]))
step4 = re.search(r'`(\{"kind":"observed","shapeJsonBytes".*?\})`', f1, re.S).group(1)
items.append(('F1 step 4 ceiling json', EV + 'ceiling-head-0f0ce073.json', step4, None))
# N1 canary block
canary = re.search(r'```ts\n(.*?)\n```', raw[raw.index('### N1'):], re.S).group(1)
items.append(('N1 canary (mask)', CORE + 'markdown-code-context.test.ts', canary, None))
items.append(('N1 canary (extractor, LINES->BULLETS, 200,002->130,002)', CORE + 'project-shape-extraction.test.ts',
              canary.replace('LINES', 'BULLETS').replace('200,002', '130,002'), None))
# N2
n2 = raw[raw.index('### N2'):raw.index('### N3')]
items.append(('N2 mask comment', CORE + 'markdown-code-context.test.ts', re.search(r'Replace it with: "(.*?)"\n- `project', n2, re.S).group(1), None))
model_spans = re.findall(r'with `([^`]+)`', n2.replace('\n  ', ' '))
for k, s in enumerate(model_spans[:2]):
    items.append((f'N2 model comment {k + 1}', CORE + 'project-shape-model.test.ts', s, None))
# N3
n3 = re.search(r'```\n(- Never hand.*?)\n```', raw, re.S).group(1)
items.append(('N3 AGENTS bullet', 'AGENTS.md', n3, None))
# N4
n4 = raw[raw.index('### N4'):raw.index('### N5')]
for k, s in enumerate(re.findall(r"(, '[^']+'\)\.toBe\(true\);)", n4)):
    items.append((f'N4 message {k + 1}', CORE + ('markdown-code-context.test.ts' if k == 0 else 'git-object-reader.test.ts'), s, None))
# N5
n5 = re.search(r"`(describe\('a 200,000-line closed fence under the read limit \(GP-B2 Q1\)', \(\) => \{)", raw).group(1)
items.append(('N5 describe', CORE + 'git-object-reader.test.ts', n5, None))
# N6
n6 = raw[raw.index('### N6'):raw.index('### N7')]
items.append(('N6 symlink', EV + 'huge-differential-selftest.mjs', re.search(r'`(symlinkSync\(resolve[^`]+)`', n6).group(1), None))
items.append(('N6 baseDist', EV + 'huge-differential-selftest.mjs', re.search(r'`(resolve\(baseDist\))`', n6).group(1), None))
# N8
items.append(('N8 timeout extraction', CORE + 'project-shape-extraction.test.ts', '}, 30_000);', None))
items.append(('N8 timeout model', CORE + 'project-shape-model.test.ts', '}, 30_000);', None))
# N9
n9 = re.search(r'`(expect\(isDeepStrictEqual.*?\.toBe\(true\))`', raw, re.S).group(1)
items.append(('N9 whole slice', CORE + 'project-shape-extraction.test.ts', n9.replace('\\`', '`'), None))

bad = 0
for label, path, text, content in items:
    content = content if content is not None else (body if path == 'BODY' else show(path))
    exact = text in content
    normalised = norm(text) in norm(content)
    want_absent = label.endswith('ABSENT')
    ok = (not exact and not normalised) if want_absent else (exact or normalised)
    bad += not ok
    print(f"{'OK ' if ok else 'BAD'} {label}: exact={exact} normalised={normalised} file={path} chars={len(text)} nbsp={text.count(chr(0xa0))}")
print('items', len(items), 'bad', bad)
sys.exit(1 if bad else 0)
