"""R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1: which snapshot field fails the link row under one of the reviewer's mutants, at the fix.
Applies the mutant's edits as stored in a rev523_mutants.py result (fix side), runs launched.test.ts once with the default reporter and
no colour, restores the bytes and checks their digests, and prints the +/- lines of the link row's failure block.
Usage: python3 -I field_diff_own.py <clone> <result.json> <mutant id> <out.txt>   (TMPDIR names the file system under test)"""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path

root, res, mid, out = Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3], Path(sys.argv[4])
edits = next(r for r in json.loads(Path(res).read_text())['runs'] if r['id'] == mid and r['side'] == 'fix')['edits']
originals = {e['file']: (root / e['file']).read_bytes() for e in edits}
try:
    for e in edits:
        text = (root / e['file']).read_text()
        assert text.count(e['old']) == 1
        (root / e['file']).write_text(text.replace(e['old'], e['new']))
    run = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', 'packages/polaris-dossier/src/launched.test.ts'], cwd=root,
                         env={**os.environ, 'CI': '1', 'NO_COLOR': '1', 'FORCE_COLOR': '0'}, capture_output=True, text=True, timeout=300)
finally:
    for f, d in originals.items():
        (root / f).write_bytes(d)
text = run.stdout + run.stderr
out.write_text(text)
restored = all(hashlib.sha256((root / f).read_bytes()).digest() == hashlib.sha256(d).digest() for f, d in originals.items())
header = ('count neither a declared form nor a syzygy-launched one: a symbolic link to the marker Syzygy writes\n')
section = text.split(header, 1)[1].split('⎯⎯⎯', 1)[0] if header in text else ''
lines = [l.strip() for l in section.split('\n') if re.match(r'\s*[-+]\s+"', l)]
print(json.dumps({'mutant': mid, 'exit': run.returncode, 'restored': restored, 'tmpdir': os.environ.get('TMPDIR'), 'linkRowDiffLines': lines}))
