"""rev-528: write its own mutant specs, in the #524 reviewer's mut.py format.

Usage: python3 -I own_specs.py <tree> <out.json> <side>   (side: base | head; head adds the predicate mutants of the new code)
The absolute-path and file: URL mutants name <tree> itself, so each side gets its own file.
"""
import json, sys

tree, out, side = sys.argv[1:4]
tree = tree.rstrip('/')

DOSSIER = (['@syzygy/polaris-dossier'], ['packages/polaris-dossier/src/subpath-imports.test.ts'])
ISLAND = (['@syzygy/polaris-generation-core'], ['packages/polaris-generation-core/src/island-boundary.test.ts'])
ARGV = (['@syzygy/polaris-dossier'], ['packages/polaris-dossier/src/argv.test.ts'])
KIT = (['@syzygy/polaris-generation-core', '@syzygy/polaris-dossier'],
       ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
        'packages/polaris-dossier/src/subpath-imports.test.ts'])

APP_MAIN = '  "main": "./dist/main.js",\n'
ENTRY_ANCHOR = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
SITE_ANCHOR = "import { assertInertSvg } from './svg-inert.js';\n"
ARGV_EXPORT = '      "types": "./dist/argv.d.ts",\n      "import": "./dist/argv.js",'
CLI_IMPORT = "import { isArgvFault, readArgv } from './argv.js';\n"
CLI_CALL = "    const read = readArgv(rest, { valued: [], dashValue: 'refuse', repeat: 'refuse', positionals: true });"
DRIFT = "{ valued: ['--drift'], dashValue: 'take', repeat: 'last', positionals: true }"
KITFILE = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
ARGVTEST = 'packages/polaris-dossier/src/argv.test.ts'


def edit(file, old, new):
    return {'file': file, 'old': old, 'new': new}


def create(file, text):
    return {'file': file, 'create': text}


def app_imports(imports, package='apps/syzygy/package.json'):
    return edit(package, APP_MAIN, APP_MAIN + f'  "imports": {json.dumps(imports)},\n')


def entry(line):
    return edit('apps/syzygy/src/main.ts', ENTRY_ANCHOR, ENTRY_ANCHOR + line + '\n')


def cli(head_lines='', call_lines=''):
    edits = []
    if head_lines:
        edits.append(edit('packages/polaris-dossier/src/cli.ts', CLI_IMPORT, CLI_IMPORT + head_lines))
    if call_lines:
        edits.append(edit('packages/polaris-dossier/src/cli.ts', CLI_CALL, CLI_CALL + '\n' + call_lines))
    return edits


def spec(id, what, expect, target, edits):
    return {'id': id, 'what': what, 'expect': expect, 'projects': target[0], 'files': target[1], 'edits': edits}


specs = [
    # N1, tree forms on the daemon path and the island walk
    spec('RV-T1-hash-pattern-alias', 'a # subpath pattern (#d/*) to the barrel, imported by main.ts', {'base': 'survives', 'head': 'killed'},
         DOSSIER, [app_imports({'#d/*': '@syzygy/polaris-dossier'}), entry("import '#d/barrel';")]),
    spec('RV-T2-hash-pattern-alias-island', 'a # subpath pattern (#c/*) to the consent root, imported by dossier-site.ts',
         {'base': 'survives', 'head': 'killed'}, ISLAND,
         [app_imports({'#c/*': '@syzygy/polaris-generation-consent'}, 'apps/three-surface-poc/package.json'),
          edit('apps/three-surface-poc/src/polaris-generation/dossier-site.ts', SITE_ANCHOR, SITE_ANCHOR + "import '#c/root';\n")]),
    spec('RV-T3-node-object-ahead-of-import', 'a node condition holding its own import/default object, ahead of import in ./argv',
         {'base': 'survives', 'head': 'killed'}, DOSSIER,
         [edit('packages/polaris-dossier/package.json', ARGV_EXPORT,
               '      "types": "./dist/argv.d.ts",\n      "node": { "import": "./dist/index.js", "default": "./dist/index.js" },\n      "import": "./dist/argv.js",')]),
    spec('RV-T4-node-nested-inside-import', 'a node condition nested inside the import condition of ./argv', {'base': 'killed', 'head': 'killed'},
         DOSSIER, [edit('packages/polaris-dossier/package.json', ARGV_EXPORT,
                        '      "types": "./dist/argv.d.ts",\n      "import": { "node": "./dist/index.js", "default": "./dist/argv.js" },')]),
    spec('RV-T5-require-ahead-of-import', 'a require condition naming the barrel, ahead of import in ./argv', {'base': 'survives', 'head': 'killed'},
         DOSSIER, [edit('packages/polaris-dossier/package.json', ARGV_EXPORT,
                        '      "types": "./dist/argv.d.ts",\n      "require": "./dist/index.js",\n      "import": "./dist/argv.js",')]),
    spec('RV-T6-exports-fallback-array', 'the import condition of ./argv as a fallback array led by the barrel', {'base': 'killed', 'head': 'killed'},
         DOSSIER, [edit('packages/polaris-dossier/package.json', ARGV_EXPORT,
                        '      "types": "./dist/argv.d.ts",\n      "import": ["./dist/index.js", "./dist/argv.js"],')]),
    spec('RV-T7-imports-fallback-array-alias', 'a # alias whose target is a fallback array naming the barrel', {'base': 'survives', 'head': 'killed'},
         DOSSIER, [app_imports({'#dossier': ['@syzygy/polaris-dossier']}), entry("import '#dossier';")]),
    spec('RV-T8-mts-bridge', 'main.ts imports ./bridge.mjs, a .mts module re-exporting the barrel', {'base': 'killed', 'head': 'killed'}, DOSSIER,
         [create('apps/syzygy/src/bridge.mts', "export * from '@syzygy/polaris-dossier';\n"), entry("import './bridge.mjs';")]),
    spec('RV-T9-cts-bridge', 'main.ts imports ./bridge.cjs, a .cts module re-exporting the barrel', {'base': 'killed', 'head': 'killed'}, DOSSIER,
         [create('apps/syzygy/src/bridge.cts', "export * from '@syzygy/polaris-dossier';\n"), entry("import './bridge.cjs';")]),
    spec('RV-T10-directory-index', "main.ts imports '.', its own directory, whose new index.ts re-exports the barrel", {'base': 'killed', 'head': 'killed'},
         DOSSIER, [create('apps/syzygy/src/index.ts', "export * from '@syzygy/polaris-dossier';\n"), entry("import '.';")]),
    spec('RV-T11-template-literal-dynamic-alias', 'a declared #dossier alias loaded by import(`#dossier`) outside the branches',
         {'base': 'killed', 'head': 'killed'}, DOSSIER,
         [app_imports({'#dossier': '@syzygy/polaris-dossier'}), entry('void import(`#dossier`);')]),
    spec('RV-T12-computed-alias', "a declared #dossier alias loaded by import(name), name = '#dossier'", {'base': 'killed', 'head': 'killed'},
         DOSSIER, [app_imports({'#dossier': '@syzygy/polaris-dossier'}), entry("const hashName = '#dossier';\nvoid import(hashName);")]),
    spec('RV-T13-template-literal-dynamic-alias-island', 'a declared #consent alias loaded by import(`#consent`) in dossier-site.ts',
         {'base': 'survives', 'head': 'unknown'}, ISLAND,
         [app_imports({'#consent': '@syzygy/polaris-generation-consent'}, 'apps/three-surface-poc/package.json'),
          edit('apps/three-surface-poc/src/polaris-generation/dossier-site.ts', SITE_ANCHOR, SITE_ANCHOR + 'void import(`#consent`);\n')]),
    spec('RV-T14-absolute-path', 'main.ts imports the barrel by its absolute path', {'base': 'survives', 'head': 'killed'}, DOSSIER,
         [entry(f"import '{tree}/packages/polaris-dossier/src/index.js';")]),
    spec('RV-T15-file-url-mixed-case', 'main.ts imports the barrel by a File:// URL', {'base': 'survives', 'head': 'killed'}, DOSSIER,
         [entry(f"import 'File://{tree}/packages/polaris-dossier/src/index.js';")]),
    spec('RV-T16-alias-declared-by-another-package', 'main.ts imports #dossier, which only apps/three-surface-poc declares',
         {'base': 'survives', 'head': 'killed'}, DOSSIER,
         [app_imports({'#dossier': '@syzygy/polaris-dossier'}, 'apps/three-surface-poc/package.json'), entry("import '#dossier';")]),
    spec('RV-T17-alias-to-own-dist-module', 'a #bridge alias to ./dist/bridge.js, whose src/bridge.ts re-exports the barrel',
         {'base': 'survives', 'head': 'killed'}, DOSSIER,
         [app_imports({'#bridge': './dist/bridge.js'}), create('apps/syzygy/src/bridge.ts', "export * from '@syzygy/polaris-dossier';\n"),
          entry("import '#bridge';")]),
    spec('RV-T18-dependency-alias', 'a dependency alias "dossier": "file:../../packages/polaris-dossier", imported by main.ts',
         {'base': 'survives', 'head': 'survives'}, DOSSIER,
         [edit('apps/syzygy/package.json', '  "dependencies": {\n', '  "dependencies": {\n    "dossier": "file:../../packages/polaris-dossier",\n'),
          entry("import 'dossier';")]),
    spec('RV-T19-node-modules-relative-path', 'an intermediate module re-exports ../../../node_modules/@syzygy/polaris-dossier/src/index.js',
         {'base': 'survives', 'head': 'survives'}, DOSSIER,
         [create('apps/syzygy/src/bridge.ts', "export * from '../../../node_modules/@syzygy/polaris-dossier/src/index.js';\n"),
          entry("import './bridge.js';")]),
    # N2, tree forms in cli.ts
    spec('RV-C1-destructured-alias', 'const { readArgv: readArgs } = argvNs, and a call through it', {'base': 'survives', 'head': 'killed'}, ARGV,
         cli("import * as argvNs from './argv.js';\nconst { readArgv: readArgs } = argvNs;\n", f'    void readArgs(rest, {DRIFT});')),
    spec('RV-C2-reexport-renamed-in-cli', "export { readArgv as readArgs } from './argv.js' in cli.ts", {'base': 'survives', 'head': 'killed'},
         ARGV, cli("export { readArgv as readArgs } from './argv.js';\n")),
    spec('RV-C3-reflect-get', "Reflect.apply(Reflect.get(argvNs, 'readArgv'), ...) in cli.ts", {'base': 'survives', 'head': 'killed'}, ARGV,
         cli("import * as argvNs from './argv.js';\n", f"    void Reflect.apply(Reflect.get(argvNs, 'readArgv'), undefined, [rest, {DRIFT}]);")),
    spec('RV-C4-element-access', "argvNs['readArgv'](...) in cli.ts", {'base': 'survives', 'head': 'killed'}, ARGV,
         cli("import * as argvNs from './argv.js';\n", f"    void argvNs['readArgv'](rest, {DRIFT});")),
    spec('RV-C5-concatenated-name', "argvNs['read' + 'Argv'](...) in cli.ts (the named residual)", {'base': 'survives', 'head': 'survives'}, ARGV,
         cli("import * as argvNs from './argv.js';\n", f"    void (argvNs as Record<string, Function>)['read' + 'Argv'](rest, {DRIFT});")),
    spec('RV-C6-mts-caller', 'a new .mts module calling readArgv with its own spec', {'base': 'survives', 'head': 'survives'}, ARGV,
         [create('packages/polaris-dossier/src/extra-reader.mts',
                 f"import {{ readArgv }} from './argv.js';\nexport const readDrift = (args: string[]) => readArgv(args, {DRIFT});\n")]),
    spec('RV-C7-callback-argument', '[rest].map(readArgv) in cli.ts: readArgv inside a call, not its callee', {'base': 'survives', 'head': 'killed'},
         ARGV, cli('', '    void [rest].map(readArgv);')),
    spec('RV-C8-optional-call', 'readArgv?.(rest, drift) in cli.ts', {'base': 'killed', 'head': 'killed'}, ARGV,
         cli('', f'    void readArgv?.(rest, {DRIFT});')),
    spec('RV-C9-apply', 'readArgv.apply(undefined, [rest, drift]) in cli.ts', {'base': 'survives', 'head': 'killed'}, ARGV,
         cli('', f'    void readArgv.apply(undefined, [rest, {DRIFT}]);')),
]

if side == 'head':
    specs += [
        spec('RV-P1-absolute-branch-null', 'the absolute/file: branch returns null (outside) instead of undefined', 'killed', KIT,
             [edit(KITFILE, "  if (specifier.startsWith('/') || /^file:/iu.test(specifier)) return undefined;\n",
                   "  if (specifier.startsWith('/') || /^file:/iu.test(specifier)) return null;\n")]),
        spec('RV-P2-hash-guard-null', 'the # branch guard returns null instead of undefined', 'killed', KIT,
             [edit(KITFILE, "target.startsWith('#') || target.startsWith('../')) return undefined;", "target.startsWith('#') || target.startsWith('../')) return null;")]),
        spec('RV-P3-moduleIn-prefix-null', 'moduleIn returns null for a target outside ./dist/', 'unknown', KIT,
             [edit(KITFILE, "  if (!target.startsWith('./dist/')) return undefined;\n", "  if (!target.startsWith('./dist/')) return null as never;\n")]),
        spec('RV-P4-moduleIn-missing-file-null', 'moduleIn returns null when the src module is no file', 'unknown', KIT,
             [edit(KITFILE, '  return workspace.isFile(module) ? module : undefined;\n', '  return workspace.isFile(module) ? module : (null as never);\n')]),
        spec('RV-P5-exports-no-target-null', 'the @syzygy branch returns null when an entry names no one target', 'killed', KIT,
             [edit(KITFILE, '  return target === undefined ? undefined : moduleIn(workspace, manifest.dir, target);\n',
                   '  return target === undefined ? null : moduleIn(workspace, manifest.dir, target);\n')]),
        spec('RV-P6-leaves-package-check-dropped', "the # branch no longer refuses a ../ target", 'unknown', KIT,
             [edit(KITFILE, "target.startsWith('#') || target.startsWith('../')) return undefined;", "target.startsWith('#')) return undefined;")]),
        spec('RV-P7-agreement-every-dropped', 'the agreement check takes the first runtime condition, whatever the rest name', 'killed', KIT,
             [edit(KITFILE, 'targets.every((target) => target === first)', 'true')]),
        spec('RV-P8-array-guard-dropped', 'targetOf no longer refuses an array outright', 'unknown', KIT,
             [edit(KITFILE, ' || Array.isArray(entry)) return undefined;', ') return undefined;')]),
        spec('RV-P9-types-compared-too', 'the agreement check also compares the types condition', 'killed', KIT,
             [edit(KITFILE, "filter(([condition]) => condition !== 'types')", 'filter(() => true)')]),
        spec('RV-P10-string-check-dropped', 'targetOf returns a lone non-string target', 'killed', KIT,
             [edit(KITFILE, "return typeof first === 'string' && targets.every", 'return targets.every')]),
        spec('RV-Q1-callee-conjunct-dropped', 'the census allows readArgv anywhere inside a call, not only as its callee', 'unknown', ARGV,
             [edit(ARGVTEST, '        || (ts.isCallExpression(parent) && parent.expression === node);\n', '        || ts.isCallExpression(parent);\n')]),
        spec('RV-Q2-declaration-anywhere', 'the census allows a readArgv function declaration in any module', 'unknown', ARGV,
             [edit(ARGVTEST, " && module === 'packages/polaris-dossier/src/argv.ts')", ')')]),
        spec('RV-Q3-census-never-fed', 'readArgvCallers never adds the census of each module to unlifted', 'unknown', ARGV,
             [edit(ARGVTEST, '    unlifted.push(...unliftedOf(module, source));\n', '')]),
    ]

json.dump({'what': f'rev-528 own mutants, {side} side, tree {tree}', 'mutants': specs}, open(out, 'w'), indent=1)
print(side, len(specs))
