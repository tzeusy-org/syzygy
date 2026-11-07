#!/usr/bin/env python3
"""Run each fixture-using test file of the POC app project alone under a fresh
private TMPDIR and count the syzygy-poc-surface-fixture-* directories it leaves.

Usage: leak_by_file.py <repo-tree> <tree-commit> <scratch-tmp-root> <out.json>

Population: every tracked `*.test.ts` under apps/three-surface-poc/src whose text
names `test-model-fixture` or `polaris-accessibility-variants` (the latter
imports the fixture helper), found by `git grep -l -F` in <repo-tree>. The
denominator, every `*.test.ts` of that directory, is recorded beside it. Each
file gets its own TMPDIR directory, which is removed after it has been counted.
A directory whose name starts `syzygy-poc-surface-fixture-template-` is the
per-file template; any other `syzygy-poc-surface-fixture-*` is a copy.
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

repo, commit, tmp_root, out = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve()
PROJECT = '@syzygy/three-surface-poc-app'
SRC = 'apps/three-surface-poc/src'


def tracked(*args: str) -> list[str]:
    return subprocess.run(['git', '-C', str(repo), *args], capture_output=True, text=True, check=True).stdout.split()


all_tests = [f for f in tracked('ls-files', SRC) if f.endswith('.test.ts')]
using = sorted(set(tracked('grep', '-l', '-F', '-e', 'test-model-fixture', '-e', 'polaris-accessibility-variants', '--', SRC)) & set(all_tests))
results = []
for index, file in enumerate(using):
    scratch = tmp_root / f'f{index:02d}'
    shutil.rmtree(scratch, ignore_errors=True)
    scratch.mkdir(parents=True)
    proc = subprocess.run(['npx', 'vitest', 'run', file, '--project', PROJECT], cwd=repo, env={**os.environ, 'TMPDIR': str(scratch)}, capture_output=True, text=True)
    text = proc.stdout + proc.stderr
    summary = [line.strip() for line in text.splitlines() if re.match(r'\s*(Test Files|Tests)\s', line)]
    left = sorted(p.name for p in scratch.iterdir())
    fixture = [n for n in left if n.startswith('syzygy-poc-surface-fixture-')]
    results.append({
        'file': file,
        'exit': proc.returncode,
        'summary': summary,
        'templatesLeft': sum(1 for n in fixture if n.startswith('syzygy-poc-surface-fixture-template-')),
        'copiesLeft': sum(1 for n in fixture if not n.startswith('syzygy-poc-surface-fixture-template-')),
        'otherEntriesLeft': len(left) - len(fixture),
    })
    print(file, results[-1]['exit'], results[-1]['copiesLeft'], results[-1]['templatesLeft'], flush=True)
    shutil.rmtree(scratch, ignore_errors=True)
record = {
    'tool': 'leak_by_file.py',
    'treeCommit': commit,
    'project': PROJECT,
    'testFilesInDirectory': len(all_tests),
    'fixtureUsingTestFiles': len(using),
    'filesWithCopiesLeft': sum(1 for r in results if r['copiesLeft'] > 0),
    'filesWithTemplatesLeft': sum(1 for r in results if r['templatesLeft'] > 0),
    'copiesLeftTotal': sum(r['copiesLeft'] for r in results),
    'templatesLeftTotal': sum(r['templatesLeft'] for r in results),
    'nonzeroExits': [r['file'] for r in results if r['exit'] != 0],
    'results': results,
}
out.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: v for k, v in record.items() if k != 'results'}, indent=1))
