"""Per row of a rev_mutants messages file: the first line of each failure message, and whether any names a timeout."""
import json, re, sys
m = json.load(open(sys.argv[1]))
bad = 0
for rid, fails in m.items():
    if not fails:
        continue
    heads = sorted({re.split(r'\n|    at ', msg, maxsplit=1)[0][:150] for _, msg in fails})
    timeout = any(re.search(r'timed? ?out|Timeout', msg, re.I) for _, msg in fails)
    bad += timeout
    print(rid, len(fails), 'TIMEOUT' if timeout else '', '||', ' ## '.join(heads))
print('rows with failures', sum(1 for v in m.values() if v), 'of', len(m), 'rows naming a timeout', bad)
