# Usage: dist_compare.py <base.json> <head.json> <out.json>: every dist file added, removed or changed, and whether each is test output.
import json, re, sys
b, h = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
TEST = re.compile(r'(\.test\.|\.testkit\.|\.tsbuildinfo$)')
added = sorted(set(h) - set(b)); removed = sorted(set(b) - set(h)); changed = sorted(p for p in set(b) & set(h) if b[p] != h[p])
nontest = lambda ps: [p for p in ps if not TEST.search(p)]
same_nontest = sum(1 for p in set(b) & set(h) if not TEST.search(p) and b[p] == h[p])
total_nontest = sum(1 for p in set(b) | set(h) if not TEST.search(p))
out = {'base': len(b), 'head': len(h), 'added': added, 'removed': removed, 'changed': changed,
       'nonTest': {'added': nontest(added), 'removed': nontest(removed), 'changed': nontest(changed), 'identical': same_nontest, 'population': total_nontest}}
json.dump(out, open(sys.argv[3], 'w'), indent=1); print(json.dumps(out, indent=1))
