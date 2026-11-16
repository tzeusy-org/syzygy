"""rev-531: the proposed fix rows for N1 and N4, alone and beside each surviving mutant they target.

Usage: python3 -I fix_specs.py <rev-specs-head.json> <out.json> <tree at c90cd732>
Each FIX+<id> spec applies the mutant's edits, then the fix rows; FIX-alone applies the rows only and must survive."""
import json, sys
specs_file, out, tree = sys.argv[1:4]
WR = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
ARGV = 'packages/polaris-dossier/src/argv.test.ts'
TAR = "    ['a tarball dependency', 'dossier', { dependencies: { dossier: 'lib-0.0.0.tgz' } }, {}],\n"
GIT = "    ['a git dependency', 'dossier', { dependencies: { dossier: 'github:someone/dossier' } }],\n"
ROOTROW = "    expect(WORKSPACE.manifests.get('syzygy-workspace')?.dir).toBe('.');\n"
ALLOW = "  it(\"names allow-execution's options as the dossier options policy's\", () => {\n"
FIX = [
    {'file': WR, 'old': "import { join } from 'node:path';\n", 'new': "import { readFileSync } from 'node:fs';\nimport { join } from 'node:path';\n"},
    {'file': WR, 'old': TAR, 'new': TAR + "    ['a ./ path dependency', 'dossier', { dependencies: { dossier: './lib' } }, {}],\n"
        "    ['a dependency on its own directory', 'dossier', { dependencies: { dossier: '.' } }, {}],\n"
        "    ['a .tar dependency', 'dossier', { dependencies: { dossier: 'lib-0.0.0.tar' } }, {}],\n"
        "    ['a .tar.gz dependency', 'dossier', { dependencies: { dossier: 'lib-0.0.0.tar.gz' } }, {}],\n"},
    {'file': WR, 'old': GIT, 'new': GIT + "    ['a registry tilde range', 'dossier', { dependencies: { dossier: '~1.2.3' } }],\n"
        "    ['a git dependency whose path holds .tgz', 'dossier', { dependencies: { dossier: 'git+https://example.com/lib.tgz.git' } }],\n"},
    {'file': WR, 'old': ROOTROW, 'new': "    expect(WORKSPACE.manifests.get('syzygy-workspace')).toEqual({ dir: '.', ...JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) });\n"},
    {'file': ARGV, 'old': "['main.ts', 'reader.mts', 'reader.cts', 'view.tsx', 'main.test.ts',", 'new': "['latest.ts', 'main.ts', 'reader.mts', 'reader.cts', 'view.tsx', 'notes.ts.md', 'main.test.ts',"},
    {'file': ARGV, 'old': ".calls).toEqual(['main.ts', 'reader.cts', 'reader.mts', 'view.tsx']", 'new': ".calls).toEqual(['latest.ts', 'main.ts', 'reader.cts', 'reader.mts', 'view.tsx']"},
    {'file': ARGV, 'old': ALLOW, 'new': "  it('reads every src directory to its depth', () => {\n    expect(treeFiles()).toContain('apps/three-surface-poc/src/polaris-generation/self-corpus.ts');\n  });\n\n" + ALLOW},
]
mut = {m['id']: m for m in json.load(open(specs_file))['mutants']}
targets = ['R1-dot-slash-dropped', 'R2-bare-dot-dropped', 'R3-tar-forms-dropped', 'R4-tilde-loosened', 'R5-tarball-end-anchor-dropped',
           'R6-root-dependencies-dropped', 'C1-extension-end-anchor-dropped', 'C4-test-dot-dropped', 'S2-tree-not-recursive']
base = mut['RV531-' + targets[0]]
out_specs = [{'id': 'FIX-alone', 'what': 'the proposed rows, no mutant', 'projects': base['projects'], 'files': base['files'], 'edits': FIX}]
for t in targets:
    m = mut['RV531-' + t]
    out_specs.append({'id': 'FIX+' + t, 'what': 'the proposed rows beside ' + t, 'projects': m['projects'], 'files': m['files'], 'edits': m['edits'] + FIX})
for e in FIX:
    n = open(f"{tree}/{e['file']}").read().count(e['old'])
    assert n == 1, (e['old'][:50], n)
json.dump({'mutants': out_specs}, open(out, 'w'), indent=1, ensure_ascii=False)
print(len(out_specs))
