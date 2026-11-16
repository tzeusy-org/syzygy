"""Round-3 fidelity: N1's pin and N2's row against the round-2 raw, and production bytes at three commits."""
import hashlib, subprocess, sys
S = '/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad'
C = S + '/rev-544-r3/c'
raw = open(S + '/rev-544-r2/R-GP-IMPL-CRLF-MASK-2-RAW.md', encoding='utf-8').read().split('\n')
def show(rev, path):
    return subprocess.run(['git', '-C', C, 'show', f'{rev}:{path}'], capture_output=True, check=True).stdout
# raw lines 324-336 (1-based) are the ```ts fence (324, 336) and the N1 block (325-335), indented by two spaces
blk = raw[324:335]
print('raw 324:', repr(raw[323]), ' raw 336:', repr(raw[335]))
pin = '\n'.join(l[2:] if l.startswith('  ') else l for l in blk) + '\n'
T = 'packages/three-surface-poc-core/src/markdown-code-context.test.ts'
G = 'packages/three-surface-poc-core/src/git-object-reader.test.ts'
head = show('1ff3ed7d', T).decode('utf-8'); base = show('561e4f77', T).decode('utf-8')
print('N1 pin occurrences at 1ff3ed7d:', head.count(pin), ' at 561e4f77:', base.count(pin))
# N2 row as the repair list specifies (the raw gives only its shape)
row = ("  // The same three at a fence position: a closer followed by a separator is a closer followed by text, so the fence stays unclosed.\n"
       "  it('U+2028, U+2029 and U+0085 after a closing fence are line content: the fence stays unclosed', () => {\n"
       "    for (const separator of ['\\u2028', '\\u2029', '\\u0085']) expect(malformed(['```', 'x', '```' + separator].join('\\n')), JSON.stringify(separator)).toEqual({ reason: 'unclosed-fence', line: 1 });\n"
       "  });\n")
print('N2 row occurrences at head:', head.count(row))
print('raw N2 shape present in row:', "['```', 'x', '```' + separator].join('\\n')" in row and "{ reason: 'unclosed-fence', line: 1 }" in row)
# head minus (row + blank + pin + blank) == base ?
stripped = head.replace(row + '\n', '', 1).replace(pin + '\n', '', 1)
print('markdown test: head minus row+pin == 561e4f77:', stripped == base)
gh = show('1ff3ed7d', G).decode('utf-8'); gb = show('561e4f77', G).decode('utf-8')
rw10 = ("\n  it('U+2028 is line content: an LF text reports its finding on line 1', () => {\n"
        "    expect(scanActiveContent('a\\u2028<script>x</script>')).toEqual([{ form: 'script-element', line: 1, column: 3 }, { form: 'script-element', line: 1, column: 12 }]);\n"
        "  });\n")
print('git-object-reader test: head minus RW10 pin == 561e4f77:', gh.replace(rw10, '', 1) == gb, gh.count(rw10))
for name, txt in (('md', head), ('gor', gh)):
    print(name, 'U+00A0', txt.count('\xa0'), 'U+FEFF', txt.count('\ufeff'), 'CR', txt.count('\r'), 'nonascii', sum(1 for ch in txt if ord(ch) > 127))
# production files: every tracked non-test file under apps/ packages/ scripts/ and root manifests, at three commits
def tree(rev):
    out = subprocess.run(['git', '-C', C, 'ls-tree', '-r', '-z', rev], capture_output=True, check=True).stdout
    d = {}
    for ent in out.split(b'\0'):
        if not ent: continue
        meta, path = ent.split(b'\t', 1); d[path.decode()] = meta.split()[2].decode()
    return d
t = {r: tree(r) for r in ('6928b50a', '561e4f77', '1ff3ed7d')}
def prod(p):
    if not (p.startswith(('apps/', 'packages/', 'scripts/')) or '/' not in p): return False
    return not any(x in p for x in ('.test.', '/test/', '/tests/', '__fixtures__', '/fixtures/'))
allp = sorted(set().union(*[set(x) for x in t.values()]))
P = [p for p in allp if prod(p)]
diff = {r: [p for p in P if t[r].get(p) != t['6928b50a'].get(p)] for r in ('561e4f77', '1ff3ed7d')}
print('production-path population', len(P))
d2 = [p for p in P if t['1ff3ed7d'].get(p) != t['561e4f77'].get(p)]
print('production paths differing 561e4f77 vs 1ff3ed7d:', len(d2), d2)
tf = tree('f7ea8584'); tb = tree('d621bfa2')
for p in diff['561e4f77']:
    print('  6928b50a!=561e4f77:', p, '561e4f77 blob == main f7ea8584 blob:', t['561e4f77'].get(p) == tf.get(p), '; 6928b50a blob == d621bfa2 blob:', t['6928b50a'].get(p) == tb.get(p))
M = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
for r in t: print(r, M, hashlib.sha256(show(r, M)).hexdigest())
# every path changed 561e4f77..1ff3ed7d
ch = subprocess.run(['git', '-C', C, 'diff', '--name-only', '561e4f77', '1ff3ed7d'], capture_output=True, text=True).stdout.split()
print('changed paths', len(ch)); [print(' ', p) for p in ch]
