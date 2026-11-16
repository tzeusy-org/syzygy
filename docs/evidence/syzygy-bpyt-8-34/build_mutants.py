"""syzygy-bpyt.8.34: write mutants.json, every rule-6 mutant this bead's tests are judged by. The review's mutants (OR1, OR2, OS1, OS2,
OE1, OE3-OE5, OB1-OB3 and D1-D3, docs/reviews/R-GP-IMPL-ARGV-TABLE-1-RAW.md) are copied edit for edit from its retained results, and
GM1 and GM3 from the 8.2 review's specs, each with a new command that runs only the test files this bead changes; the rest are this
bead's own. Each `old` must occur exactly once in its file, and each `create` must name a file that does not exist, when run_record.py
applies it (it asserts so). Usage: build_mutants.py <tree> <out.json>
"""
import json, os, sys

tree, out = sys.argv[1], sys.argv[2]
REVIEW = 'docs/evidence/argv-table-review-2026-10-25/results'
GUARD_SPECS = 'docs/evidence/dossier-cli-table-review-2026-10-24/mutants'
TMP = 'TMPDIR=/tmp/la-b834/m CI=1'
VITEST = 'npx vitest run --project @syzygy/polaris-dossier'
ARGV_TEST = f'{TMP} {VITEST} packages/polaris-dossier/src/argv.test.ts'
GUARD_TEST = f'{TMP} {VITEST} packages/polaris-dossier/src/subpath-imports.test.ts'
BOTH_GUARDS = (f'{TMP} {VITEST} --project @syzygy/polaris-generation-core packages/polaris-dossier/src/subpath-imports.test.ts '
               'packages/polaris-generation-core/src/island-boundary.test.ts')

review = {m['id']: m for name in ('my-mutants.json', 'phase2-mutants.json') for m in json.load(open(os.path.join(tree, REVIEW, name)))}


def from_review(review_id, mutant_id, family, command, expect='killed'):
    spec = review[review_id]
    source = 'phase2-mutants.json' if review_id.startswith('D') else 'my-mutants.json'
    return {'id': mutant_id, 'family': family, 'from': f'{REVIEW}/{source} {review_id}', 'edits': spec['edits'], 'command': command, 'expect': expect}


mutants = [
    from_review('OR1-missing-value-judged-before-repeat', 'OR1-missing-value-judged-before-repeat', 'reader table (N1)', ARGV_TEST),
    from_review('OR2-empty-value-read-as-missing', 'OR2-empty-value-read-as-missing', 'reader table (N1)', ARGV_TEST),
    from_review('D1-polaris-repeat-refused-project', 'D1-polaris-repeat-refused', 'policy copies (N2)', ARGV_TEST),
    from_review('D2-daemon-repeat-refused-project', 'D2-daemon-repeat-refused', 'policy copies (N2)', ARGV_TEST),
    from_review('D3-dossier-dash-value-taken-project', 'D3-dossier-dash-value-taken', 'policy copies (N2)', ARGV_TEST),
    from_review('OE1-agreement-one-way', 'OE1-agreement-one-way', 'edge finder (N3)', GUARD_TEST),
    from_review('OE3-main-computed-dynamic-import', 'OE3-main-computed-dynamic-import', 'daemon path (N4)', GUARD_TEST),
    from_review('OE4-main-create-require-alias', 'OE4-main-create-require-alias', 'daemon path (N4)', GUARD_TEST),
    from_review('OE5-main-intermediate-local-module', 'OE5-main-intermediate-local-module', 'daemon path (N4)', GUARD_TEST),
    from_review('OS1-guard-after-the-read', 'OS1-guard-after-the-read', 'spec guard (N5)', ARGV_TEST),
    from_review('OS2-long-form-allows-a-trailing-equals', 'OS2-long-form-allows-a-trailing-equals', 'spec guard (N5)', ARGV_TEST),
    from_review('OB1-condition-counts-as-inside', 'OB1-condition-counts-as-inside', 'branch classifier (N6)', GUARD_TEST),
    from_review('OB2-outermost-if-not-nearest', 'OB2-outermost-if-not-nearest', 'branch classifier (N6)', GUARD_TEST),
    # The classifier names the nearest `if` by its condition's text, so a shadowed `argv` evades it; N6 records it as contrived.
    from_review('OB3-shadowed-argv-replaces-the-polaris-branch-import', 'OB3-shadowed-argv-replaces-the-polaris-branch-import',
                'branch classifier (N6, a recorded residual)', GUARD_TEST, expect='survives'),
]
for name in ('GM1.json', 'GM3.json'):
    spec = json.load(open(os.path.join(tree, GUARD_SPECS, name)))
    mutants.append({'id': spec['id'], 'family': 'subpath guard (8.32, still killed)', 'from': f'{GUARD_SPECS}/{name}',
                    'edits': [{'file': spec['file'], 'old': spec['old'], 'new': spec['new']}], 'command': GUARD_TEST, 'expect': 'killed'})

MAIN = 'apps/syzygy/src/main.ts'
STATIC = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
GUARD = 'packages/polaris-dossier/src/subpath-imports.test.ts'
REACH = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
OWN = [
    ('D4-a-new-readArgv-caller', 'policy copies (N2)', ARGV_TEST, [{
        'file': 'packages/polaris-dossier/src/polaris.ts', 'old': 'function parseArgs(argv: readonly string[]): Options | string {\n',
        'new': ("export const rereadArgv = (args: readonly string[]): unknown => readArgv(args, { valued: [], dashValue: 'take', repeat: 'last', positionals: true });\n"
                'function parseArgs(argv: readonly string[]): Options | string {\n')}]),
    ('D5-readArgv-under-another-name-in-a-new-module', 'policy copies (N2)', ARGV_TEST, [{
        'file': 'packages/polaris-dossier/src/argv-alias.ts', 'create': "import { readArgv as read } from './argv.js';\nexport const readAgain = read;\n"}]),
    ('D6-allow-execution-options-change', 'policy copies (N2)', ARGV_TEST, [{
        'file': 'packages/polaris-dossier/src/cli.ts', 'old': "options: ['--revision', '--declare'], noun: RUN", 'new': "options: ['--revision'], noun: RUN"}]),
    ('OE6-main-imports-a-subpath-no-package-exports', 'daemon path (N4)', BOTH_GUARDS, [{
        'file': MAIN, 'old': STATIC, 'new': STATIC + "import '@syzygy/cap1-core/nowhere';\n"}]),
    ('CE1-computed-edge-dropped', 'edge finder (N4)', GUARD_TEST, [{
        'file': GUARD, 'old': "    else edges.push({ specifier: null, form, where: where(literal), edge: `${form} of ${literal.getText(source)} ${where(literal)}` });\n",
        'new': ''}]),
    ('SK1-every-entry-dynamic-import-skipped', 'daemon path (N4)', GUARD_TEST, [{
        'file': GUARD, 'old': "edge.form === 'dynamic import' && BRANCHES.includes(edge.where);", 'new': "edge.form === 'dynamic import';"}]),
    ('SK2-branch-edges-followed', 'daemon path (N4)', GUARD_TEST, [{
        'file': GUARD, 'old': "const branch = (edge: Edge): boolean => module === ENTRY &&", 'new': "const branch = (edge: Edge): boolean => module === '' &&"}]),
    ('RW1-reach-stops-at-the-entry', 'shared reach (N4)', BOTH_GUARDS, [{
        'file': REACH, 'old': '      if (!seen.has(to)) { seen.add(to); queue.push(to); }\n', 'new': '      if (!seen.has(to)) { seen.add(to); }\n'}]),
    ('RW2-workspace-packages-not-followed', 'shared reach (N4)', BOTH_GUARDS, [{
        'file': REACH, 'old': '  const named = /^(@syzygy\\/[^/]+)(\\/.*)?$/u.exec(specifier);\n',
        'new': "  const named = /^(@syzygy\\/[^/]+)(\\/.*)?$/u.exec('');\n"}]),
]
for mutant_id, family, command, edits in OWN:
    mutants.append({'id': mutant_id, 'family': family, 'from': 'this bead', 'edits': edits, 'command': command, 'expect': 'killed'})

controls = [{'id': f'C0-{name}', 'family': 'control', 'from': 'this bead', 'edits': [], 'command': command, 'expect': 'passes'}
            for name, command in (('argv', ARGV_TEST), ('guard', GUARD_TEST), ('both-guards', BOTH_GUARDS))]
json.dump({'controls': controls, 'mutants': mutants}, open(out, 'w'), indent=1, ensure_ascii=False)
open(out, 'a').write('\n')
print(f'{len(controls)} controls, {len(mutants)} mutants')
