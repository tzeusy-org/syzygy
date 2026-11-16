# Usage: node_targets.py <scratch dir>: which package export targets Node 24 loads, refuses or ignores (reviewer probe, PR 554).
import json, os, subprocess, sys
root = sys.argv[1]
cases = {
    'plain': './dist/index.js',
    'dotdot': './dist/x/../index.js',
    'dot': './dist/./index.js',
    'empty-segment': './dist//index.js',
    'types-dotdot': {'types': './dist/x/../index.d.ts', 'import': './dist/index.js', 'default': './dist/index.js'},
}
out = {}
for name, target in cases.items():
    pkg = os.path.join(root, 'node_modules', f'p-{name}')
    os.makedirs(os.path.join(pkg, 'dist', 'x'), exist_ok=True)
    json.dump({'name': f'p-{name}', 'type': 'module', 'exports': {'.': target}}, open(os.path.join(pkg, 'package.json'), 'w'))
    open(os.path.join(pkg, 'dist', 'index.js'), 'w').write("export const ok = 'loaded';\n")
    p = subprocess.run(['node', '--input-type=module', '-e', f"import('p-{name}').then((m) => console.log(m.ok), (e) => console.log(e.code))"],
                       cwd=root, capture_output=True, text=True)
    out[name] = {'target': target, 'node': p.stdout.strip(), 'stderr': p.stderr.strip()[:200]}
print(json.dumps(out, indent=1))
