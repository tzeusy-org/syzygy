"""rev-540: write rev540-specs.json, this reviewer's own mutants, in the rev535_mut.py spec format.
Usage: python3 -I make_specs.py <out.json>
E*: tree mutants for each edge kind the guard claims (and a few it does not), applied to the daemon closure;
G*: gate mutants; T*: mutants of the new rows themselves, paired with a gate narrowing that only that row's column catches.
"""
import json, sys

GATE = 'apps/three-surface-poc/src/git-observation.ts'
TEST = 'apps/three-surface-poc/src/git-observation.test.ts'
MAIN = 'apps/three-surface-poc/src/poc-main.ts'
CORE = 'packages/three-surface-poc-core/src/index.ts'
CAP1 = 'packages/cap1-core/src/index.ts'
SUPPORT_IMPORT = "import { sha256 } from '@syzygy/support';\n"
CORE_LINE = "export * from './evidence-population.js';\n"
CAP1_LINE = "export * from './vocabulary.js';\n"
SUPPORT_PREFIX = "    'packages/support/',\n"
CAP1_DAEMON_PREFIX = "    'packages/cap1-daemon/',\n"
HTTP_PREFIX = "    'packages/http-host/',\n"
EXACT = "  const exactInputs = new Set(['package.json', 'package-lock.json', 'tsconfig.base.json']);\n"
TABLE_COLUMNS = "[`${prefix}src/x.ts`, `${prefix}package.json`, `${prefix}tsconfig.json`]"
GUARD_INPUTS = "  const inputs = [...reachable, ...packages.flatMap((dir) => [`${dir}/package.json`, `${dir}/tsconfig.json`])];\n"
GUARD_PREPROCESS = "ts.preProcessFile(readModule(file), true, true)"


def after(file, anchor, added):
    return {'file': file, 'old': anchor, 'new': anchor + added}


def swap(file, old, new):
    return {'file': file, 'old': old, 'new': new}


# A cap1-daemon narrowing that keeps src/ and the manifest (V12's shape, on the one prefix the guard does not reach).
CAP1_DAEMON_SRC_AND_MANIFEST = swap(GATE, CAP1_DAEMON_PREFIX,
                                    "    'packages/cap1-daemon/src/',\n    'packages/cap1-daemon/package.json',\n")
HTTP_SRC_AND_MANIFEST = swap(GATE, HTTP_PREFIX, "    'packages/http-host/src/',\n    'packages/http-host/package.json',\n")

mutants = [
    # Edge kinds the guard's comment claims.
    ('E1-type-only-import-of-unprefixed-package', [after(MAIN, SUPPORT_IMPORT, "import type { GenerationSource } from '@syzygy/polaris-generation-core';\n")]),
    ('E2-type-only-reexport-of-unprefixed-package', [after(MAIN, SUPPORT_IMPORT, "export type { GenerationSource } from '@syzygy/polaris-generation-core';\n")]),
    ('E3-value-reexport-from-cap1-core-of-unprefixed-package', [after(CAP1, CAP1_LINE, "export * from '@syzygy/polaris-dossier';\n")]),
    ('E4-subpath-import-of-unprefixed-package', [after(MAIN, SUPPORT_IMPORT, "import '@syzygy/polaris-generation-core/live';\n")]),
    ('E5-relative-import-across-into-unprefixed-package', [after(MAIN, SUPPORT_IMPORT, "import '../../../packages/polaris-dossier/src/index.js';\n")]),
    ('E6-relative-import-of-a-non-package-file', [after(MAIN, SUPPORT_IMPORT, "import '../../../scripts/measure_cli_island_loads.mjs';\n")]),
    ('E7-dynamic-import-template-literal', [after(CORE, CORE_LINE, "export const loadLive = () => import(`@syzygy/polaris-generation-core/live`);\n")]),
    # Edges the guard does not claim (expected to survive; named residuals or not).
    ('E8-dynamic-import-computed-specifier', [after(CORE, CORE_LINE, "const liveName = '@syzygy/polaris-generation-core/live';\nexport const loadLive = () => import(liveName);\n")]),
    ('E9-createRequire-of-unprefixed-package', [after(MAIN, SUPPORT_IMPORT, "import { createRequire } from 'node:module';\nconst generation = createRequire(import.meta.url)('@syzygy/polaris-generation-core');\nvoid generation;\n")]),
    ('E10-triple-slash-reference-into-unprefixed-package', [swap(MAIN, "import { realpathSync } from 'node:fs';\n", "/// <reference path=\"../../../packages/polaris-dossier/src/index.ts\" />\nimport { realpathSync } from 'node:fs';\n")]),
    ('E11-manifest-only-dependency-no-import', [swap('apps/three-surface-poc/package.json', '    "@syzygy/support": "0.0.0"\n', '    "@syzygy/support": "0.0.0",\n    "@syzygy/polaris-dossier": "0.0.0"\n')]),
    # Gate mutants.
    ('G1-support-prefix-without-trailing-slash', [swap(GATE, SUPPORT_PREFIX, "    'packages/support',\n")]),
    ('G2-support-prefix-wrong-case', [swap(GATE, SUPPORT_PREFIX, "    'packages/Support/',\n")]),
    ('G3-exact-input-package-lock-dropped', [swap(GATE, EXACT, "  const exactInputs = new Set(['package.json', 'tsconfig.base.json']);\n")]),
    ('G4-exact-input-tsconfig-base-dropped', [swap(GATE, EXACT, "  const exactInputs = new Set(['package.json', 'package-lock.json']);\n")]),
    ('G5-cap1-daemon-src-and-manifest-only', [CAP1_DAEMON_SRC_AND_MANIFEST]),
    # Row mutants, each paired with the narrowing only that column catches.
    ('T1-table-package-json-alone-with-cap1-daemon-src-and-manifest', [swap(TEST, TABLE_COLUMNS, "[`${prefix}package.json`]"), CAP1_DAEMON_SRC_AND_MANIFEST]),
    ('T2-table-package-json-alone-with-http-host-src-and-manifest', [swap(TEST, TABLE_COLUMNS, "[`${prefix}package.json`]"), HTTP_SRC_AND_MANIFEST]),
    ('T3-guard-modules-only-with-http-host-src-and-manifest', [swap(TEST, GUARD_INPUTS, "  const inputs = [...reachable];\n"), HTTP_SRC_AND_MANIFEST]),
    ('T4-guard-modules-only-alone', [swap(TEST, GUARD_INPUTS, "  const inputs = [...reachable];\n")]),
    ('T5-guard-no-js-import-detection-with-dynamic-import', [swap(TEST, GUARD_PREPROCESS, "ts.preProcessFile(readModule(file), true, false)"),
                                                             after(CORE, CORE_LINE, "export const loadLive = () => import('@syzygy/polaris-generation-consent/live');\n")]),
    ('T6-guard-unresolved-assertion-dropped-with-unknown-package', [swap(TEST, "    expect(unresolved.map((edge) => `${edge.from} imports ${edge.specifier}`)).toEqual([]);\n", ""),
                                                                    after(MAIN, SUPPORT_IMPORT, "import '@syzygy/no-such-package';\n")]),
    ('T7-guard-sha256-pin-dropped-with-support-prefix-dropped', [swap(TEST, "    expect(reachable).toContain('packages/support/src/sha256.ts');\n", ""), swap(GATE, SUPPORT_PREFIX, "")]),
    ('CONTROL', []),
]
json.dump({'files': [TEST], 'mutants': [{'id': i, 'edits': e} for i, e in mutants]}, open(sys.argv[1], 'w'), indent=1)
print(len(mutants), 'mutants')
