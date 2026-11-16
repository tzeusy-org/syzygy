"""Review round 2 of PR 554: the reviewer's own rows, run with syzygy-bpyt.6.14's edit, run and restore steps (imported from the
clone). Each row is (id, test files, edits, prediction); a row's failing set and the first line of each failure message are kept.
Usage: rev_probes.py <clone> <out.json> <tmpdir> <row-id-prefix,...|all>"""
import json, os, subprocess, sys, importlib.util

clone, out_path, tmpdir, which = sys.argv[1:5]
os.makedirs(tmpdir, exist_ok=True)
spec = importlib.util.spec_from_file_location('lane614', os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'))
lane = importlib.util.module_from_spec(spec); spec.loader.exec_module(lane)
edit = lambda path, old, new: {'path': path, 'old': old, 'new': new}

DOSSIER_PKG = 'packages/polaris-dossier/package.json'
SYZYGY_PKG = 'apps/syzygy/package.json'
REACH_KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
PURITY = 'packages/support/src/support-purity.test.ts'
SHA = 'packages/support/src/sha256.ts'
CONFIG = 'vitest.config.ts'
NO_EGRESS = 'packages/polaris-dossier/src/no-egress.test.ts'
REACH_TEST = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
GUARD = 'apps/three-surface-poc/src/sync-child-process-guard.test.ts'
# Every test file that imports the workspace-reach testkit (the importer sweep, static-checks.json).
RW = [NO_EGRESS, 'packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts', REACH_TEST,
      GUARD, 'apps/three-surface-poc/src/product-build.test.ts', 'apps/three-surface-poc/src/git-observation.test.ts']

ST_IMPORT = '      "import": "./dist/state-directory.js",\n      "default": "./dist/state-directory.js"\n'
ST_IMPORT_DD = ST_IMPORT.replace('./dist/state-directory.js', './dist/x/../state-directory.js')
ST_SOURCE = '      "source": "./src/state-directory.ts",\n'
ST_SOURCE_DD = '      "source": "./src/x/../state-directory.ts",\n'
ST_TYPES = '      "types": "./dist/state-directory.d.ts",\n'
ST_TYPES_DD = '      "types": "./dist/x/../state-directory.d.ts",\n'
DOTDOT_CHECK = "      if (JSON.stringify(entry).includes('/../')) throw new Error(`${specifier}: its entry has a /../ segment, which Node refuses`);\n"
E4 = edit(DOSSIER_PKG, ST_IMPORT, ST_IMPORT_DD)                       # the lane's E4: import and default, source unchanged
E4S = edit(DOSSIER_PKG, ST_SOURCE + ST_TYPES + ST_IMPORT, ST_SOURCE_DD + ST_TYPES + ST_IMPORT_DD)  # every condition but types
E1 = edit(REACH_KIT, DOTDOT_CHECK, '')
SSR = "  ssr: { resolve: { conditions: ['source', 'module', 'node', 'development|production'] } },\n"
WRONG = "fileURLToPath(new URL('./packages/polaris-dossier/src/index.ts', import.meta.url))"
RIGHT = "fileURLToPath(new URL('./packages/polaris-dossier/src/argv.ts', import.meta.url))"

ROWS = [
    # Item 5 against the merge base and the head, on every importer of the workspace-reach testkit.
    ('B-E4-lane', RW, [E4], 'base: the source-agreement rule already refuses it'),
    ('B-E4S-all-but-types', RW, [E4S], 'base: ?'),
    ('B-types-only', RW, [edit(DOSSIER_PKG, ST_TYPES, ST_TYPES_DD)], 'base: passes'),
    ('B-main', RW, [edit(SYZYGY_PKG, '"main": "./dist/main.js"', '"main": "./dist/x/../main.js"')], 'base: ?'),
    ('B-string-export', RW, [edit(DOSSIER_PKG, '"./state-directory": {\n' + ST_SOURCE + ST_TYPES + ST_IMPORT + '    }', '"./state-directory": "./dist/x/../state-directory.js"')],
     'base: the exports row refuses an entry with no source condition first'),
    ('H-E4-lane', RW, [E4], 'head: no-egress fails at file level by the /../ throw'),
    ('H-E4S-all-but-types', RW, [E4S], 'head: no-egress fails by the /../ throw'),
    ('H-types-only', RW, [edit(DOSSIER_PKG, ST_TYPES, ST_TYPES_DD)], 'head: no-egress fails by the /../ throw'),
    ('H-main', RW, [edit(SYZYGY_PKG, '"main": "./dist/main.js"', '"main": "./dist/x/../main.js"')], 'head: no-egress fails by the /../ throw'),
    # Mutants of the repaired rows (head).
    ('M1-E1-plus-lane-E4', [NO_EGRESS], [E1, E4], 'killed, by the unreadable-entry throw, not the /../ check'),
    ('M2-E1-plus-E4S', RW, [E1, E4S], 'survives no-egress (the X2e residual, in its post-#549 form)'),
    ('M3-check-reads-only-the-first-condition', [REACH_TEST],
     [edit(REACH_KIT, "if (JSON.stringify(entry).includes('/../'))",
           "if (JSON.stringify(typeof entry === 'object' && entry !== null ? Object.values(entry)[0] : entry).includes('/../'))")],
     'killed by the /../ row (F2 case: types comes first)'),
    ('M4-check-skips-types', [REACH_TEST, NO_EGRESS],
     [edit(REACH_KIT, "if (JSON.stringify(entry).includes('/../'))", "if (JSON.stringify(entry, (key, value) => key === 'types' ? undefined : value).includes('/../'))")],
     'survives: no row pins "types included"'),
    ('M4b-check-skips-types-plus-types-only', [REACH_TEST, NO_EGRESS],
     [edit(REACH_KIT, "if (JSON.stringify(entry).includes('/../'))", "if (JSON.stringify(entry, (key, value) => key === 'types' ? undefined : value).includes('/../'))"),
      edit(DOSSIER_PKG, ST_TYPES, ST_TYPES_DD)], 'survives: the body\'s "types included" refusal is gone'),
    ('M5-write-reader-object-rest-arm-dropped', [PURITY],
     [edit(PURITY, ' : ts.isSpreadAssignment(property) ? targets(property.expression) : []', ' : []')], 'survives: no reader row for an object rest target'),
    ('M5b-object-rest-arm-dropped-plus-object-rest-write', [PURITY],
     [edit(PURITY, ' : ts.isSpreadAssignment(property) ? targets(property.expression) : []', ' : []'),
      edit(SHA, "import { createHash } from 'node:crypto';\n", "import { createHash } from 'node:crypto';\n\n({ ...Object.freeze } = {});\n")],
     'survives: an object-rest write to Object passes the no-write row'),
    ('M5c-object-rest-write-control', [PURITY],
     [edit(SHA, "import { createHash } from 'node:crypto';\n", "import { createHash } from 'node:crypto';\n\n({ ...Object.freeze } = {});\n")],
     'killed by the no-write row (and the identifier row? freeze/Object are listed)'),
    ('M6-import-reader-reads-only-a-top-level-statement', [PURITY],
     [edit(PURITY, 'if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) calls.push(node.getText(file));',
           'if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isExpressionStatement(node.parent)) calls.push(node.getText(file));')],
     'killed by the arrow-body and void reader rows'),
    # M6 is killed by a TypeError, not an assertion: the reader parses without parent pointers, so node.parent is undefined. M6b is
    # the well-formed version: the reader does not descend into a function body.
    ('M6b-import-reader-skips-function-bodies', [PURITY],
     [edit(PURITY, 'calls.push(node.getText(file));\n    ts.forEachChild(node, visit);', 'calls.push(node.getText(file));\n    if (!ts.isArrowFunction(node)) ts.forEachChild(node, visit);')],
     'killed by the arrow-body reader row alone'),
    ('M7-write-reader-default-arm-only-for-identifiers', [PURITY],
     [edit(PURITY, ": ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? targets(node.left)\n", '')],
     'killed? round 1 X5: a default is itself a read assignment'),
    # The supersession: what #549 refuses where item 3's oracle stood.
    ('S1-alias-key-wrong-target', [GUARD, REACH_TEST],
     [edit(CONFIG, SSR, SSR + f"  resolve: {{ alias: {{ '@syzygy/polaris-dossier/argv': {WRONG} }} }},\n")], 'guard row and the load row fail'),
    ('S2-shorthand-alias-wrong-target', [GUARD, REACH_TEST],
     [edit(CONFIG, "export default defineConfig({\n", f"const alias = {{ '@syzygy/polaris-dossier/argv': {WRONG} }};\n\nexport default defineConfig({{\n"),
      edit(CONFIG, SSR, SSR + "  resolve: { alias },\n")], 'the ALIAS_KEY text test misses it; the load row fails'),
    ('S3-shorthand-alias-right-target', [GUARD, REACH_TEST],
     [edit(CONFIG, "export default defineConfig({\n", f"const alias = {{ '@syzygy/polaris-dossier/argv': {RIGHT} }};\n\nexport default defineConfig({{\n"),
      edit(CONFIG, SSR, SSR + "  resolve: { alias },\n")], 'passes: a right alias is harmless'),
    ('S4-source-condition-dropped', [GUARD, REACH_TEST],
     [edit(CONFIG, "conditions: ['source', 'module',", "conditions: ['module',")], 'guard row fails; the load row fails or loads dist'),
]

git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == '', 'the clone must start clean'
commit = git('rev-parse', 'HEAD').strip()
pick = which.split(',')
rows = []
for rid, tests, edits, prediction in ROWS:
    if which != 'all' and not any(rid.startswith(p) for p in pick):
        continue
    load = open('/proc/loadavg').read().split()[0]
    undo = lane.apply(clone, edits)
    try:
        res = lane.run(clone, tests, tmpdir)
    finally:
        lane.restore(undo)
    failing = sorted({t['name'] for t in res.get('failedTests', [])} | {f"file: {m.splitlines()[0][:200]}" for m in res.get('fileMessages', [])})
    messages = {t['name']: t['message'].splitlines()[0][:300] if t['message'] else '' for t in res.get('failedTests', [])}
    rows.append({'id': rid, 'tests': tests, 'edits': edits, 'prediction': prediction, 'load1': load, 'failing': failing, 'messages': messages,
                 **{k: res.get(k) for k in ('exit', 'passed', 'failed', 'pending', 'total', 'failedFiles', 'error', 'stderrTail')}})
    print(rid, res.get('exit'), res.get('passed'), res.get('failed'), failing, flush=True)
    for name, msg in messages.items():
        print('   ', name[:120], '::', msg[:200], flush=True)
status = git('status', '--porcelain')
json.dump({'commit': commit, 'dists': lane.dist_dirs(clone), 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
           'rows': rows, 'statusAfter': status}, open(out_path, 'w'), indent=1)
print('status after', repr(status))
