#!/usr/bin/env python3
"""Round-3 exact-text check for PR 555: is each round-2 text (F1, F2, N1, N2) applied as round 2 wrote it?

Usage: exact-texts.py <clone> <round-2 raw> <frozen PR body file> <reviewed commit> <round-2 commit>
Texts are cut from the round-2 raw and the round-2 patch by regex or by line, never retyped, then searched for in
`git show <commit>:<file>` (or the body), as is and with whitespace folded. Prints one JSON object.
"""
import json
import re
import subprocess
import sys

clone, raw_path, body_path, head, prev = sys.argv[1:6]
raw = open(raw_path, encoding='utf-8').read()
body = open(body_path, encoding='utf-8').read()
CORE = 'packages/three-surface-poc-core/src/'


def show(commit, path):
    return subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], capture_output=True, text=True, check=True).stdout


def fold(text):
    return re.sub(r'\s+', ' ', text).strip()


def count(text, hay):
    return {'exact': hay.count(text), 'folded': fold(hay).count(fold(text))}


items = []

# F1: the replacement block in the raw's fenced "with" block, and the patch's added lines.
blocks = re.findall(r'```ts\n(.*?)```', raw, flags=re.S)
old_block, new_block = blocks[0], blocks[1]
added = [l[1:] for l in open(raw_path.rsplit('/', 1)[0] + '/tools/order-assertion.patch', encoding='utf-8').read().split('\n')
         if l.startswith('+') and not l.startswith('+++')]
ext_head, ext_prev = show(head, CORE + 'project-shape-extraction.test.ts'), show(prev, CORE + 'project-shape-extraction.test.ts')
items.append({'id': 'F1 raw block', 'new@head': count(new_block, ext_head), 'new@r2': count(new_block, ext_prev)})
items.append({'id': 'F1 patch added lines', 'lines': len(added), 'eachOnceAtHead': [ext_head.count(l + '\n') for l in added]})

# F2 step 1: build-record.py text, cut from the raw's step-1 line pair.
step1 = re.search(r'1\. `build-record\.py:100`: replace `(.*?)` with `(.*?)`', raw, flags=re.S)
old1, new1 = step1.group(1), fold(step1.group(2))
br_head = show(head, 'docs/evidence/syzygy-bpyt-1-18/build-record.py')
items.append({'id': 'F2.1 build-record.py', 'old@head': count(old1, br_head), 'new@head': count(new1, br_head), 'newText': new1})

# F2 step 2: PR body text; the raw escapes the inner backticks inside a code span.
step2 = re.search(r'2\. PR body: replace `(.*?)` with `(.*?)`\.\n', raw, flags=re.S)
old2, new2 = fold(step2.group(1).replace('\\`', '`')), fold(step2.group(2).replace('\\`', '`'))
items.append({'id': 'F2.2 PR body', 'old@body': count(old2, body), 'new@body': count(new2, body), 'newText': new2})

# N1: the mask canary's three code lines, with the size the raw names, in the reader and model describes.
mask_head = show(head, CORE + 'markdown-code-context.test.ts')
m = re.search(r"\n(  it\('one spread call over 200,002 arguments.*?\n  \}\);\n)", mask_head, flags=re.S)
canary = m.group(1)
for label, path, size, describe in (
        ('N1 reader', 'git-object-reader.test.ts', 'LONG_LINES + 2', "describe('a 200,000-line closed fence under the read limit (GP-B2 Q1)'"),
        ('N1 model', 'project-shape-model.test.ts', '200_002', "describe('a very long fence or list does not abort the observation'")):
    text = show(head, CORE + path)
    want = canary.replace('LINES + 2', size)
    at, start = text.find(want), text.find(describe)
    nxt = text.find('\ndescribe(', start + 1)
    items.append({'id': label, 'count': text.count(want), 'insideDescribe': start >= 0 and start < at and (nxt < 0 or at < nxt)})

# N2: the countsAt text, cut from the raw.
n2 = re.search(r"add `('countsAt': .*?)` to each", raw).group(1)
items.append({'id': 'N2 countsAt', 'count@head': br_head.count(n2), 'text': n2})

print(json.dumps({'items': items, 'nbspInRaw': raw.count(chr(0xa0)), 'nbspInBody': body.count(chr(0xa0))}, indent=1))
