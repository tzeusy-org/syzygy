#!/usr/bin/env python3
"""Reviewer's own mutants of assemble_census.py, scored against its fixture (the --classify-fixture output of the unmutated file).

Usage: my_mutants.py <assemble_census.py> <scratch-dir> <out.json>

Each mutant replaces one fragment that occurs exactly once in the code above `def selftest(`. A mutant is killed when its
--classify-fixture output differs from the unmutated output (which the committed self-test shows equals EXPECTED) or it stops.
The mutated copies are kept in <scratch-dir> for a full-data rerun.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

src_path, scratch, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
source = src_path.read_text()
code = source[:source.index('def selftest(')]
MUTANTS = {
    'r9-all-test-files-to-any': ("and all(TEST_FILE.search(f) for f in files),", "and any(TEST_FILE.search(f) for f in files),"),
    'r6-tree-clause-dropped': ("\n     and all(f.startswith('apps/') or f.startswith('packages/') or f.startswith('scripts/') for f in files),", ","),
    'testkit-suffix-not-a-test-file': ("|\\.testkit\\.ts$')", "')"),
    'creating-file-from-last-row': ("return {innermost_file(rows[:1])} if rows else set()", "return {innermost_file(rows[-1:])} if rows else set()"),
    'exposure-upper-adds-no-gap': ("slot['upper'] += seen['last'] - seen['first'] + exposure_interval", "slot['upper'] += seen['last'] - seen['first']"),
}
scratch.mkdir(parents=True, exist_ok=True)
base = subprocess.run([sys.executable, '-I', str(src_path), '--classify-fixture'], capture_output=True, text=True, timeout=60)
expected = json.loads(base.stdout)
record = {'tool': 'my_mutants.py', 'subjectSha256': hashlib.sha256(source.encode()).hexdigest(), 'mutants': {}}
for name, (old, new) in MUTANTS.items():
    assert code.count(old) == 1 or (name == 'exposure-upper-adds-no-gap' and source.count(old) == 1), (name, code.count(old))
    path = scratch / f'mutant_{name.replace("-", "_")}.py'
    path.write_text(source.replace(old, new, 1))
    ran = subprocess.run([sys.executable, '-I', str(path), '--classify-fixture'], capture_output=True, text=True, timeout=60)
    try:
        answer = json.loads(ran.stdout)
    except json.JSONDecodeError:
        answer = None
    record['mutants'][name] = {'old': old, 'new': new, 'killed': answer != expected, 'exit': ran.returncode,
                               'diverges': None if answer is None else sorted(k for k in expected if answer.get(k) != expected[k]), 'copy': str(path)}
out.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({n: m['killed'] for n, m in record['mutants'].items()}))
