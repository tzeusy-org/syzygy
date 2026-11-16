"""syzygy-bpyt.8.32: write mutants.json, every rule-6 mutant this bead's tests are judged by. The reader mutants R1-R10 are copied
edit for edit from syzygy-bpyt.8.2's specs and the guard mutants GM1 and GM3 from the round-1 review's, each with a new command
that runs only the test file this bead commits for it; the rest are this bead's own. Each `old` must occur exactly once in its
file when mutate.py applies it (it asserts so). Usage: build_mutants.py <tree> <out.json>
"""
import glob, json, os, sys

tree, out = sys.argv[1], sys.argv[2]
READER = os.path.join(tree, 'docs/evidence/syzygy-bpyt-8-2/mutants')
REVIEW = os.path.join(tree, 'docs/evidence/dossier-cli-table-review-2026-10-24/mutants')
ARGV_TS = 'packages/polaris-dossier/src/argv.ts'
TMP = 'TMPDIR=/tmp/la-b832/m CI=1'
VITEST = 'npx vitest run --project @syzygy/polaris-dossier packages/polaris-dossier/src/'
ARGV_TEST = f'{TMP} {VITEST}argv.test.ts'
GUARD_TEST = f'{TMP} {VITEST}subpath-imports.test.ts'
ROW = 'refuses a component below a directory it may not search as unreadable'


def row_test(mutant_id, as_root, expected):
    """state-directory.test.ts with the JSON reporter, then the mode-000 row's status must be `expected`. `as_root` makes
    process.getuid() answer 0 in every test worker (as-root.mjs); it grants no privilege, so the row still sees EACCES if it runs."""
    env = 'NODE_OPTIONS=--import=$EVIDENCE/as-root.mjs ' if as_root else ''
    return (f'{TMP} {env}{VITEST}state-directory.test.ts --reporter=json --outputFile=$OUT/{mutant_id}.json; v=$?; '
            f"python3 $EVIDENCE/row_status.py $OUT/{mutant_id}.json '{ROW}' {expected}; r=$?; exit $((v|r))")


mutants = []
for path in sorted(glob.glob(os.path.join(READER, 'R*.json'))):
    spec = json.load(open(path))
    if spec['id'] == 'R2-short-group-read-as-its-first-option':
        continue  # Written against 856d5c5c; its old fragment is not in argv.ts since, and R2b replaced it. run_record.py records why.
    mutants.append({'id': spec['id'], 'family': 'reader (N1)', 'from': os.path.relpath(path, tree), 'edits': spec['edits'], 'command': ARGV_TEST})
mutants.sort(key=lambda m: int(m['id'].split('-')[0][1:].rstrip('b')) + (0.5 if m['id'].startswith('R2b') else 0))

for name in ('GM1.json', 'GM3.json'):
    path = os.path.join(REVIEW, name)
    spec = json.load(open(path))
    mutants.append({'id': spec['id'], 'family': 'subpath guard (N2)', 'from': os.path.relpath(path, tree),
                    'edits': [{'file': spec['file'], 'old': spec['old'], 'new': spec['new']}], 'command': GUARD_TEST})

MAIN = 'apps/syzygy/src/main.ts'
STATIC = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
OWN_GUARD = [
    ('GM4-entry-imports-the-barrel-eagerly', MAIN, STATIC, STATIC + "const eager = await import('@syzygy/polaris-dossier');\n"),
    ('GM5-barrel-imported-before-the-branches', MAIN, '  const argv = process.argv.slice(2);\n',
     "  const argv = process.argv.slice(2);\n  await import('@syzygy/polaris-dossier');\n"),
    ('GM6-entry-imports-the-package-source-by-path', MAIN, STATIC,
     STATIC + "import { DOSSIER_USAGE } from '../../../packages/polaris-dossier/src/cli.js';\n"),
    ('GM7-entry-re-exports-the-barrel-as-a-namespace', MAIN, STATIC, STATIC + "export * as dossier from '@syzygy/polaris-dossier';\n"),
    ('GM8-state-directory-gains-a-built-in', 'packages/polaris-dossier/src/state-directory.ts', "import * as path from 'node:path';\n",
     "import * as path from 'node:path';\nimport * as os from 'node:os';\n"),
]
for mutant_id, file, old, new in OWN_GUARD:
    mutants.append({'id': mutant_id, 'family': 'subpath guard (N2)', 'from': 'this bead', 'edits': [{'file': file, 'old': old, 'new': new}],
                    'command': GUARD_TEST})

OWN_SPEC = [
    ('S1-valued-name-unchecked', '  for (const name of spec.valued) if (!LONG.test(name)) throw new Error(`argv: the valued option ${name} is not --<name>`);\n', ''),
    ('S2-boolean-and-stop-names-unchecked', '    if (!LONG.test(name) && !SHORT.test(name)) throw', '    if (false) throw'),
    ('S3-stop-names-unchecked', '[...(spec.booleans ?? []), ...(spec.stopAt ?? [])]', '[...(spec.booleans ?? [])]'),
    ('S4-valued-name-may-be-short', 'for (const name of spec.valued) if (!LONG.test(name))', 'for (const name of spec.valued) if (!LONG.test(name) && !SHORT.test(name))'),
    ('S5-long-form-any-double-dash', 'const LONG = /^--[^-=][^=]*$/u;', 'const LONG = /^--/u;'),
    ('S6-short-form-any-single-dash', 'const SHORT = /^-[^-]$/u;', 'const SHORT = /^-/u;'),
    ('S7-short-form-never', 'const SHORT = /^-[^-]$/u;', 'const SHORT = /$^/u;'),
]
for mutant_id, old, new in OWN_SPEC:
    mutants.append({'id': mutant_id, 'family': 'spec guard (N5)', 'from': 'this bead', 'edits': [{'file': ARGV_TS, 'old': old, 'new': new}],
                    'command': ARGV_TEST})

SKIP = f"  it.skipIf(isRoot)('{ROW}'"
for mutant_id, new, as_root, expected in [
    ('K1-root-skip-dropped', f"  it('{ROW}'", True, 'skipped'),
    ('K2-root-skip-inverted', f"  it.skipIf(!isRoot)('{ROW}'", False, 'passed'),
]:
    mutants.append({'id': mutant_id, 'family': 'root skip (N8)', 'from': 'this bead',
                    'edits': [{'file': 'packages/polaris-dossier/src/state-directory.test.ts', 'old': SKIP, 'new': new}],
                    'command': row_test(mutant_id, as_root, expected)})

controls = [
    {'id': 'C0-reader', 'family': 'control', 'edits': [], 'command': ARGV_TEST},
    {'id': 'C0-guard', 'family': 'control', 'edits': [], 'command': GUARD_TEST},
    {'id': 'C0-row-as-user', 'family': 'control', 'edits': [], 'command': row_test('C0-row-as-user', False, 'passed')},
    {'id': 'C0-row-as-root', 'family': 'control', 'edits': [], 'command': row_test('C0-row-as-root', True, 'skipped')},
]
json.dump({'controls': controls, 'mutants': mutants}, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
print(len(controls), 'controls,', len(mutants), 'mutants')
