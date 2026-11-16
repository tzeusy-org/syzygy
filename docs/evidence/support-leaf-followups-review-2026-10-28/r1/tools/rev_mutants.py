#!/usr/bin/env python3
"""Reviewer mutants for PR 554 (syzygy-bpyt.46), round 1. Usage: rev_mutants.py <clone> <out.json> <tmpdir> [id ...]
Each row: (id, test files, edits, predicted outcome). Edits are exact {path, old, new}; each old must occur exactly once.
Reviewer fragments U5, V9 (fix-check-r2.json set N) and R2 (6.14 residuals-head.json) are read from the committed records by id."""
import hashlib, json, os, subprocess, sys

PURITY = 'packages/support/src/support-purity.test.ts'
SHA = 'packages/support/src/sha256.ts'
DRAFTER_TEST = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'
DRAFTER = 'packages/three-surface-poc-core/src/owner-act-drafter.ts'
REACH_TEST = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
REACH_KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
ALIASES_TEST = 'packages/polaris-generation-core/src/root-vitest-aliases.test.ts'
CONFIG = 'vitest.config.ts'
DOSSIER_PKG = 'packages/polaris-dossier/package.json'
FIX_CHECK_R2 = 'docs/evidence/support-leaf-guards-review-2026-10-28/r2/fix-check-r2.json'
RESIDUALS_614 = 'docs/evidence/syzygy-bpyt-6-14/residuals-head.json'

def e(path, old, new): return {'path': path, 'old': old, 'new': new}

CASE_INSENSITIVE = e(DRAFTER_TEST, '.filter((name) => !DRAFTER_IDENTIFIERS.has(name))',
                     '.filter((name) => ![...DRAFTER_IDENTIFIERS].some((allowed) => allowed.toLowerCase() === name.toLowerCase()))')
DRAFTER_MAP = e(DRAFTER, "import { sha256 } from '@syzygy/support';\n", "import { sha256 } from '@syzygy/support';\nexport const cache = new Map<string, string>();\n")
STRING_ONLY = e(REACH_KIT, "if (JSON.stringify(entry).includes('/../'))", "if (typeof entry === 'string' && entry.includes('/../'))")
DOTDOT_CHECK = "      if (JSON.stringify(entry).includes('/../')) throw new Error(`${specifier}: its entry has a /../ segment, which Node refuses`);\n"
E1 = e(REACH_KIT, DOTDOT_CHECK, '')
E4 = e(DOSSIER_PKG, '"import": "./dist/state-directory.js"', '"import": "./dist/x/../state-directory.js"')
E4_UNIFORM = e(DOSSIER_PKG, '''      "types": "./dist/state-directory.d.ts",
      "import": "./dist/state-directory.js",
      "default": "./dist/state-directory.js"''', '''      "types": "./dist/state-directory.d.ts",
      "import": "./dist/x/../state-directory.js",
      "default": "./dist/x/../state-directory.js"''')
SUPPORT_ALIAS = "'@syzygy/support': fileURLToPath(new URL('./packages/support/src/index.ts', import.meta.url)),"
ALIAS_TO_CAP1 = e(CONFIG, SUPPORT_ALIAS, SUPPORT_ALIAS.replace('./packages/support/src/index.ts', './packages/cap1-core/src/index.ts'))
BASENAME = [e(ALIASES_TEST, "[specifier, relative(ROOT, target).split(sep).join('/')]", "[specifier, target.split(sep).pop()]"),
            e(ALIASES_TEST, '[specifier, entries[specifier]]', "[specifier, entries[specifier]?.split('/').pop()]")]
NO_OBJECT_ARM = e(PURITY, 'ts.isPropertyAssignment(property) ? targets(property.initializer) : ts.isSpreadAssignment(property) ? targets(property.expression) : []', '[]')
NO_DEFAULT_ARM = e(PURITY, "      : ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? targets(node.left)\n", '')
NO_PAREN_ARM = e(PURITY, '      : ts.isParenthesizedExpression(node) ? targets(node.expression)\n', '')
SRC_TAIL = "  return createHash('sha256').update(value).digest('hex');\n}\n"
DEFAULT_WRITE = e(SHA, SRC_TAIL, SRC_TAIL + '[Object.freeze = (value) => value] = [];\n')
PAREN_WRITE = e(SHA, SRC_TAIL, SRC_TAIL + '(Object.freeze) = (value) => value;\n')
NESTED_WRITE = e(SHA, SRC_TAIL, SRC_TAIL + '({ value: [Object.freeze] } = { value: [(bytes) => bytes] });\n')
LITERAL_ONLY = e(PURITY, 'if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)',
                 'if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0]!))')
NO_RECURSION = e(PURITY, "calls.push(`${file}: ${node.getText(source)}`);\n        ts.forEachChild(node, visit);", "calls.push(`${file}: ${node.getText(source)}`);")
NO_IMPORT_EQUALS = e(PURITY, "      : ts.isImportEqualsDeclaration(statement) && ts.isExternalModuleReference(statement.moduleReference) ? statement.moduleReference.expression\n", '')
TOOLS = os.path.dirname(os.path.abspath(__file__))
fix = lambda name: open(os.path.join(TOOLS, name)).read()
FIX_OBJECT_ROW = e(REACH_TEST, "    expect(() => entryModulesIn(workspace({}, './dist/x/../index.js'))).toThrow('@syzygy/lib: its entry has a /../ segment, which Node refuses');\n",
                   "    expect(() => entryModulesIn(workspace({}, './dist/x/../index.js'))).toThrow('@syzygy/lib: its entry has a /../ segment, which Node refuses');\n" + fix('fix-f2-object-entry-row.ts.txt'))
IMPORT_ROW_OLD = None  # read from the clone in rows(): the head's import() row, from its title to the next row
WRITE_ROWS_ANCHOR = "    ['let a = 1; a += 1; [a] = [2];', []],\n"
FIX_W = e(PURITY, WRITE_ROWS_ANCHOR, fix('fix-n-write-rows.ts.txt') + WRITE_ROWS_ANCHOR)
WRITES_END = "  visit(file);\n  return writes;\n}\n"
WRITE_DESCRIBE_END = "    expect(propertyWritesOf('case.ts', source)).toEqual(expected);\n  });\n});\n"
NO_SPREAD_ARM = e(PURITY, 'targets(ts.isSpreadElement(element) ? element.expression : element)', 'targets(element)')
NO_RECURSION_FIXED = e(PURITY, 'calls.push(node.getText(file));\n    ts.forEachChild(node, visit);', 'calls.push(node.getText(file));')
SPREAD_WRITE = e(SHA, SRC_TAIL, SRC_TAIL + '[...Object.freeze] = [];\n')
MAP_ONLY = e(DRAFTER, "import { sha256 } from '@syzygy/support';\n", "import { sha256 } from '@syzygy/support';\nvoid new Map();\n")

DOTDOT_ROW = "    expect(() => entryModulesIn(workspace({}, './dist/x/../index.js'))).toThrow('@syzygy/lib: its entry has a /../ segment, which Node refuses');\n"
PROBE_DOT_AND_TYPES = e(REACH_TEST, DOTDOT_ROW, DOTDOT_ROW
    + "    expect(entryModulesIn(workspace({}, './dist/./index.js'))['@syzygy/lib']).toBe('packages/lib/src/index.ts');\n"
    + "    expect(() => entryModulesIn(workspace({}, { types: './dist/x/../index.d.ts', import: './dist/index.js' }))).toThrow('@syzygy/lib: its entry has a /../ segment, which Node refuses');\n")

def fix_i(clone):
    text = open(os.path.join(clone, PURITY)).read()
    a = text.index("  it('calls no import() in any source"); b = text.index("  it('names none of the forbidden tokens")
    return [e(PURITY, WRITES_END, WRITES_END + fix('fix-n-import-reader.ts.txt')), e(PURITY, text[a:b], fix('fix-n-import-row.ts.txt') + '\n'),
            e(PURITY, WRITE_DESCRIBE_END, WRITE_DESCRIBE_END + fix('fix-n-import-reader-rows.ts.txt'))]

CLONE = sys.argv[1] if len(sys.argv) > 1 else '.'
LIVE = "      '@syzygy/polaris-generation-core/live': fileURLToPath(new URL('./packages/polaris-generation-core/src/live.ts', import.meta.url)),\n"
CORE = "      '@syzygy/polaris-generation-core': fileURLToPath(new URL('./packages/polaris-generation-core/src/index.ts', import.meta.url)),\n"
REORDER = e(CONFIG, LIVE + CORE, CORE + LIVE)
UNSHADOW = e(CONFIG, "      '@syzygy/polaris-dossier': fileURLToPath(new URL('./packages/polaris-dossier/src/index.ts', import.meta.url)),\n", '')
ARGV_ALIAS = e(CONFIG, "      '@syzygy/polaris-dossier': fileURLToPath(", "      '@syzygy/polaris-dossier/argv': fileURLToPath(new URL('./packages/polaris-dossier/src/argv.ts', import.meta.url)),\n      '@syzygy/polaris-dossier': fileURLToPath(")

def v8(clone):
    rows = json.load(open(os.path.join(clone, 'docs/evidence/support-leaf-guards-review-2026-10-28/r2/r2-mutants-absent.json')))['rows']
    return next(r['edits'] for r in rows if r['id'] == 'V8-local-re-export-of-createHash')

def fix_f3(clone):
    return e(ALIASES_TEST, open(os.path.join(clone, ALIASES_TEST)).read(), fix('fix-f3-root-vitest-aliases.test.ts.txt'))

def rows(fn, res):
    FI = fix_i(CLONE)
    return [
        ('X1-drafter-allowlist-case-insensitive', [DRAFTER_TEST], [CASE_INSENSITIVE], 'survives'),
        ('X2-dotdot-check-reads-only-string-entries', [REACH_TEST, ALIASES_TEST], [STRING_ONLY], 'survives'),
        ('X2b-X2-plus-a-uniform-dotdot-entry-in-the-workspace', [ALIASES_TEST], [STRING_ONLY, E4_UNIFORM], 'survives'),
        ('X2c-control-uniform-dotdot-entry-at-head', [ALIASES_TEST], [E4_UNIFORM], 'killed by both root-alias rows'),
        ('X2d-E1-plus-E4-the-lane-row-under-a-dropped-check', [ALIASES_TEST], [E1, E4], 'killed (by the unreadable-entry throw)'),
        ('X2e-E1-plus-the-uniform-entry', [ALIASES_TEST], [E1, E4_UNIFORM], 'survives'),
        ('X2f-proposed-object-row-under-X2', [REACH_TEST], [FIX_OBJECT_ROW, STRING_ONLY], 'killed by the /../ row'),
        ('X2g-proposed-object-row-unmutated', [REACH_TEST], [FIX_OBJECT_ROW], 'passes'),
        ('X2h-proposed-object-row-under-E1', [REACH_TEST], [FIX_OBJECT_ROW, E1], 'killed by the /../ row'),
        ('X3-alias-pin-compares-basenames-plus-alias-to-another-index', [ALIASES_TEST], [*BASENAME, ALIAS_TO_CAP1], 'survives'),
        ('X3c-control-alias-to-another-index-at-head', [ALIASES_TEST], [ALIAS_TO_CAP1], 'killed by the alias row'),
        ('X4-write-reader-object-pattern-arm-dropped', [PURITY], [NO_OBJECT_ARM], 'survives'),
        ('X4b-X4-plus-U5', [PURITY], [NO_OBJECT_ARM, *fn['FN-U5']], 'survives'),
        ('X4c-nested-object-array-pattern-at-head', [PURITY], [NESTED_WRITE], 'killed by the no-write row'),
        ('X5-write-reader-default-arm-dropped-plus-default-write', [PURITY], [NO_DEFAULT_ARM, DEFAULT_WRITE], 'survives'),
        ('X5c-control-default-write-at-head', [PURITY], [DEFAULT_WRITE], 'killed by the no-write row'),
        ('X6-write-reader-paren-arm-dropped-plus-paren-write', [PURITY], [NO_PAREN_ARM, PAREN_WRITE], 'survives'),
        ('X6c-control-paren-write-at-head', [PURITY], [PAREN_WRITE], 'killed by the no-write row'),
        ('X7-import-row-reads-only-literal-arguments-plus-R2', [PURITY], [LITERAL_ONLY, *res['R2-dynamic-import-with-a-space-of-an-allowed-name']], 'survives'),
        ('X8-import-row-without-recursion-plus-V9', [PURITY], [NO_RECURSION, *fn['FN-V9']], 'survives'),
        ('X10-probe-dot-segment-accepted-and-types-dotdot-refused', [REACH_TEST], [PROBE_DOT_AND_TYPES], 'passes (both expectations hold)'),
        ('X1d-X1-plus-Map-alone', [DRAFTER_TEST], [CASE_INSENSITIVE, MAP_ONLY], 'survives'),
        ('X1e-control-Map-alone-at-head', [DRAFTER_TEST], [MAP_ONLY], 'killed by the drafter allowlist row'),
        ('X11-control-spread-write-at-head', [PURITY], [SPREAD_WRITE], 'killed by the no-write row'),
        ('X12-write-reader-spread-arm-dropped-plus-spread-write', [PURITY], [NO_SPREAD_ARM, SPREAD_WRITE], 'survives'),
        ('FX0-fix-W-and-I-unmutated', [PURITY], [FIX_W, *FI], 'passes'),
        ('FX-X4-fix-under-object-arm-dropped', [PURITY], [FIX_W, *FI, NO_OBJECT_ARM], 'killed by the object reader row alone'),
        ('FX-X6-fix-under-paren-arm-dropped', [PURITY], [FIX_W, *FI, NO_PAREN_ARM], 'killed by the paren reader row alone'),
        ('FX-X12-fix-under-spread-arm-dropped', [PURITY], [FIX_W, *FI, NO_SPREAD_ARM], 'killed by the spread reader row alone'),
        ('FX-X7-fix-under-literal-only', [PURITY], [FIX_W, *FI, LITERAL_ONLY], 'killed by the computed-specifier reader row alone'),
        ('FX-X8-fix-under-no-recursion', [PURITY], [FIX_W, *FI, NO_RECURSION_FIXED], 'killed by the three import() reader rows'),
        ('FX-V9-fix-still-kills-V9', [PURITY], [FIX_W, *FI, *fn['FN-V9']], 'killed by the import() row alone'),
        ('FX-U5-fix-still-kills-U5', [PURITY], [FIX_W, *FI, *fn['FN-U5']], 'killed by the no-write row alone'),
        ('X13-head-config-reordered-so-core-shadows-live', [ALIASES_TEST], [REORDER], 'survives (the alias rows read a map, not an order)'),
        ('X15-head-correct-alias-added-for-a-left-out-entry', [ALIASES_TEST], [ARGV_ALIAS], 'killed by the left-out row (an unlisted refusal)'),
        ('FX3-0-fix-unmutated', [ALIASES_TEST], [fix_f3(CLONE)], 'passes'),
        ('FX3-reorder', [ALIASES_TEST], [fix_f3(CLONE), REORDER], 'killed by the own-alias-first row alone'),
        ('FX3-unshadow', [ALIASES_TEST], [fix_f3(CLONE), UNSHADOW], 'killed by the unaliased row and the shadow row'),
        ('FX3-A3-still-killed', [ALIASES_TEST], [fix_f3(CLONE), e(CONFIG, "      '@syzygy/support': fileURLToPath(new URL('./packages/support/src/index.ts', import.meta.url)),\n", '')], 'killed by the unaliased row'),
        ('X16-drafter-write-to-its-input-residual', [DRAFTER_TEST], [e(DRAFTER, "import { sha256 } from '@syzygy/support';\n", "import { sha256 } from '@syzygy/support';\nvoid ((input: DraftInput) => { input.claims.length = 0; });\n")], 'passes (the disclosed residual)'),
        ('X17-V8-local-re-export-of-createHash-residual', [PURITY], v8(CLONE), 'passes (the disclosed residual)'),
        ('X18-probe-target-ending-in-dotdot', [REACH_TEST], [e(REACH_TEST, DOTDOT_ROW, DOTDOT_ROW + "    expect(() => entryModulesIn(workspace({}, './dist/..'))).toThrow('@syzygy/lib: its entry is not a ./dist/X.js whose src/X.ts exists');\n")], 'passes (refused by the unreadable-entry throw)'),
        ('X9-module-reader-import-equals-arm-dropped', [PURITY], [NO_IMPORT_EQUALS], 'killed by one module-reader row'),
    ]

def main(make_rows=None):
    clone, out, tmpdir, *only = sys.argv[1:]
    make_rows = make_rows or rows
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == '', 'clean clone'
    fn = {r['id']: r['edits'] for r in json.load(open(os.path.join(clone, FIX_CHECK_R2)))['sets']['N']['rows']}
    res = {r['id']: r['edits'] for r in json.load(open(os.path.join(clone, RESIDUALS_614)))['rows']}
    dist = sorted(f'{p}/{n}/dist' for p in ['apps', 'packages'] for n in os.listdir(os.path.join(clone, p)) if os.path.isdir(os.path.join(clone, p, n, 'dist')))
    results = []
    for rid, tests, edits, predicted in make_rows(fn, res):
        if only and rid not in only: continue
        originals = {}
        for ed in edits:
            p = os.path.join(clone, ed['path'])
            text = originals.get(ed['path']) and open(p).read() or open(p).read()
            originals.setdefault(ed['path'], open(p).read())
            assert text.count(ed['old']) == 1, (rid, ed['path'], text.count(ed['old']))
            open(p, 'w').write(text.replace(ed['old'], ed['new']))
        try:
            jout = os.path.join(tmpdir, 'v.json')
            if os.path.exists(jout): os.remove(jout)
            load = open('/proc/loadavg').read().split()[0]
            proc = subprocess.run(['npx', 'vitest', 'run', *tests, '--reporter=json', f'--outputFile={jout}'], cwd=clone,
                                  env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=900)
        finally:
            for path, text in originals.items(): open(os.path.join(clone, path), 'w').write(text)
        d = json.load(open(jout)) if os.path.exists(jout) else None
        failed = [] if d is None else [{'name': t['fullName'], 'message': (t.get('failureMessages') or [''])[0].splitlines()[0][:300]}
                                       for f in d['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
        filemsgs = [] if d is None else [f['message'].splitlines()[0][:300] for f in d['testResults'] if f.get('message')]
        row = {'id': rid, 'tests': tests, 'edits': edits, 'predicted': predicted, 'exit': proc.returncode, 'load1': load,
               'passed': d and d['numPassedTests'], 'failed': failed, 'fileMessages': filemsgs}
        results.append(row)
        print(rid, 'exit', proc.returncode, 'passed', row['passed'], 'failed', [f['name'] for f in failed], filemsgs, flush=True)
    status = git('status', '--porcelain')
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'dist': dist, 'statusAfter': status,
               'records': {p: hashlib.sha256(open(os.path.join(clone, p), 'rb').read()).hexdigest() for p in [FIX_CHECK_R2, RESIDUALS_614]},
               'rows': results}, open(out, 'w'), indent=1)
    print('status after', repr(status))

if __name__ == '__main__':
    main()
