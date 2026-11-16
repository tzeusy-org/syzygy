"""rev-521: the mutants I run, as one JSON list for run_mutants.py. The lane's re-runs take their edits from the recorded specs
(8.2's R*.json, the 8.2 review's GM1/GM3.json, and the lane's mutants.json for S*/K*); the O* mutants are my own.
Usage: build_my_mutants.py <tree> <tools-dir> <tmp> <out.json>"""
import json, os, sys
tree, tools, tmp, out = sys.argv[1:5]
R82 = 'docs/evidence/syzygy-bpyt-8-2/mutants'
REV = 'docs/evidence/dossier-cli-table-review-2026-10-24/mutants'
lane = {m['id']: m for m in json.load(open(os.path.join(tree, 'docs/evidence/syzygy-bpyt-8-32/mutants.json')))['mutants']}
V = f'TMPDIR={tmp} CI=1 npx vitest run --project @syzygy/polaris-dossier packages/polaris-dossier/src/'
ARGV, GUARD = V + 'argv.test.ts', V + 'subpath-imports.test.ts'
ROW = 'refuses a component below a directory it may not search as unreadable'
ARGV_TS, TEST = 'packages/polaris-dossier/src/argv.ts', 'packages/polaris-dossier/src/subpath-imports.test.ts'
MAIN, SD_TEST = 'apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/state-directory.test.ts'
STATIC = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"

def row(mid, as_root, expected):
    env = f'NODE_OPTIONS=--import={tools}/fake-root.mjs ' if as_root else ''
    rep = f'{tmp}/{mid}.json'
    return (f"{env}{V}state-directory.test.ts --reporter=json --outputFile={rep}; v=$?; python3 -I {tools}/row_check.py {rep} '{ROW}' {expected}; "
            f"r=$?; exit $((v|r))")

ms = [{'id': 'C0-argv', 'control': True, 'edits': [], 'command': ARGV},
      {'id': 'C0-guard', 'control': True, 'edits': [], 'command': GUARD},
      {'id': 'C0-row-user', 'control': True, 'edits': [], 'command': row('C0-row-user', False, 'passed')},
      {'id': 'C0-row-fake-root', 'control': True, 'edits': [], 'command': row('C0-row-fake-root', True, 'skipped')}]
for name in ['R1-terminator-skipped', 'R2b-group-read-by-its-first-option', 'R3-dash-value-taken-when-refused', 'R4-repeat-taken-when-refused',
             'R5-positional-taken-when-refused', 'R6-stop-option-ignored', 'R7-dash-positional-taken', 'R8-boolean-option-ignored',
             'R9-missing-value-unchecked', 'R10-first-value-kept']:
    spec = json.load(open(os.path.join(tree, R82, name + '.json')))
    ms.append({'id': spec['id'], 'family': 'lane reader', 'from': f'{R82}/{name}.json', 'edits': spec['edits'], 'command': ARGV})
for name in ['GM1', 'GM3']:
    spec = json.load(open(os.path.join(tree, REV, name + '.json')))
    ms.append({'id': spec['id'], 'family': 'review guard', 'from': f'{REV}/{name}.json', 'edits': [{k: spec[k] for k in ('file', 'old', 'new')}], 'command': GUARD})
for mid in ['GM7-entry-re-exports-the-barrel-as-a-namespace', 'S3-stop-names-unchecked', 'S7-short-form-never']:
    ms.append({'id': mid, 'family': 'lane own', 'from': 'docs/evidence/syzygy-bpyt-8-32/mutants.json', 'edits': lane[mid]['edits'],
               'command': GUARD if mid.startswith('GM') else ARGV})
for mid, new, as_root, expected in [('K1-root-skip-dropped', f"  it('{ROW}'", True, 'skipped'), ('K2-root-skip-inverted', f"  it.skipIf(!isRoot)('{ROW}'", False, 'passed')]:
    assert lane[mid]['edits'][0]['new'] == new
    ms.append({'id': mid, 'family': 'lane own', 'from': 'docs/evidence/syzygy-bpyt-8-32/mutants.json', 'edits': lane[mid]['edits'], 'command': row(mid, as_root, expected)})

own = [
 # reader table
 ('OR1-missing-value-judged-before-repeat', 'reader', [(ARGV_TS,
   "      if (spec.repeat === 'refuse' && values.has(arg)) return { fault: 'repeated', arg };\n      if (token.value === undefined || (spec.dashValue === 'refuse' && token.value.startsWith('-'))) return { fault: 'missing-value', arg };\n",
   "      if (token.value === undefined || (spec.dashValue === 'refuse' && token.value.startsWith('-'))) return { fault: 'missing-value', arg };\n      if (spec.repeat === 'refuse' && values.has(arg)) return { fault: 'repeated', arg };\n")], ARGV),
 ('OR2-empty-value-read-as-missing', 'reader', [(ARGV_TS, 'if (token.value === undefined ||', 'if (!token.value ||')], ARGV),
 ('OR3-valued-arm-judged-by-raw-name', 'reader', [(ARGV_TS, "token.kind === 'option' && spec.valued.includes(arg)", "token.kind === 'option' && spec.valued.includes(token.rawName)")], ARGV),
 ('OR4-boolean-arm-judged-by-raw-name', 'reader', [(ARGV_TS, '} else if (spec.booleans?.includes(arg)) {', "} else if (spec.booleans?.includes(token.kind === 'option' ? token.rawName : arg)) {")], ARGV),
 # two-way edge finder
 ('OE1-agreement-one-way', 'edge finder', [(TEST, 'if (JSON.stringify(walked) !== JSON.stringify(reported)) throw', 'if (walked.some((s) => !reported.includes(s))) throw')], GUARD),
 ('OE2-walker-drops-require', 'edge finder', [(TEST, "    else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require' && node.arguments[0]) add('require', node.arguments[0]);\n", '')], GUARD),
 ('OE3-main-computed-dynamic-import', 'edge finder (subject)', [(MAIN, STATIC, STATIC + "const barrel = '@syzygy/polaris-dossier';\nawait import(barrel);\n")], GUARD),
 ('OE4-main-create-require-alias', 'edge finder (subject)', [(MAIN, STATIC, STATIC + "import { createRequire as lazyRequire } from 'node:module';\nlazyRequire(import.meta.url)('@syzygy/polaris-dossier');\n")], GUARD),
 ('OE5-main-intermediate-local-module', 'edge finder (subject)', [('apps/syzygy/src/dossier-bridge.ts', None, "export * from '@syzygy/polaris-dossier';\n"),
   (MAIN, STATIC, STATIC + "import './dossier-bridge.js';\n")], GUARD),
 # branch classifier
 ('OB1-condition-counts-as-inside', 'branch classifier', [(TEST, "if (ts.isIfStatement(parent) && child === parent.thenStatement) return", "if (ts.isIfStatement(parent) && child !== parent.elseStatement) return")], GUARD),
 ('OB2-outermost-if-not-nearest', 'branch classifier', [(TEST,
   "  const where = (node: ts.Node): string => {\n    for (let child = node, parent = node.parent; parent !== undefined; child = parent, parent = parent.parent) {\n      if (ts.isIfStatement(parent) && child === parent.thenStatement) return `inside if (${parent.expression.getText(source)})`;\n      if (ts.isIfStatement(parent) && child === parent.elseStatement) return `inside the else of if (${parent.expression.getText(source)})`;\n    }\n    return 'outside any if';\n  };\n",
   "  const where = (node: ts.Node): string => {\n    let found = 'outside any if';\n    for (let child = node, parent = node.parent; parent !== undefined; child = parent, parent = parent.parent) {\n      if (ts.isIfStatement(parent) && child === parent.thenStatement) found = `inside if (${parent.expression.getText(source)})`;\n      if (ts.isIfStatement(parent) && child === parent.elseStatement) found = `inside the else of if (${parent.expression.getText(source)})`;\n    }\n    return found;\n  };\n")], GUARD),
 ('OB3-shadowed-argv-replaces-the-polaris-branch-import', 'branch classifier (subject)', [(MAIN,
   "  if (argv[0] === 'polaris') {\n    const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n",
   "  { const argv = ['polaris']; if (argv[0] === 'polaris') await import('@syzygy/polaris-dossier'); }\n  if (argv[0] === 'polaris') {\n    const { runPolarisCli } = globalThis as never;\n")], GUARD),
 # spec guard
 ('OS1-guard-after-the-read', 'spec guard', [(ARGV_TS,
   "  for (const name of spec.valued) if (!LONG.test(name)) throw new Error(`argv: the valued option ${name} is not --<name>`);\n  for (const name of [...(spec.booleans ?? []), ...(spec.stopAt ?? [])]) {\n    if (!LONG.test(name) && !SHORT.test(name)) throw new Error(`argv: the option ${name} is neither --<name> nor -<c>`);\n  }\n", ''),
   (ARGV_TS, "  return { values, flags, positional };\n}",
   "  for (const name of spec.valued) if (!LONG.test(name)) throw new Error(`argv: the valued option ${name} is not --<name>`);\n  for (const name of [...(spec.booleans ?? []), ...(spec.stopAt ?? [])]) {\n    if (!LONG.test(name) && !SHORT.test(name)) throw new Error(`argv: the option ${name} is neither --<name> nor -<c>`);\n  }\n  return { values, flags, positional };\n}")], ARGV),
 ('OS2-long-form-allows-a-trailing-equals', 'spec guard', [(ARGV_TS, 'const LONG = /^--[^-=][^=]*$/u;', 'const LONG = /^--[^-=][^=]*=?$/u;')], ARGV),
]
for mid, family, edits, cmd in own:
    es = [{'file': f, 'create': n} if o is None else {'file': f, 'old': o, 'new': n} for f, o, n in edits]
    ms.append({'id': mid, 'family': family, 'from': 'rev-521', 'edits': es, 'command': cmd})
# root skip, my own: the idiom read by geteuid (the fake-root shim answers getuid only); and the skip written as an early return
for mid, new, as_root, expected in [
    ('OK1-isRoot-by-geteuid', 'const isRoot = process.geteuid?.() === 0;', True, 'skipped'),
    ('OK2-skip-as-an-early-return', None, True, 'skipped')]:
    if new is not None:
        edits = [{'file': SD_TEST, 'old': 'const isRoot = process.getuid?.() === 0;', 'new': new}]
    else:
        edits = [{'file': SD_TEST, 'old': f"  it.skipIf(isRoot)('{ROW}', () => {{\n", 'new': f"  it('{ROW}', () => {{\n    if (isRoot) return;\n"}]
    ms.append({'id': mid, 'family': 'root skip', 'from': 'rev-521', 'edits': edits, 'command': row(mid, as_root, expected)})
json.dump(ms, open(out, 'w'), indent=1)
print(len(ms), 'entries')
