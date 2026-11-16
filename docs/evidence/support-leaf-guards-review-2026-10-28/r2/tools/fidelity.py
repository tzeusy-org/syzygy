"""Fidelity of the round-1 fix texts at the code head.

For each test file: every fix block must occur byte for byte in the file at the code head, and once the blocks and the
stated import or signature lines are accounted for, no other added or removed line may remain.

Usage: python3 -I fidelity.py <clone> <rev-545 tools dir> <base> <code head>
"""
import difflib
import json
import subprocess
import sys

clone, tools, base, head = sys.argv[1:5]


def show(rev: str, path: str) -> str:
    return subprocess.run(['git', '-C', clone, 'show', f'{rev}:{path}'], check=True, capture_output=True, text=True).stdout


def block(name: str) -> str:
    with open(f'{tools}/{name}', encoding='utf-8') as handle:
        return handle.read()


FILES = {
    'packages/support/src/support-purity.test.ts': {
        'blocks': ['fix-f1-function.ts.txt', 'fix-f1-test.ts.txt', 'fix-n-sources.ts.txt', 'fix-n-sources-row.ts.txt',
                   'fix-n-literal.ts.txt', 'fix-n-writes.ts.txt'],
        # The raw's prose: "Add `mkdirSync, mkdtempSync, rmSync, writeFileSync` to the `node:fs` import, plus ..."
        'stated_added': [
            "import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';",
            "import { tmpdir } from 'node:os';",
            "import { dirname, join } from 'node:path';",
            "import { pathToFileURL } from 'node:url';",
        ],
        # The import line the fs import replaces, and the two SOURCES lines (:12-13) fix-n-sources replaces.
        'stated_removed': [
            "import { readdirSync, readFileSync } from 'node:fs';",
            "const SOURCES = readdirSync(SRC, { recursive: true, encoding: 'utf8' })",
            "  .filter((name) => /\\.[cm]?[jt]sx?$/u.test(name) && !name.endsWith('.test.ts') && name !== 'purity.testkit.ts').sort();",
        ],
    },
    'packages/polaris-dossier/src/no-egress.test.ts': {
        'blocks': ['fix-n-guard-row.ts.txt'],
        # The raw's prose for N4: the parameter "and `alias: aliases`".
        'stated_added': [
            'async function bundleDriver(outfile: string, aliases: Record<string, string> = workspaceAliases()): Promise<void> {',
            '    alias: aliases,',
        ],
        'stated_removed': [
            'async function bundleDriver(outfile: string): Promise<void> {',
            '    alias: workspaceAliases(),',
        ],
    },
}

report = {}
for path, spec in FILES.items():
    old, new = show(base, path), show(head, path)
    entry = {'blocks': {}}
    for name in spec['blocks']:
        text = block(name)
        core = text.strip('\n')
        entry['blocks'][name] = {
            'bytes': len(text.encode()),
            'occursVerbatim': new.count(text),
            'occursStripped': new.count(core),
            'inBase': old.count(core),
            'nbsp': text.count(chr(0xa0)),
        }
    diff = list(difflib.unified_diff(old.splitlines(), new.splitlines(), lineterm='', n=0))
    added = [line[1:] for line in diff if line.startswith('+') and not line.startswith('+++')]
    removed = [line[1:] for line in diff if line.startswith('-') and not line.startswith('---')]
    block_lines = []
    for name in spec['blocks']:
        block_lines.extend(block(name).split('\n'))
    unaccounted_added = list(added)
    for line in block_lines + spec['stated_added']:
        if line in unaccounted_added:
            unaccounted_added.remove(line)
    unaccounted_removed = list(removed)
    for line in spec['stated_removed']:
        if line in unaccounted_removed:
            unaccounted_removed.remove(line)
    # A removed line that a block re-adds unchanged (the filter line of fix-n-sources) cancels out of the diff.
    entry.update({
        'added': len(added), 'removed': len(removed),
        'unaccountedAdded': unaccounted_added, 'unaccountedRemoved': unaccounted_removed,
        'nbspInNew': new.count(chr(0xa0)), 'nbspInOld': old.count(chr(0xa0)),
    })
    report[path] = entry

print(json.dumps(report, indent=2))
