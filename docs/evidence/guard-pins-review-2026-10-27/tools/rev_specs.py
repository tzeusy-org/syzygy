"""rev-531 own mutants, independent of the lane's own_specs.py.

Usage: python3 -I rev_specs.py <repo> <out-head.json> <out-base.json>
Writes the mutant specs in mut.py's format and checks, by `git show`, that each edit's `old` occurs exactly once in its file at
the commit the spec targets (head c90cd732 for every mutant; base 8ff50172 also for the tree forms and S2, whose fragments
exist there). Every mutant runs all four guard files.
"""
import json, subprocess, sys

repo, out_head, out_base = sys.argv[1:4]
HEAD, BASE = 'c90cd7327a24fee44d0e7135872a3b08277c73b0', '8ff50172b127cba676ff32ce62c12c91b2b0d924'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
ARGV = 'packages/polaris-dossier/src/argv.test.ts'
PROJECTS = ['@syzygy/polaris-generation-core', '@syzygy/polaris-dossier']
FILES = ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
         'packages/polaris-dossier/src/subpath-imports.test.ts', ARGV]
LV = r"const LOCAL_VERSION = /^(?:file:|link:|workspace:|npm:|\.\.?(?:\/|$)|\/|~\/)|\.(?:tgz|tar|tar\.gz)$/iu;"
MAIN_OLD = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
def lv(new): return [{'file': KIT, 'old': LV, 'new': new}]
def main_import(name): return {'file': 'apps/syzygy/src/main.ts', 'old': MAIN_OLD, 'new': MAIN_OLD + f"import '{name}';\n"}
mutants = [
    ('R1-dot-slash-dropped', 'head', 'a ./x version no longer reads as local', lv(LV.replace(r'\.\.?(?:\/|$)', r'\.\.(?:\/|$)'))),
    ('R2-bare-dot-dropped', 'head', 'a version of . or .. alone no longer reads as local', lv(LV.replace(r'\.\.?(?:\/|$)', r'\.\.?\/'))),
    ('R3-tar-forms-dropped', 'head', 'only .tgz reads as a tarball; .tar and .tar.gz do not', lv(LV.replace(r'\.(?:tgz|tar|tar\.gz)$', r'\.tgz$'))),
    ('R4-tilde-loosened', 'head', 'the home-path arm loosened from ~/ to ~, so a ~1.2.3 registry range reads as local', lv(LV.replace(r'|~\/)', r'|~)'))),
    ('R5-tarball-end-anchor-dropped', 'head', 'the tarball arm no longer anchored at the end', lv(LV.replace(r'tar\.gz)$/iu', r'tar\.gz)/iu'))),
    ('R6-root-dependencies-dropped', 'head', "the root manifest is kept in the map, but without its dependency fields",
     [{'file': KIT, 'old': "manifests.set(root.name, { dir: '.', ...root });", 'new': "manifests.set(root.name, { dir: '.', name: root.name });"}]),
    ('R7-own-package-only', 'head', "only the importing package's own manifest's local dependencies count",
     [{'file': KIT, 'old': "  if (named === null) return localNames(workspace).has(",
       'new': "  if (named === null) return localNames({ ...workspace, manifests: new Map([...workspace.manifests].filter(([, manifest]) => from.startsWith(`${manifest.dir}/`))) }).has("}]),
    ('R8-git-reads-local', 'head', 'a git version (git+..., github:...) also reads as local', lv(LV.replace('^(?:file:|', '^(?:file:|git|'))),
    ('C1-extension-end-anchor-dropped', 'head', "the census population's extension test is no longer anchored at the end",
     [{'file': ARGV, 'old': r"files.filter((module) => /\.[cm]?tsx?$/u.test(module)", 'new': r"files.filter((module) => /\.[cm]?tsx?/u.test(module)"}]),
    ('C2-cts-dropped', 'head', 'the census population leaves .cts out (keeps .mts)',
     [{'file': ARGV, 'old': r"files.filter((module) => /\.[cm]?tsx?$/u.test(module)", 'new': r"files.filter((module) => /\.m?tsx?$/u.test(module)"}]),
    ('C3-tsx-tests-kept', 'head', 'the test exclusion no longer covers .test.tsx',
     [{'file': ARGV, 'old': r"!/\.test\.[cm]?tsx?$/u.test(module)", 'new': r"!/\.test\.[cm]?ts$/u.test(module)"}]),
    ('C4-test-dot-dropped', 'head', "the test exclusion drops its leading dot, so a module named like latest.ts is left out",
     [{'file': ARGV, 'old': r"!/\.test\.[cm]?tsx?$/u.test(module)", 'new': r"!/test\.[cm]?tsx?$/u.test(module)"}]),
    ('S1-parse-rereads-tree', 'head', 'the injected reader decides membership, but the module parsed is re-read from the tree',
     [{'file': ARGV, 'old': "    const source = ts.createSourceFile(module, text, ts.ScriptTarget.Latest, true);\n    const visit",
       'new': "    const source = ts.createSourceFile(module, readTree(module), ts.ScriptTarget.Latest, true);\n    const visit"}]),
    ('S2-tree-not-recursive', 'both', 'the tree population reads only the top level of each src directory',
     [{'file': ARGV, 'old': "fs.readdirSync(path.join(ROOT, dir), { recursive: true, encoding: 'utf8' })", 'new': "fs.readdirSync(path.join(ROOT, dir), { encoding: 'utf8' })"}]),
    ('T1-root-dot-slash-alias', 'both', 'tree: the root manifest declares dossier as ./packages/polaris-dossier, and main.ts imports it',
     [{'file': 'package.json', 'old': '  "devDependencies": {\n', 'new': '  "devDependencies": {\n    "dossier": "./packages/polaris-dossier",\n'}, main_import('dossier')]),
    ('T2-remote-tarball-faithful', 'both', 'tree (faithful): apps/syzygy declares remote-lib as a remote https tarball, and main.ts imports it; no workspace module is named',
     [{'file': 'apps/syzygy/package.json', 'old': '  "dependencies": {\n', 'new': '  "dependencies": {\n    "remote-lib": "https://example.com/remote-lib-1.0.0.tgz",\n'}, main_import('remote-lib')]),
    ('T3-root-bare-path-alias', 'both', 'tree: the root manifest declares dossier as packages/polaris-dossier/ (no leading ./), which npm-package-arg reads as a directory, and main.ts imports it',
     [{'file': 'package.json', 'old': '  "devDependencies": {\n', 'new': '  "devDependencies": {\n    "dossier": "packages/polaris-dossier/",\n'}, main_import('dossier')]),
    ('T4-npm-alias-registry-faithful', 'both', 'tree (faithful): the root manifest declares ts5 as npm:typescript@^5.5.0, and main.ts imports it; no workspace module is named',
     [{'file': 'package.json', 'old': '  "devDependencies": {\n', 'new': '  "devDependencies": {\n    "ts5": "npm:typescript@^5.5.0",\n'}, main_import('ts5')]),
]
def show(commit, path):
    return subprocess.run(['git', '-C', repo, 'show', f'{commit}:{path}'], capture_output=True, check=True).stdout.decode()
head_specs, base_specs, problems = [], [], []
for mid, where, what, edits in mutants:
    spec = {'id': f'RV531-{mid}', 'what': what, 'projects': PROJECTS, 'files': FILES, 'edits': edits}
    for commit, bucket, wanted in ((HEAD, head_specs, True), (BASE, base_specs, where == 'both')):
        if not wanted: continue
        for e in edits:
            n = show(commit, e['file']).count(e['old'])
            if n != 1: problems.append(f"{mid} {commit[:8]} {e['file']} old occurs {n}")
            if e['old'] == e['new']: problems.append(f'{mid} no-op edit')
        bucket.append(spec)
json.dump({'mutants': head_specs}, open(out_head, 'w'), indent=1, ensure_ascii=False)
json.dump({'mutants': base_specs}, open(out_base, 'w'), indent=1, ensure_ascii=False)
print('head', len(head_specs), 'base', len(base_specs), 'problems', problems)
