"""rev-536: check proposed rows for the survivors M2, M7, M8 and M9: all four rows together pass, and each kills its mutant alone.

Usage: python3 -I fix_specs.py <tree> <rev536-specs.json> <out.json>
"""
import json, os, sys

tree, mutants_file, out = sys.argv[1:4]
REACH = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
URL_ROW = "    ['a remote tarball URL dependency', 'dossier', { dependencies: { dossier: 'https://example.com/lib-1.0.0.tgz' } }, {}],\n"
ROOT_ROW_END = "    expect(WORKSPACE.manifests.get('syzygy-workspace')).toEqual({ dir: '.', ...JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) });\n  });\n"
ROWS = URL_ROW + (
    "    ['a remote http tarball URL dependency', 'dossier', { dependencies: { dossier: 'http://example.com/lib-1.0.0.tar.gz' } }, {}],\n"
    "    ['an npm: alias of a registry package', 'dossier', { dependencies: { dossier: 'npm:typescript@^5.5.0' } }, {}],\n"
    "    ['a dependency on its parent directory', 'dossier', { dependencies: { dossier: '..' } }, {}],\n")
ROOT_FIX = ROOT_ROW_END + (
    "\n  it(\"reads a bare name the workspace root's manifest declares as a local dependency as naming no module\", () => {\n"
    "    const { manifests, isFile } = workspace({});\n"
    "    const root: Manifest = { name: 'root', dir: '.', devDependencies: { dossier: './packages/lib' } };\n"
    "    expect(resolveIn({ manifests: new Map([...manifests, [root.name, root]]), isFile }, 'apps/app/src/main.ts', 'dossier')).toBeUndefined();\n"
    "  });\n")
FIX = [{'file': REACH, 'old': URL_ROW, 'new': ROWS}, {'file': REACH, 'old': ROOT_ROW_END, 'new': ROOT_FIX}]
mutants = {m['id']: m for m in json.load(open(mutants_file))['mutants']}
base = {k: mutants['RV536-M2-http-url-reads-outside'][k] for k in ('projects', 'files')}
specs = [{'id': 'FIX-rows-only', 'what': 'the four proposed rows, no mutant', **base, 'edits': FIX}]
for i in ('RV536-M2-http-url-reads-outside', 'RV536-M7-npm-alias-workspace-scope-only', 'RV536-M8-root-declarations-unread', 'RV536-M9-dotdot-alone-outside'):
    specs.append({'id': f'FIX+{i}', 'what': f'the four proposed rows, with {i}', **base, 'edits': [*FIX, *mutants[i]['edits']]})
for s in specs:
    for e in s['edits']:
        assert open(os.path.join(tree, e['file'])).read().count(e['old']) == 1, (s['id'], e['old'][:60])
json.dump({'what': 'rev-536 proposed rows', 'mutants': specs}, open(out, 'w'), indent=1)
print(len(specs), 'specs')
