#!/usr/bin/env python3
"""Direction of an act-family differential (syzygy-bpyt.1.24, R-GP-IMPL-CONSENT-KNOBS-REFUSAL-1 F1). Evidence tool, not a check.
usage: python3 direction_check.py DIFFERENTIAL.json
An answer label is a refusal when it opens `throws `, `refused` or `ok=false`, or carries `kind=refused`; every other label (an ok, an
absent, a list of records, a reserved or satisfied port answer) is an acceptance. Prints the mismatch count in each direction as JSON
and exits 1 when any mismatch goes from a refusal to an acceptance, or when the record holds no mismatch at all."""
import json, sys
def refusal(label): return label.startswith(('throws ', 'refused', 'ok=false')) or 'kind=refused' in label
d = json.load(open(sys.argv[1]))
counts = {'refuseToAccept': 0, 'acceptToRefuse': 0, 'refuseToRefuse': 0, 'acceptToAccept': 0}
for m in d['mismatches']:
    o, n = refusal(m['old']['label']), refusal(m['new']['label'])
    counts[('refuse' if o else 'accept') + 'To' + ('Refuse' if n else 'Accept')] += 1
out = {'mismatches': len(d['mismatches']), 'directions': counts, 'predicate': "refusal(label) = label.startswith(('throws ', 'refused', 'ok=false')) or 'kind=refused' in label"}
print(json.dumps(out))
sys.exit(1 if counts['refuseToAccept'] or not d['mismatches'] else 0)
