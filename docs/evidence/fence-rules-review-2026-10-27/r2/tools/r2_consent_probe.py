#!/usr/bin/env python3
"""Run zz-rev533b-consent.test.ts (copied into the clone) at HEAD and under single consent mutants, and record each REV533B row.
Usage: r2_consent_probe.py <clone> <out.json>. Each mutant's `old` must occur once; the file is restored after each run."""
import json
import os
import subprocess
import sys

clone, out = sys.argv[1:3]
F = 'packages/polaris-generation-consent/src/package-reader.ts'
TEST = 'packages/polaris-generation-consent/src/zz-rev533b-consent.test.ts'
MUT = {
    'HEAD': [],
    'N1a-title-check-tolerates-cr (the record\'s own fragment)': [("if (!text.startsWith(`${form.title}\\n`)) refuse();", "if (!text.startsWith(form.title)) refuse();")],
    'KC4-section-heading-tolerates-cr': [("const at = lines.map((line, i) => (line === heading ? i : -1)).filter(i => i >= 0);\n  if (at.length !== 1 || source.split('\\n').filter(line => line === heading).length !== 1) return refuse();",
                                          "const at = lines.map((line, i) => (line.replace(/\\r$/, '') === heading ? i : -1)).filter(i => i >= 0);\n  if (at.length !== 1 || source.split('\\n').filter(line => line.replace(/\\r$/, '') === heading).length !== 1) return refuse();")],
}
rows = {}
for name, edits in MUT.items():
    path = os.path.join(clone, F)
    text = open(path, encoding='utf8').read()
    for old, new in edits:
        assert text.count(old) == 1, (name, old)
        text = text.replace(old, new)
    open(path, 'w', encoding='utf8').write(text)
    try:
        done = subprocess.run(['npx', 'vitest', 'run', TEST], cwd=clone, capture_output=True, text=True, timeout=900)
        t = done.stdout + done.stderr
        line = next((l for l in t.split('\n') if 'REV533B ' in l), None)
        rows[name] = {'exit': done.returncode, 'rows': json.loads(line.split('REV533B ', 1)[1]) if line else None}
    finally:
        subprocess.run(['git', '-C', clone, 'checkout', '--', F])
    print(name, json.dumps(rows[name]), flush=True)
status = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout
json.dump({'head': subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(), 'runs': rows,
           'untrackedLeft': status.strip().split('\n')}, open(out, 'w'), indent=1)
