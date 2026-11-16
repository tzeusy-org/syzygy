"""rev-540: the second spec set. T8 at HEAD (the guard's sanity pin), and G3/G4/G6 at BASE, to show which survivors predate the PR.
Usage: python3 -I make_specs_2.py <head-out.json> <base-out.json>
"""
import json, sys
GATE = 'apps/three-surface-poc/src/git-observation.ts'
TEST = 'apps/three-surface-poc/src/git-observation.test.ts'
EXACT = "  const exactInputs = new Set(['package.json', 'package-lock.json', 'tsconfig.base.json']);\n"
head = [('T8-guard-walk-follows-no-edge', [{'file': TEST, 'old': "ts.preProcessFile(readModule(file), true, true).importedFiles.map((imported) => imported.fileName)", 'new': "([] as string[])"}])]
base = [
    ('G3-exact-input-package-lock-dropped@base', [{'file': GATE, 'old': EXACT, 'new': "  const exactInputs = new Set(['package.json', 'tsconfig.base.json']);\n"}]),
    ('G4-exact-input-tsconfig-base-dropped@base', [{'file': GATE, 'old': EXACT, 'new': "  const exactInputs = new Set(['package.json', 'package-lock.json']);\n"}]),
    ('G6-http-host-prefix-without-trailing-slash@base', [{'file': GATE, 'old': "    'packages/http-host/',\n", 'new': "    'packages/http-host',\n"}]),
]
for out, ms in ((sys.argv[1], head), (sys.argv[2], base)):
    json.dump({'files': [TEST], 'mutants': [{'id': i, 'edits': e} for i, e in ms]}, open(out, 'w'), indent=1)
