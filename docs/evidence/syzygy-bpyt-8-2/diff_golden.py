"""syzygy-bpyt.8.2: compare two golden outputs row by row. Usage: diff_golden.py <kind: dossier|parse|sub> <a.json> <b.json>
Prints the row count, the number of rows that differ and up to five examples; exit 0 when none differs."""
import json, sys

kind, a_file, b_file = sys.argv[1:4]
a, b = json.load(open(a_file)), json.load(open(b_file))
groups = {'dossier': lambda d: {'dossier': d}, 'parse': lambda d: d, 'sub': lambda d: d}[kind]
total = differ = 0
examples = []
for name, rows in groups(a).items():
    other = groups(b)[name]
    assert len(rows) == len(other), (name, len(rows), len(other))
    for x, y in zip(rows, other):
        assert x['argv'] == y['argv'] and x.get('env') == y.get('env'), (x['argv'], y['argv'])
        total += 1
        if x != y:
            differ += 1
            if len(examples) < 5:
                examples.append({'group': name, 'argv': x['argv'], 'a': {k: v for k, v in x.items() if k not in ('argv', 'env')},
                                 'b': {k: v for k, v in y.items() if k not in ('argv', 'env')}})
print(json.dumps({'rows': total, 'differ': differ}))
for e in examples:
    print(json.dumps(e)[:400])
sys.exit(1 if differ else 0)
