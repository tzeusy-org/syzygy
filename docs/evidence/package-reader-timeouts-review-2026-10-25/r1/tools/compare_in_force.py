#!/usr/bin/env python3
"""Is #517's in-force.ts a byte-identical move of consent-ports.ts's in-force rules (rev-520)?

usage: python3 -I compare_in_force.py TREE BASE MAIN
Extracts each top-level declaration (ref, Dead, effective, inForceRecords, NotInForce, notInForceRecords) from
consent-ports.ts at BASE and in-force.ts at MAIN, strips a leading `export `, and compares the texts. Also reports which
module package-reader.ts and package-reader.test.ts import them from at each commit."""
import re, subprocess, sys

tree, base, main = sys.argv[1:4]
show = lambda rev, p: subprocess.run(['git', 'show', f'{rev}:{p}'], cwd=tree, capture_output=True, text=True, check=True).stdout
P = 'packages/polaris-generation-consent/src/'
old, new = show(base, P + 'consent-ports.ts'), show(main, P + 'in-force.ts')
START = re.compile(r'^(?:export )?(?:const ref\b|type Dead\b|function effective\b|function inForceRecords\b|type NotInForce\b|function notInForceRecords\b)', re.M)
def decls(text):
    out = {}
    for m in START.finditer(text):
        # include the doc comment immediately above, up to the declaration's end (next blank line at column 0 or next top-level token)
        s = m.start()
        lines = text[:s].split('\n')
        k = len(lines) - 1
        while k > 0 and (lines[k - 1].startswith('/**') or lines[k - 1].startswith(' *')): k -= 1
        begin = len('\n'.join(lines[:k])) + (1 if k else 0)
        rest = text[m.start():]
        if rest.startswith(('const', 'type', 'export const', 'export type')): end = m.start() + rest.index(';\n') + 2
        else: end = m.start() + rest.index('\n}\n') + 3
        name = re.search(r'(ref|Dead|effective|inForceRecords|NotInForce|notInForceRecords)', m.group(0)).group(1)
        out[name] = text[begin:end].replace('export ', '', 1) if text[begin:end].startswith('export ') else re.sub(r'^export ', '', text[begin:end], flags=re.M)
    return out
a, b = decls(old), decls(new)
print('declarations at base:', sorted(a), '| at main:', sorted(b))
for name in sorted(set(a) | set(b)):
    print(f'  {name}: identical={a.get(name) == b.get(name)}', '' if a.get(name) == b.get(name) else f'\n--- base\n{a.get(name)}\n--- main\n{b.get(name)}')
for rev in (base, main):
    for f in ('package-reader.ts', 'package-reader.test.ts', 'consent-ports.ts'):
        imports = [l for l in show(rev, P + f).split('\n') if l.startswith('import') and ('in-force' in l or 'consent-ports' in l)]
        print(rev[:8], f, imports)
