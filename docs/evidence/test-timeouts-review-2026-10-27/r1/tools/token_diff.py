"""token_diff.py: classify every token-level difference between two commits over a file list (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 token_diff.py <base-tokens.jsonl> <head-tokens.jsonl> <base-census.json> <head-census.json>
Allowed differences, and nothing else:
  A. a deleted `, <timeout>` immediately before `)`, where <timeout> is the expression of a census site at the base
     that is absent at the head (a removal);
  B. a deleted `const <Name> = <NumericLiteral> ;` whose <Name> is the expression of such a removed site.
Every other opcode is printed as a violation. The removed sites the diff accounts for are compared with the censuses'
own difference (base sites less head sites, matched by path, kind and timeout text, in order).
"""
import difflib, json, sys
from collections import Counter

def load(p):
    return {r['path']: r for r in map(json.loads, open(p))}

base, head = load(sys.argv[1]), load(sys.argv[2])
bc, hc = json.load(open(sys.argv[3])), json.load(open(sys.argv[4]))
removed_expected = Counter()
bsites = Counter((s['path'], s['kind'], s.get('timeout')) for s in bc['sitesList'])
hsites = Counter((s['path'], s['kind'], s.get('timeout')) for s in hc['sitesList'])
for k, n in bsites.items():
    if n > hsites.get(k, 0): removed_expected[(k[0], k[2])] += n - hsites.get(k, 0)
removed_seen = Counter()
violations = []
consts = {}
for path in sorted(base):
    if base[path].get('missing') or head[path].get('missing'):
        violations.append((path, 'missing on one side')); continue
    a = [(t[0], t[1]) for t in base[path]['tokens']]
    b = [(t[0], t[1]) for t in head[path]['tokens']]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal': continue
        seg = a[i1:i2]
        ok = False
        if op == 'delete':
            texts = [t[1] for t in seg]
            # A: `, X` before `)` (the next base token)
            if len(seg) == 2 and texts[0] == ',' and i2 < len(a) and a[i2][1] == ')':
                removed_seen[(path, texts[1])] += 1; ok = True
            # B: `const NAME = NUM ;`
            elif len(seg) == 5 and texts[0] == 'const' and seg[1][0] == 'Identifier' and texts[2] == '=' and seg[3][0] in ('NumericLiteral', 'FirstLiteralToken') and texts[4] == ';':
                consts[(path, texts[1])] = texts[3]; ok = True
            # difflib may align `, X )` as deleting `X ,`-shifted pairs; report those for a human
        if not ok:
            violations.append((path, op, [t[1] for t in seg], [t[1] for t in b[j1:j2]], base[path]['tokens'][i1][2] if i1 < len(a) else None))
# a deleted constant must be the expression of removed sites in its file, and no longer used at the head
for (path, name), value in consts.items():
    if removed_seen.get((path, name), 0) == 0:
        violations.append((path, 'deleted const not a removed site expression', name, value))
    if any(t[1] == name for t in head[path]['tokens']):
        violations.append((path, 'deleted const still referenced at head', name))
print('files', len(base), 'violations', len(violations))
for v in violations: print('VIOLATION', v)
print('removed sites seen by token diff', sum(removed_seen.values()), 'expected by census difference', sum(removed_expected.values()))
print('seen != expected:', sorted(set(removed_seen.items()) ^ set(removed_expected.items())))
print('deleted constants', consts)
