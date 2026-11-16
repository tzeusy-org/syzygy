"""rev-524: mutant R-X9 at run time. In a clean, built tree, put a `node` condition ahead of `import` in polaris-dossier's `./argv`
export, write a probe module under apps/syzygy that resolves `@syzygy/polaris-dossier/argv`, run it with node, and restore every byte.

Usage: python3 -I cond_probe.py <tree> <out.json>
"""
import json, os, subprocess, sys

tree, out_file = sys.argv[1:3]
PKG = os.path.join(tree, 'packages/polaris-dossier/package.json')
PROBE = os.path.join(tree, 'apps/syzygy/zz-r524-cond-probe.mjs')
OLD = '      "types": "./dist/argv.d.ts",\n      "import": "./dist/argv.js",'
NEW = '      "types": "./dist/argv.d.ts",\n      "node": "./dist/index.js",\n      "import": "./dist/argv.js",'


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, text=True, check=True).stdout


assert git('status', '--porcelain') == ''
pkg0 = open(PKG, 'rb').read()
result = {}
try:
    open(PROBE, 'w').write("console.log(import.meta.resolve('@syzygy/polaris-dossier/argv'));\n")
    before = subprocess.run(['node', PROBE], cwd=os.path.join(tree, 'apps/syzygy'), capture_output=True, text=True, timeout=120)
    text = pkg0.decode()
    assert text.count(OLD) == 1
    open(PKG, 'w').write(text.replace(OLD, NEW))
    after = subprocess.run(['node', PROBE], cwd=os.path.join(tree, 'apps/syzygy'), capture_output=True, text=True, timeout=120)
    result = {'unmutated': before.stdout.strip().replace(tree, '<tree>'), 'mutated': after.stdout.strip().replace(tree, '<tree>'),
              'exits': [before.returncode, after.returncode], 'stderr': (before.stderr + after.stderr).strip()[-600:]}
finally:
    open(PKG, 'wb').write(pkg0)
    if os.path.exists(PROBE):
        os.remove(PROBE)
result['cleanAfter'] = git('status', '--porcelain') == ''
json.dump(result, open(out_file, 'w'), indent=1)
print(json.dumps(result, indent=1))
