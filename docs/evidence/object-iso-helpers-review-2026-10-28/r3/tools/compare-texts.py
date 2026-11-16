#!/usr/bin/env python3
"""Round-3 reviewer comparison for PR #548: the round-2 raw's prescribed Fix A and N2 texts against the head bytes.
Usage: compare-texts.py <round-2 raw> <clone at the head> <PR body file>"""
import json, re, subprocess, sys

raw_path, repo, body_path = sys.argv[1:]
raw = open(raw_path, encoding='utf8').read()
body = open(body_path, encoding='utf8').read()
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
ws = lambda s: re.sub(r'\s+', ' ', s).strip()
out = {}

# 1. The three test lines: the first fenced block after "Exact fix: Fix A", each line stripped of the two-space list indent.
fa = raw[raw.index('**Exact fix: Fix A'):raw.index('**Exact fix: Fix B')]
block = re.search(r'\n  ```\n((?:[^\n]*\n)+?)  ```\n', fa).group(1)
want = [l[2:] if l.startswith('  ') else l for l in block.rstrip('\n').split('\n')]
test = git('show', 'HEAD:packages/three-surface-poc-core/src/authority-artifact-fields.test.ts').split('\n')
at = [i for i, l in enumerate(test) if l == want[0]]
out['testLines'] = {'prescribedLines': len(want), 'foundAtLine': [i + 1 for i in at], 'equal': len(at) == 1 and test[at[0]:at[0] + 3] == want}
old = git('show', '4d92ac95:packages/three-surface-poc-core/src/authority-artifact-fields.test.ts').split('\n')
out['testLines']['replacedOldLines68to70'] = old[67:70] != test[67:70] and test[67:70] == want

# 2. The PR body N8 bullet: the quoted text after "PR body, replace the whole N8 bullet with:".
m = re.search(r'PR body, replace the whole N8 bullet with: "(.*?)"\n- In `build-record', fa, re.S)
want_n8 = ws(m.group(1))
line = [l for l in body.split('\n') if l.startswith('- N8')]
out['n8Bullet'] = {'bodyN8Lines': len(line), 'equal': len(line) == 1 and ws(line[0]) == want_n8}

# 3. The record reading: the raw's replacement text, against the record value and the build-record.py literal.
m = re.search(r'replace the text from "None of the mutants run" to the end of the\s+`reading` with: "(.*?)"\n', fa, re.S)
want_r = ws(m.group(1))
rec = json.loads(git('show', 'HEAD:docs/evidence/syzygy-bpyt-6-3-iso/dc4-object-and-iso-helpers-2026-10-28.json'))['mutants']['repairRows']['reading']
rec_old = json.loads(git('show', '4d92ac95:docs/evidence/syzygy-bpyt-6-3-iso/dc4-object-and-iso-helpers-2026-10-28.json'))['mutants']['repairRows']['reading']
cut = rec_old.index('None of the mutants run')
out['reading'] = {'prefixKept': rec.startswith(rec_old[:cut]), 'tailEqual': rec[cut:] == want_r, 'tailEqualWs': ws(rec[cut:]) == want_r,
                  'rawHasStraightApostrophes': "lane's" in want_r and "review's" in want_r}
src = git('show', 'HEAD:docs/evidence/syzygy-bpyt-6-3-iso/build-record.py')
lit = [l for l in src.split('\n') if l.lstrip().startswith("'reading': 'The a-number row")]
out['reading']['buildRecordLiteralLines'] = len(lit)
if len(lit) == 1:
    import ast
    value = ast.literal_eval('{' + lit[0].strip().rstrip(',') + '}')['reading']
    out['reading']['literalEvaluatesToRecord'] = value == rec
    out['reading']['escapesInLiteral'] = lit[0].count("\\'")

# 4. N2: the AGENTS.md text, and nothing else in AGENTS.md changed.
m = re.search(r'- Fix for a follow-up: "(.*?)"\.?\n', raw, re.S)
want_n2 = ws(m.group(1))
agents = ws(git('show', 'HEAD:AGENTS.md'))
out['n2'] = {'present': want_n2 in agents, 'occurrences': agents.count(want_n2)}
d = git('diff', '-U0', '4d92ac95', '2df14d7d', '--', 'AGENTS.md')
hunks = re.findall(r'^@@ .*$', d, re.M)
minus = [l[1:] for l in d.split('\n') if l.startswith('-') and not l.startswith('---')]
plus = [l[1:] for l in d.split('\n') if l.startswith('+') and not l.startswith('+++')]
out['n2']['hunks'] = hunks
out['n2']['minusPlusEqualOutsideN2'] = ws(' '.join(minus)).replace(ws('the one plain-object test `isRecord`'), 'X') == ws(' '.join(plus)).replace(ws('the shared object test `isRecord` (non-null, not an array; it does not check the prototype)'), 'X')
print(json.dumps(out, indent=1))
