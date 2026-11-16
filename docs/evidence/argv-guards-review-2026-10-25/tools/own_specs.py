"""rev-524: the reviewer's own mutants of the 8.34 guards. Writes mut.py specs.

Usage: python3 -I own_specs.py <out.json>
"""
import json, sys

ARGV = {'projects': ['@syzygy/polaris-dossier'], 'files': ['packages/polaris-dossier/src/argv.test.ts']}
GUARD = {'projects': ['@syzygy/polaris-dossier'], 'files': ['packages/polaris-dossier/src/subpath-imports.test.ts']}
ISLAND = {'projects': ['@syzygy/polaris-generation-core'], 'files': ['packages/polaris-generation-core/src/island-boundary.test.ts']}
MAIN = 'apps/syzygy/src/main.ts'
CLI = 'packages/polaris-dossier/src/cli.ts'
POLARIS = 'packages/polaris-dossier/src/polaris.ts'
ARGV_TS = 'packages/polaris-dossier/src/argv.ts'
STATE_IMPORT = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
LINE63 = "      if (token.value === undefined || (spec.dashValue === 'refuse' && token.value.startsWith('-'))) return { fault: 'missing-value', arg };"
ONE_ARG = "    const read = readArgv(rest, { valued: [], dashValue: 'refuse', repeat: 'refuse', positionals: true });"
CLI_IMPORT = "import { isArgvFault, readArgv } from './argv.js';\n"
DAEMON_CALL = ("  const read = readArgv(argv, {\n    valued: ['--root', '--state-dir', '--port'],\n    stopAt: ['--help', '-h'],\n"
               "    dashValue: 'take',\n    repeat: 'last',\n    positionals: false,\n  });")
POLARIS_BOOLEANS = ("    booleans: ['--author-skip-permissions', '--no-attach', '--supervise', '--help', '-h'], dashValue: 'take', repeat: 'last', "
                    "positionals: true,")


def after_state(line):
    return {'file': MAIN, 'old': STATE_IMPORT, 'new': STATE_IMPORT + line}


mutants = [
    # N1 (reader rows), per policy
    {'id': 'R-OR3-empty-value-missing-only-under-refuse', 'expect': 'killed', **ARGV, 'edits': [{'file': ARGV_TS, 'old': LINE63, 'new': (
        "      if (token.value === undefined || (spec.dashValue === 'refuse' && (token.value === '' || token.value.startsWith('-')))) "
        "return { fault: 'missing-value', arg };")}]},
    {'id': 'R-OR4-empty-value-missing-only-under-take', 'expect': 'killed', **ARGV, 'edits': [{'file': ARGV_TS, 'old': LINE63, 'new': (
        "      if (token.value === undefined || (spec.dashValue === 'take' && token.value === '') || (spec.dashValue === 'refuse' && "
        "token.value.startsWith('-'))) return { fault: 'missing-value', arg };")}]},
    # N2 (spec copies)
    {'id': 'R-Y1-polaris-valued-entry-added', 'expect': 'killed', **ARGV, 'edits': [{'file': POLARIS, 'old': "'--resume', '--tmux-session'],",
                                                                                     'new': "'--resume', '--tmux-session', '--extra'],"}]},
    {'id': 'R-Y2-daemon-positionals-true', 'expect': 'killed', **ARGV, 'edits': [{'file': MAIN, 'old': "    positionals: false,\n  });",
                                                                                  'new': "    positionals: true,\n  });"}]},
    {'id': 'R-Y3-daemon-spec-through-a-variable', 'expect': 'killed', **ARGV, 'edits': [{'file': MAIN, 'old': DAEMON_CALL, 'new': (
        "  const spec = {\n    valued: ['--root', '--state-dir', '--port'],\n    stopAt: ['--help', '-h'],\n    dashValue: 'take',\n"
        "    repeat: 'last',\n    positionals: false,\n  } as const;\n  const read = readArgv(argv, spec);")}]},
    {'id': 'R-Y4-polaris-booleans-through-a-spread', 'expect': 'killed', **ARGV, 'edits': [{'file': POLARIS, 'old': POLARIS_BOOLEANS, 'new': (
        "    ...{ booleans: ['--author-skip-permissions', '--no-attach', '--supervise', '--help', '-h'] }, dashValue: 'take', repeat: 'last', "
        "positionals: true,")}]},
    {'id': 'R-Y5-second-identifier-call-in-cli', 'expect': 'killed', **ARGV, 'edits': [{'file': CLI, 'old': ONE_ARG, 'new': ONE_ARG + (
        "\n    void readArgv(rest, { valued: [], dashValue: 'refuse', repeat: 'refuse', positionals: true });")}]},
    {'id': 'R-Y6-extra-namespace-call-in-cli', 'expect': 'survives', **ARGV, 'edits': [
        {'file': CLI, 'old': CLI_IMPORT, 'new': CLI_IMPORT + "import * as argvNs from './argv.js';\n"},
        {'file': CLI, 'old': ONE_ARG, 'new': ONE_ARG + "\n    void argvNs.readArgv(rest, { valued: ['--drift'], dashValue: 'take', repeat: 'last', positionals: true });"}]},
    {'id': 'R-Y7-extra-aliased-call-in-cli', 'expect': 'survives', **ARGV, 'edits': [
        {'file': CLI, 'old': CLI_IMPORT, 'new': CLI_IMPORT + "const readArgs = readArgv;\n"},
        {'file': CLI, 'old': ONE_ARG, 'new': ONE_ARG + "\n    void readArgs(rest, { valued: ['--drift'], dashValue: 'take', repeat: 'last', positionals: true });"}]},
    {'id': 'R-Y8-another-options-command-gains-a-valued-option', 'expect': 'survives', **ARGV, 'edits': [
        {'file': CLI, 'old': "args: { kind: 'options', options: ['--draft'], noun: RUN },",
         'new': "args: { kind: 'options', options: ['--draft', '--extra'], noun: RUN },"}]},
    # N4 (transitive daemon-path guard)
    {'id': 'R-X1-two-deep-local-re-export-chain', 'expect': 'killed', **GUARD, 'edits': [
        {'file': 'apps/syzygy/src/bridge-a.ts', 'create': "export * from './bridge-b.js';\n"},
        {'file': 'apps/syzygy/src/bridge-b.ts', 'create': "export { runDossierCli } from '@syzygy/polaris-dossier';\n"},
        after_state("import './bridge-a.js';\n")]},
    {'id': 'R-X2-chain-through-another-workspace-package', 'expect': 'killed', **GUARD, 'edits': [
        {'file': 'packages/cap1-daemon/src/zz-bridge.ts', 'create': "export { runDossierCli } from '@syzygy/polaris-dossier';\n"},
        {'file': 'packages/cap1-daemon/src/index.ts', 'old': "export * from './observation.js';\n",
         'new': "export * from './observation.js';\nexport * from './zz-bridge.js';\n"}]},
    {'id': 'R-X3-create-require-in-an-intermediate-module', 'expect': 'killed', **GUARD, 'edits': [
        {'file': 'apps/syzygy/src/bridge-req.ts', 'create': ("import { createRequire } from 'node:module';\nconst load = createRequire(import.meta.url);\n"
                                                              "export const lazy = (): unknown => load('@syzygy/polaris-dossier');\n")},
        after_state("import './bridge-req.js';\n")]},
    {'id': 'R-X3b-bare-module-specifier-in-main', 'expect': 'killed', **GUARD, 'edits': [
        after_state("import { createRequire as cr } from 'module';\nexport const lazy = (): unknown => cr(import.meta.url)('@syzygy/polaris-dossier');\n")]},
    {'id': 'R-X4-import-meta-resolve-into-import', 'expect': 'killed', **GUARD, 'edits': [
        after_state("export const lazyDossier = async (): Promise<unknown> => import(import.meta.resolve('@syzygy/polaris-dossier'));\n")]},
    {'id': 'R-X5-literal-dynamic-import-outside-the-two-branches', 'expect': 'killed', **GUARD, 'edits': [
        {'file': MAIN, 'old': "  if (parsed.kind === 'help') {\n    process.stdout.write(USAGE);",
         'new': "  if (parsed.kind === 'help') {\n    await import('@syzygy/polaris-dossier');\n    process.stdout.write(USAGE);"}]},
    {'id': 'R-X6-package-imports-alias-to-the-barrel', 'expect': 'survives', **GUARD, 'edits': [
        {'file': 'apps/syzygy/package.json', 'old': '  "main": "./dist/main.js",\n',
         'new': '  "main": "./dist/main.js",\n  "imports": { "#dossier": "@syzygy/polaris-dossier" },\n'},
        after_state("import '#dossier';\n")]},
    {'id': 'R-X6b-package-imports-alias-in-an-intermediate-module', 'expect': 'survives', **GUARD, 'edits': [
        {'file': 'apps/syzygy/package.json', 'old': '  "main": "./dist/main.js",\n',
         'new': '  "main": "./dist/main.js",\n  "imports": { "#cli": "@syzygy/polaris-dossier" },\n'},
        {'file': 'apps/syzygy/src/bridge-hash.ts', 'create': "export { runDossierCli } from '#cli';\n"},
        after_state("import './bridge-hash.js';\n")]},
    {'id': 'R-X8-get-builtin-module-create-require', 'expect': 'survives', **GUARD, 'edits': [
        after_state("export const lazy = (): unknown => process.getBuiltinModule('node:module').createRequire(import.meta.url)('@syzygy/polaris-dossier');\n")]},
    # the island guard's pre-existing resolver boundary (unchanged by the move): an imports alias to the consent root, which reaches the island
    {'id': 'R-X6i-island-package-imports-alias-to-consent-root', 'expect': 'survives', **ISLAND, 'edits': [
        {'file': 'apps/three-surface-poc/package.json', 'old': '  "main": "./dist/main.js",\n',
         'new': '  "main": "./dist/main.js",\n  "imports": { "#consent": "@syzygy/polaris-generation-consent" },\n'},
        {'file': 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts', 'old': "import { assertInertSvg } from './svg-inert.js';\n",
         'new': "import { assertInertSvg } from './svg-inert.js';\nimport '#consent';\n"}]},
    {'id': 'R-X6j-island-control-same-edge-by-name', 'expect': 'killed', **ISLAND, 'edits': [
        {'file': 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts', 'old': "import { assertInertSvg } from './svg-inert.js';\n",
         'new': "import { assertInertSvg } from './svg-inert.js';\nimport '@syzygy/polaris-generation-consent';\n"}]},
]
json.dump({'mutants': mutants}, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
print(len(mutants), 'own mutants')
