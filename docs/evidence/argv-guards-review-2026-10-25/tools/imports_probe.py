"""rev-524: does a package.json `imports` alias (mutant R-X6) really load the dossier barrel, and does TypeScript accept it?
In a clean, built tree: add `"imports": {"#dossier": "@syzygy/polaris-dossier"}` to apps/syzygy/package.json, write a probe module
beside it that resolves and imports `#dossier`, run it with node; then add `import '#dossier';` to main.ts and type-check apps/syzygy
with tsc --noEmit. Every byte is restored and the probe file deleted; the tree must be clean after.

Usage: python3 -I imports_probe.py <tree> <out.json>
"""
import json, os, subprocess, sys

tree, out_file = sys.argv[1:3]
PKG = os.path.join(tree, 'apps/syzygy/package.json')
MAIN = os.path.join(tree, 'apps/syzygy/src/main.ts')
PROBE = os.path.join(tree, 'apps/syzygy/zz-r524-probe.mjs')
STATE = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, text=True, check=True).stdout


assert git('status', '--porcelain') == ''
pkg0, main0 = open(PKG, 'rb').read(), open(MAIN, 'rb').read()
result = {}
try:
    text = pkg0.decode()
    assert text.count('  "main": "./dist/main.js",\n') == 1
    open(PKG, 'w').write(text.replace('  "main": "./dist/main.js",\n', '  "main": "./dist/main.js",\n  "imports": { "#dossier": "@syzygy/polaris-dossier" },\n'))
    open(PROBE, 'w').write("console.log(import.meta.resolve('#dossier'));\nconst m = await import('#dossier');\n"
                           "console.log('runDossierCli' in m, 'runPolarisCli' in m);\n")
    run = subprocess.run(['node', PROBE], cwd=os.path.join(tree, 'apps/syzygy'), capture_output=True, text=True, timeout=120)
    result['node'] = {'exit': run.returncode, 'stdout': run.stdout.strip().replace(tree, '<tree>'), 'stderr': run.stderr.strip()[-800:]}
    src = main0.decode()
    assert src.count(STATE) == 1
    open(MAIN, 'w').write(src.replace(STATE, STATE + "import '#dossier';\n"))
    tsc = subprocess.run(['npx', 'tsc', '-p', 'apps/syzygy', '--noEmit'], cwd=tree, capture_output=True, text=True, timeout=600)
    result['tsc'] = {'exit': tsc.returncode, 'output': (tsc.stdout + tsc.stderr).strip()[-1500:].replace(tree, '<tree>')}
finally:
    open(PKG, 'wb').write(pkg0)
    open(MAIN, 'wb').write(main0)
    if os.path.exists(PROBE):
        os.remove(PROBE)
result['cleanAfter'] = git('status', '--porcelain') == ''
json.dump(result, open(out_file, 'w'), indent=1)
print(json.dumps(result, indent=1))
