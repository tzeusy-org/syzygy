#!/usr/bin/env python3
"""Apply the record's K1/K2 consent mutants (k-mutants.jsonl) one at a time in a scratch clone and run the reviewer's
public-API probe test (zz-rev533-consent.test.ts) against each. Usage: k_pin_mutants.py <clone> <k-mutants.jsonl> <out.json>"""
import json
import os
import re
import subprocess
import sys

clone, spec, out = sys.argv[1:4]
TEST = 'packages/polaris-generation-consent/src/zz-rev533-consent.test.ts'
rows = []
for line in open(spec):
    m = json.loads(line)
    full = os.path.join(clone, m['file'])
    text = open(full, encoding='utf8').read()
    n = text.count(m['old'])
    row = {'id': m['id'], 'old': m['old'], 'new': m['new'], 'oldCount': n, 'commit': subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()}
    if n == 1:
        open(full, 'w', encoding='utf8').write(text.replace(m['old'], m['new']))
        try:
            done = subprocess.run(['npx', 'vitest', 'run', TEST], cwd=clone, capture_output=True, text=True, timeout=900)
            t = done.stdout + done.stderr
            row.update({'exit': done.returncode, 'killed': done.returncode != 0,
                        'rev533Line': next((l.strip() for l in t.split('\n') if 'REV533' in l), None),
                        'summary': [l.strip() for l in t.split('\n') if re.match(r'^\s*(Tests|Test Files)\s', l)][-2:]})
        finally:
            subprocess.run(['git', '-C', clone, 'checkout', '--', m['file']])
    rows.append(row)
    print(m['id'], row.get('killed'), row.get('rev533Line'), flush=True)
json.dump(rows, open(out, 'w'), indent=1)
