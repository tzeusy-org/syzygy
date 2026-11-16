"""rev-540: the third spec set, at HEAD: the guard's own edge handling. T9/T10 make the guard skip type-only or dynamic
edges (a line-prefix test on the text before each specifier), alone and paired with the tree edit only that edge kind carries
(E1's type-only import, O4's dynamic import). Usage: python3 -I make_specs_3.py <out.json>"""
import json, sys
TEST = 'apps/three-surface-poc/src/git-observation.test.ts'
MAIN = 'apps/three-surface-poc/src/poc-main.ts'
CORE = 'packages/three-surface-poc-core/src/index.ts'
OLD = ".importedFiles.map((imported) => imported.fileName)"
SKIP_TYPE = ".importedFiles.filter((imported) => !/^\\s*(?:import|export)\\s+type\\b/u.test(readModule(file).slice(0, imported.pos).split('\\n').pop() ?? '')).map((imported) => imported.fileName)"
SKIP_DYN = ".importedFiles.filter((imported) => !/import\\(\\s*$/u.test(readModule(file).slice(0, imported.pos))).map((imported) => imported.fileName)"
E1 = {'file': MAIN, 'old': "import { sha256 } from '@syzygy/support';\n", 'new': "import { sha256 } from '@syzygy/support';\nimport type { GenerationSource } from '@syzygy/polaris-generation-core';\n"}
O4 = {'file': CORE, 'old': "export * from './evidence-population.js';\n", 'new': "export * from './evidence-population.js';\nexport const loadLive = () => import('@syzygy/polaris-generation-consent/live');\n"}
ms = [
    ('T9-guard-skips-type-only-edges-alone', [{'file': TEST, 'old': OLD, 'new': SKIP_TYPE}]),
    ('T9b-guard-skips-type-only-edges-with-E1', [{'file': TEST, 'old': OLD, 'new': SKIP_TYPE}, E1]),
    ('T10-guard-skips-dynamic-edges-alone', [{'file': TEST, 'old': OLD, 'new': SKIP_DYN}]),
    ('T10b-guard-skips-dynamic-edges-with-O4', [{'file': TEST, 'old': OLD, 'new': SKIP_DYN}, O4]),
    ('T10c-guard-skips-dynamic-edges-with-E1', [{'file': TEST, 'old': OLD, 'new': SKIP_DYN}, E1]),
]
json.dump({'files': [TEST], 'mutants': [{'id': i, 'edits': e} for i, e in ms]}, open(sys.argv[1], 'w'), indent=1)
