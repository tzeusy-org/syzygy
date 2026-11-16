"""syzygy-bpyt.8.33: which snapshot field fails the link row. Apply one mutant's fix-side edits, as a record from mutants.py stores them,
run launched.test.ts once with vitest's default reporter and no colour, restore the bytes and check their digests, and print every diff
line of the row `a symbolic link to the marker Syzygy writes`'s failure block that names a snapshot field. The full output is written to <out.txt>.
Usage: python3 field_diff.py <worktree> <record.json> <mutant id> <out.txt>   (TMPDIR names the file system under test)"""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path

root, record_file, mutant_id, out = Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3], Path(sys.argv[4])
record = json.loads(Path(record_file).read_text())
edits = next(m for m in record['mutants'] if m['id'] == mutant_id and m['tests'] == 'fix')['edits']
originals = {e['file']: (root / e['file']).read_bytes() for e in edits}
try:
    for e in edits:
        text = (root / e['file']).read_text()
        assert text.count(e['old']) == 1, e['file']
        (root / e['file']).write_text(text.replace(e['old'], e['new']))
    run = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', 'packages/polaris-dossier/src/launched.test.ts'], cwd=root,
                         env={**os.environ, 'CI': '1', 'NO_COLOR': '1', 'FORCE_COLOR': '0'}, capture_output=True, text=True, timeout=300)
finally:
    for file, data in originals.items():
        (root / file).write_bytes(data)
text = run.stdout + run.stderr
out.write_text(text)
restored = all(hashlib.sha256((root / f).read_bytes()).digest() == hashlib.sha256(d).digest() for f, d in originals.items())
# The row's own failure block: from its FAIL header to the next separator line.
header = ' FAIL  |@syzygy/polaris-dossier| packages/polaris-dossier/src/launched.test.ts > launch forms in a run whose marker is unreadable > ' \
         'count neither a declared form nor a syzygy-launched one: a symbolic link to the marker Syzygy writes\n'
section = text.split(header, 1)[1].split('\u23af\u23af\u23af', 1)[0] if text.count(header) == 1 else ''
fields = [line.strip() for line in section.split('\n') if re.match(r'\s*[-+]\s+"(mode|ino|size|ctimeNs|targetCtimeNs|link|bytes)"', line)]
print(json.dumps({'mutant': mutant_id, 'exit': run.returncode, 'restored': restored, 'linkRowDiffLines': fields}))
