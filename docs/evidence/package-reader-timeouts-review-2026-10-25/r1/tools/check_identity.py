#!/usr/bin/env python3
"""Byte-identity and placement check for the package-reader.test.ts timeouts (rev-520).

usage: python3 -I check_identity.py TREE BASE HEAD
1. Reverse the change on HEAD's bytes (drop the syzygy-bpyt.4.13 comment block and the blank line after it; turn each
   `}, N_000);` closer back into `});`) and compare with BASE's bytes.
2. A second, independent method: difflib over the two line lists, reporting every non-equal opcode.
3. For each timeout closer, walk up to the opener at the same indentation and report its kind (it/test/describe/hook) and
   its name with the enclosing describe path (source-parsed, independent of vitest)."""
import difflib, hashlib, json, re, subprocess, sys

FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'
tree, base_rev, head_rev = sys.argv[1:4]
show = lambda rev: subprocess.run(['git', 'show', f'{rev}:{FILE}'], cwd=tree, capture_output=True, check=True).stdout
base, head = show(base_rev), show(head_rev)
print('base sha256', hashlib.sha256(base).hexdigest(), 'head sha256', hashlib.sha256(head).hexdigest())
CLOSER = re.compile(r'^( *)\}, (\d+)_000\);$')
bl, hl = base.decode('utf8').split('\n'), head.decode('utf8').split('\n')
print('base lines', len(bl), 'head lines', len(hl))
print('closers of the form "}, N_000);" in base:', sum(bool(CLOSER.match(l)) for l in bl), 'in head:', sum(bool(CLOSER.match(l)) for l in hl))
# 1. reverse
out, i, comment_lines, replaced = [], 0, 0, []
while i < len(hl):
    line = hl[i]
    if line.startswith('// Explicit timeouts (syzygy-bpyt.4.13)'):
        j = i
        while j < len(hl) and hl[j].startswith('//'): j += 1
        comment_lines = j - i
        assert hl[j] == '', 'comment block not followed by a blank line'
        i = j + 1
        continue
    m = CLOSER.match(line)
    if m:
        replaced.append((i + 1, int(m.group(2)) * 1000))
        out.append(f'{m.group(1)}}});')
    else:
        out.append(line)
    i += 1
reversed_bytes = '\n'.join(out).encode('utf8')
print('comment block lines dropped:', comment_lines, '(+1 blank)', 'closers reverted:', len(replaced))
print('METHOD 1 reversed head == base bytes:', reversed_bytes == base, hashlib.sha256(reversed_bytes).hexdigest())
# 2. difflib
ops = [op for op in difflib.SequenceMatcher(a=bl, b=hl, autojunk=False).get_opcodes() if op[0] != 'equal']
kinds = {}
nontrivial = []
for tag, a0, a1, b0, b1 in ops:
    a, b = bl[a0:a1], hl[b0:b1]
    if tag == 'insert' and all(x.startswith('//') or x == '' for x in b): kinds['comment-insert'] = kinds.get('comment-insert', 0) + 1; continue
    if tag == 'replace' and len(a) == len(b) and all(x.strip() == '});' and CLOSER.match(y) and x.split('}')[0] == y.split('}')[0] for x, y in zip(a, b)):
        kinds['closer-replace'] = kinds.get('closer-replace', 0) + len(a); continue
    nontrivial.append((tag, a0 + 1, a1, b0 + 1, b1, a, b))
print('METHOD 2 difflib opcodes:', len(ops), kinds, 'other:', len(nontrivial))
for n in nontrivial: print('  OTHER', n)
# 3. placement
def js_string(s):
    q = s[0]
    if q not in "'\"`": return None
    buf, k = [], 1
    while k < len(s):
        c = s[k]
        if c == '\\': buf.append(s[k + 1]); k += 2; continue
        if c == q: return ''.join(buf)
        buf.append(c); k += 1
    return None
OPEN = re.compile(r'^( *)(it|test|describe|beforeAll|beforeEach|afterAll|afterEach)(\.\w+)?\((.*)$')
rows = []
for lineno, timeout in replaced:
    idx = lineno - 1
    indent = len(hl[idx]) - len(hl[idx].lstrip(' '))
    k = idx - 1
    while k >= 0:
        m = OPEN.match(hl[k])
        if m and len(m.group(1)) == indent: break
        if hl[k].strip() and (len(hl[k]) - len(hl[k].lstrip(' '))) < indent: k = -1; break
        k -= 1
    if k < 0: rows.append({'line': lineno, 'timeout': timeout, 'opener': None}); continue
    kind, name = OPEN.match(hl[k]).group(2), js_string(OPEN.match(hl[k]).group(4))
    path, want = [], indent
    for p in range(k - 1, -1, -1):
        m = OPEN.match(hl[p])
        if m and m.group(2) == 'describe' and len(m.group(1)) < want:
            path.insert(0, js_string(m.group(4))); want = len(m.group(1))
    rows.append({'line': lineno, 'timeout': timeout, 'openerLine': k + 1, 'kind': kind, 'fullName': ' '.join([*path, name])})
print('METHOD 3 placement: kinds', {r.get('kind') for r in rows})
for r in rows: print(f"  L{r['line']} {r['timeout']} ms {r.get('kind')} @L{r.get('openerLine')}: {r.get('fullName')}")
json.dump(rows, open(sys.argv[4], 'w'), indent=1) if len(sys.argv) > 4 else None
