"""Apply the record's R-chmod-cycle-rewrite fragment to the clone's launched.ts, run launched.test.ts once with vitest's default
reporter (to read how a failure names the field), restore and verify the digest. Usage: python3 -I one_mutant_default_reporter.py <clone> <tmpdir> <out.txt>"""
import hashlib, json, os, subprocess, sys
from pathlib import Path
root, tmp, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
rec = json.loads((root / 'docs/evidence/launch-form-snapshot-ctime-mutants-2026-10-23.json').read_text())
e = next(m for m in rec['mutants'] if m['id'] == 'R-chmod-cycle-rewrite' and m['tests'] == 'fix')['edits'][0]
f = root / e['file']; orig = f.read_bytes(); assert orig.decode().count(e['old']) == 1
try:
    f.write_bytes(orig.decode().replace(e['old'], e['new']).encode())
    r = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', 'packages/polaris-dossier/src/launched.test.ts'], cwd=root,
                       env={**os.environ, 'CI': '1', 'TMPDIR': tmp, 'NO_COLOR': '1', 'FORCE_COLOR': '0'}, capture_output=True, text=True, timeout=300)
    out.write_text(r.stdout + r.stderr)
finally:
    f.write_bytes(orig)
print('restored', hashlib.sha256(f.read_bytes()).hexdigest() == hashlib.sha256(orig).hexdigest(), 'exit', r.returncode)
