"""rev-528: gather the six bead-named #524 reviewer mutants (and the R-X6j control) straight from the retained tools.

Usage: python3 -I build_named.py <tree> <out.json>
Reads docs/evidence/argv-guards-review-2026-10-25/tools/{own-specs,x9-specs}.json in <tree>, unchanged.
"""
import json, os, sys

tree, out = sys.argv[1:3]
tools = os.path.join(tree, 'docs/evidence/argv-guards-review-2026-10-25/tools')
wanted = ['R-X6-', 'R-X6b-', 'R-X9-', 'R-X6i-', 'R-X6j-', 'R-Y6-', 'R-Y7-']
specs = []
for name in ('own-specs.json', 'x9-specs.json'):
    for spec in json.load(open(os.path.join(tools, name)))['mutants']:
        if any(spec['id'].startswith(prefix) for prefix in wanted):
            specs.append({**spec, 'from': name})
assert len(specs) == len(wanted), [s['id'] for s in specs]
json.dump({'mutants': specs}, open(out, 'w'), indent=1)
print(len(specs), [s['id'] for s in specs])
