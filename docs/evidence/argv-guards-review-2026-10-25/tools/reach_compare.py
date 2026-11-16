"""rev-524: compare the island guard's resolver at base with workspace-reach.testkit.ts at head, from the git objects.

Normalisations applied to the head text only, each printed: a leading `export ` dropped; `readModule(X)` read as
`readFileSync(join(ROOT, X), 'utf8')`. Prints a unified diff of the manifests block, `isFile`, `resolve`, and the two walk loops.

Usage: python3 -I reach_compare.py <repo> <base> <head>
"""
import difflib, re, subprocess, sys

repo, base, head = sys.argv[1:4]


def show(commit, path):
    return subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=repo, capture_output=True, check=True).stdout.decode()


old = show(base, 'packages/polaris-generation-core/src/island-boundary.test.ts')
new = show(head, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts')


def block(text, start, end):
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


def norm(text):
    text = re.sub(r'^export ', '', text, flags=re.M)
    return re.sub(r'readModule\(([^)]*)\)', r"readFileSync(join(ROOT, \1), 'utf8')", text)


pairs = [
    ('isFile', block(old, 'const isFile', '\n'), norm(block(new, 'export const isFile', '\n'))),
    ('manifests', block(old, 'const manifests', '\n}\n') , norm(block(new, 'const manifests', '\n}\n'))),
    ('resolve', block(old, '/** The module a specifier names', '\n}\n'), norm(block(new, '/** The module a specifier names', '\n}\n'))),
    ('walk loop', block(old, '  const seen = new Set([entry]);', '  return {'), norm(block(new, '  const seen = new Set([entry]);', '  return {'))),
]
for name, a, b in pairs:
    same = a == b
    print(f'== {name}: {"identical after normalisation" if same else "DIFFERS"} ({len(a)} vs {len(b)} chars)')
    if not same:
        for line in difflib.unified_diff(a.split('\n'), b.split('\n'), 'base', 'head', lineterm='', n=1):
            print('   ', line)
