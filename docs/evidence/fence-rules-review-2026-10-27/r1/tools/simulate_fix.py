#!/usr/bin/env python3
"""Simulate the owner-ruled G1 fix (syzygy-bpyt.16: inside maskMarkdownCodeContexts a line ends at CRLF, CR or LF; every
terminator and offset kept) in a scratch clone, run fence-rules.test.ts, list what fails, then restore the file.
Usage: simulate_fix.py <clone> <out.json>. A prototype for the reviewer's question only; never committed."""
import json
import re
import subprocess
import sys

clone, out = sys.argv[1:3]
path = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
full = f'{clone}/{path}'
src = open(full, encoding='utf8').read()
edits = [
    ("  const lines = text.split('\\n');\n",
     "  const parts = text.split(/(\\r\\n|\\r|\\n)/);\n  const lines: string[] = [];\n  const terms: string[] = [];\n"
     "  for (let i = 0; i < parts.length; i += 2) { lines.push(parts[i] ?? ''); terms.push(parts[i + 1] ?? ''); }\n"),
    ("  return { kind: 'masked', masked: out.join('\\n'), fences, spans };",
     "  return { kind: 'masked', masked: out.map((l, i) => l + (terms[i] ?? '')).join(''), fences, spans };"),
]
mutated = src
for old, new in edits:
    assert mutated.count(old) == 1, old
    mutated = mutated.replace(old, new)
open(full, 'w', encoding='utf8').write(mutated)
try:
    done = subprocess.run(['npx', 'vitest', 'run', 'apps/three-surface-poc/src/fence-rules.test.ts', 'packages/three-surface-poc-core/src/markdown-code-context.test.ts', 'packages/three-surface-poc-core/src/git-object-reader.test.ts'], cwd=clone, capture_output=True, text=True, timeout=900)
    text = done.stdout + done.stderr
    failed = sorted(set(re.findall(r'^\s*(?:FAIL|×)\s+(.+?)(?:\s+\d+ms)?$', text, re.M)))
    errors = sorted(set(re.findall(r'→ (\S+ \S+: expected .+?)(?: //|$)', text, re.M)))
    summary = [l.strip() for l in text.split('\n') if re.match(r'^\s*(Tests|Test Files)\s', l)][-2:]
finally:
    subprocess.run(['git', '-C', clone, 'checkout', '--', path], check=True)
json.dump({'edits': edits, 'exit': done.returncode, 'summary': summary, 'failed': failed, 'vectorErrors': errors}, open(out, 'w'), indent=1)
print(json.dumps({'exit': done.returncode, 'summary': summary, 'failedCount': len(failed)}, indent=1))
