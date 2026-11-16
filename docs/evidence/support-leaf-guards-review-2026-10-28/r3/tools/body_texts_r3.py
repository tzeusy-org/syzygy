#!/usr/bin/env python3
"""Round 3: are round 2's quoted PR-body texts (each the line between the outer backticks of a `> `...`` block in the raw's
section 4) and the coordinator's N3 line (repair-r2.md item 5) present in the PR body verbatim, as whole lines, and in the
places the repair list names? Also checks the "All seven" change, its appended sentence, the N5 battery line, and that the
replaced R2 text is gone.

Usage: body_texts_r3.py <round-2 raw> <repair-r2.md> <body> <out.json>
"""
import json, re, sys

raw_path, repair_path, body_path, out = sys.argv[1:5]
raw = open(raw_path, encoding='utf8').read()
sec4 = raw[raw.index('## 4. Findings'):raw.index('## 5.')]
quoted = [m.group(1) for m in re.finditer(r'^\s*> `(.*)`\s*$', sec4, re.M)]
repair = open(repair_path, encoding='utf8').read()
n3 = next(l.strip() for l in repair.splitlines() if l.strip().startswith('- **The no-write row reads assignment expressions only.**'))
body = open(body_path, encoding='utf8').read()
lines = body.split('\n')


def at(text):
    return [i + 1 for i, l in enumerate(lines) if l == text]


res = {'quotedInRaw': len(quoted), 'nbspInBody': body.count(chr(0xa0)), 'items': []}
names = ['F1-replacement', 'F1-insertion', 'N1-residual']
for name, text in zip(names, quoted):
    res['items'].append({'name': name, 'text': text, 'wholeLineAt': at(text)})
res['items'].append({'name': 'N3-disclosure (repair-r2 item 5)', 'text': n3, 'wholeLineAt': at(n3)})
old_r2 = '  - R2 is `import (value)`, with a space and a computed specifier: `value` is on the list, and neither the reader nor the `import(` token reads a call with a space before the parenthesis.'
res['oldR2Present'] = old_r2 in body
res['allFiveCount'] = body.count('All five need deliberate evasion')
res['allSevenCount'] = body.count('All seven need deliberate evasion')
appended = ' V7 and V9 are observed surviving at `ecea355b` in that review\'s records.'
seven = next((l for l in lines if 'All seven need deliberate evasion' in l), '')
res['appendedAfterResidualsHead'] = ('(`residuals-head.json`).' + appended) in seven and seven.endswith(appended)
res['raw-appended-sentence-in-raw'] = ('" V7 and V9 are observed surviving at `ecea355b` in that review\'s records."' in sec4.replace('\n  ', ' '))
grow = lambda name: next(i['wholeLineAt'] for i in res['items'] if i['name'] == name)
r2_after = [i + 1 for i, l in enumerate(lines) if l.startswith("  - R2's class includes a newline")]
res['order'] = {'R2classLine': r2_after, 'insertionLine': grow('F1-insertion'), 'insertionFollowsR2class': bool(r2_after) and grow('F1-insertion') == [r2_after[0] + 1],
                'sevenLine': [i + 1 for i, l in enumerate(lines) if 'All seven need' in l]}
res['batteryLines'] = [(i + 1, l) for i, l in enumerate(lines) if l.startswith('- Battery')]
res['residualsSection'] = [i + 1 for i, l in enumerate(lines) if l == '## Residuals']
json.dump(res, open(out, 'w'), indent=2)
print(json.dumps(res, indent=2))
