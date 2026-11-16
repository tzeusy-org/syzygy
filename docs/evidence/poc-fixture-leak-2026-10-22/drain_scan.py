#!/usr/bin/env python3
"""List the callers of the POC fixture helper and say, per caller, whether a hook drains
the array it hands over.

Usage: drain_scan.py <repo-tree> <tree-commit> <out.json>

Population: every tracked `.ts` file under apps/three-surface-poc/src whose text
contains `test-model-fixture` or `polaris-accessibility-variants` (the second
module builds fixture models for its callers). The helper's own test is excluded
from the caller list and named in the record. A file "creates repositories" when
it calls `fixtureRepoWithGit(`, `buildFixtureModel(`, `sharedFixtureModels(`,
`variantModel(` or `renderVariant(`. For each array identifier handed in as
`cleanups` the scan looks for a drain: `<id>.splice(` or a `for (... of <id>...)`
loop whose body calls `rmSync`, and records which hook (`afterEach`, `afterAll`,
`beforeAll`, or none) wraps the first one found. An identifier the file does not
declare as an array is a parameter: its drain is the caller's, and the record
lists it as `delegated`. For `sharedFixtureModels(...)` bound to a name, a drain is
a `<name>.remove()` call or `<name>.remove` passed to a hook. The result is a static
reading: every file it flags, and every delegated array, is then read by hand
(see the diagnosis record).
"""
import json
import pathlib
import re
import subprocess
import sys

repo, commit, out = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve()
SRC = 'apps/three-surface-poc/src'
files = subprocess.run(['git', '-C', str(repo), 'grep', '-l', '-F', '-e', 'test-model-fixture', '-e', 'polaris-accessibility-variants', '--', SRC], capture_output=True, text=True, check=True).stdout.split()
HELPER = {f'{SRC}/test-model-fixture.ts', f'{SRC}/test-model-fixture.test.ts'}
CALL = re.compile(r'\b(fixtureRepoWithGit|buildFixtureModel)\(\s*([A-Za-z_][A-Za-z0-9_]*)')
VARIANT_CALL = re.compile(r'\b(variantModel|renderVariant)\(([^;]*?),\s*([A-Za-z_][A-Za-z0-9_]*)\)')
SHARED = re.compile(r'(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*sharedFixtureModels\b')
HOOK = re.compile(r'\b(afterEach|afterAll|beforeAll|beforeEach)\(')


def enclosing_hook(text: str, position: int) -> str:
    """The nearest hook call opening before `position` whose parentheses are still open there."""
    best = 'none'
    for match in HOOK.finditer(text, 0, position):
        depth, i = 0, match.end() - 1
        while i < len(text):
            depth += (text[i] == '(') - (text[i] == ')')
            if depth == 0:
                break
            i += 1
        if i >= position:
            best = match.group(1)
    return best


rows = []
for file in sorted(files):
    if file in HELPER:
        continue
    text = (repo / file).read_text()
    arrays = sorted({m.group(2) for m in CALL.finditer(text)} | {m.group(3) for m in VARIANT_CALL.finditer(text)})
    calls = {name: len(re.findall(rf'\b{name}\(', text)) for name in ('fixtureRepoWithGit', 'buildFixtureModel', 'variantModel', 'renderVariant')}
    declared = {a for a in arrays if re.search(rf'(?:const|let)\s+{re.escape(a)}\s*(?::\s*string\[\])?\s*=\s*\[\]', text)}
    shared = SHARED.findall(text)
    drains = {}
    for array in arrays:
        found = 'none' if array in declared else 'delegated'
        for m in re.finditer(rf'\b{re.escape(array)}\.splice\(|for\s*\([^)]*\bof\s+{re.escape(array)}\b', text):
            hook = enclosing_hook(text, m.start())
            if re.search(r'rmSync', text[m.start():m.start() + 400]):
                found = hook
                break
        drains[array] = found
    shared_drains = {}
    for name in shared:
        found = 'none'
        for m in re.finditer(rf'\b{re.escape(name)}\.remove\b', text):
            found = enclosing_hook(text, m.start()) if text[m.end():m.end() + 2] == '()' else f'passed:{enclosing_hook(text, m.start())}'
            break
        shared_drains[name] = found
    creates = sum(calls.values()) > 0 or bool(shared)
    rows.append({
        'file': file,
        'isTest': file.endswith('.test.ts'),
        'createsRepositories': creates,
        'calls': calls,
        'cleanupArrays': arrays,
        'delegatedArrays': sorted(a for a in arrays if drains.get(a) == 'delegated'),
        'arrayDrains': drains,
        'sharedFixtures': shared_drains,
        'noDrainFound': creates and (any(v == 'none' for v in drains.values()) or any(v == 'none' for v in shared_drains.values()) or (not drains and not shared_drains)),
    })
record = {
    'tool': 'drain_scan.py',
    'treeCommit': commit,
    'filesNamingTheHelper': len(files),
    'helperFilesExcluded': sorted(HELPER & set(files)),
    'callers': sum(1 for r in rows if r['createsRepositories']),
    'filesNamingTheHelperButCreatingNothing': [r['file'] for r in rows if not r['createsRepositories']],
    'noDrainFound': [r['file'] for r in rows if r['noDrainFound']],
    'filesWithADelegatedArray': [r['file'] for r in rows if r['delegatedArrays']],
    'rows': rows,
}
out.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: v for k, v in record.items() if k != 'rows'}, indent=1))
