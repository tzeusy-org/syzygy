#!/usr/bin/env python3
"""rev-530: re-run, in isolation and with the same mutant applied, each test file that failed in a whole-suite
mutant run (full_suite_mutants.py), to tell a mutant kill from a host-load failure.

Usage: isolate_rerun.py <clone> <record json> <out json> <tmpdir> <mutant id> <test file> [<test file> ...]
The clone is reset to its HEAD before and after. A file that passes in isolation under the mutant did not kill it.
"""
import json
import os
import re
import subprocess
import sys

clone, record_path, out, tmp, mid = sys.argv[1:6]
files = sys.argv[6:]
row = {r['id']: r for r in json.load(open(record_path))['mutants']['rows']}[mid]
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=clone, capture_output=True, text=True, check=True).stdout.strip()
subprocess.run(['git', 'reset', '-q', '--hard', head], cwd=clone, check=True)
path = os.path.join(clone, row['file'])
text = open(path, encoding='utf-8').read()
assert text.count(row['old']) == 1
open(path, 'w', encoding='utf-8').write(text.replace(row['old'], row['new'], 1))
os.makedirs(tmp, exist_ok=True)
run = subprocess.run(['npx', 'vitest', 'run', '--testTimeout=120000', '--hookTimeout=120000', *files], cwd=clone,
                     capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp})
subprocess.run(['git', 'reset', '-q', '--hard', head], cwd=clone, check=True)
clean = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
summary = [l.strip() for l in clean.splitlines() if re.match(r'\s*(Test Files|Tests)\s', l)]
results = json.load(open(out)) if os.path.exists(out) else []
results.append({'id': mid, 'ranAt': head, 'old': row['old'], 'new': row['new'], 'files': files, 'exit': run.returncode, 'summary': summary})
json.dump(results, open(out, 'w'), indent=1)
print(mid, run.returncode, summary, flush=True)
