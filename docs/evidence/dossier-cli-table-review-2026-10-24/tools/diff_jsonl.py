"""Compare two JSONL result files row by row; print the denominator, the differing count and up to 10 differing rows.
Usage: diff_jsonl.py <base.jsonl> <head.jsonl> [label]"""
import json, sys, collections

a = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
b = [json.loads(l) for l in open(sys.argv[2]) if l.strip()]
label = sys.argv[3] if len(sys.argv) > 3 else ''
assert len(a) == len(b), (len(a), len(b))
differ = [(x, y) for x, y in zip(a, b) if x != y]
by = collections.Counter(x.get('caller', 'dossier') for x in a)
dby = collections.Counter(x.get('caller', 'dossier') for x, _ in differ)
print(json.dumps({'label': label, 'rows': len(a), 'differ': len(differ), 'rowsByCaller': by, 'differByCaller': dby}))
for x, y in differ[:10]:
    print('BASE', json.dumps(x)[:600])
    print('HEAD', json.dumps(y)[:600])
