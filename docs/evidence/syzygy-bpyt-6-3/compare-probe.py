#!/usr/bin/env python3
"""Compare two outputs of diff-probe.mjs (or of live_diff.mjs) for syzygy-bpyt.6.3 byte for byte.

Usage: compare-probe.py <base.json> <head.json> [--require-nonempty]

Prints one JSON object: the file digests, the count of compared rows, and every row that differs (with both
sides). Exit 1 when anything differs. A model that errored in both runs with the same message counts as equal;
an error on one side only is a difference.
"""
import hashlib
import json
import sys


def rows(d):
    """Flatten the probe output into (key, value) rows, one per model label and per helper index."""
    if 'models' in d:
        out = [(f"model:{m['label']}", m) for m in d['models']]
        for name, items in d['helpers'].items():
            out.extend((f'helper:{name}[{i}]', v) for i, v in enumerate(items))
        return out
    # live_diff.mjs output: the two gate evaluations and the mutated live-record corpus
    out = [('body', d['body']), ('judgment', d['judgment']), ('ownerFields', d['owners'])]
    out.extend((f"mutated:{i}:{m.get('kind')}:{m.get('prose')}:{m.get('owner')}", m) for i, m in enumerate(d['mutated']))
    return out


def main():
    base_path, head_path = sys.argv[1], sys.argv[2]
    base_raw, head_raw = open(base_path, 'rb').read(), open(head_path, 'rb').read()
    base, head = json.loads(base_raw), json.loads(head_raw)
    rb, rh = rows(base), rows(head)
    keys_b, keys_h = [k for k, _ in rb], [k for k, _ in rh]
    differ = []
    if keys_b != keys_h:
        differ.append({'row': '<row keys>', 'base': keys_b, 'head': keys_h})
    for (kb, vb), (kh, vh) in zip(rb, rh):
        if vb != vh:
            differ.append({'row': kb, 'base': vb, 'head': vh})
    errors = [k for k, v in rb if isinstance(v, dict) and 'error' in v]
    result = {
        'baseFile': {'sha256': hashlib.sha256(base_raw).hexdigest(), 'bytes': len(base_raw)},
        'headFile': {'sha256': hashlib.sha256(head_raw).hexdigest(), 'bytes': len(head_raw)},
        'rowsCompared': len(rb),
        'rowsErroredOnBaseAndHeadAlike': errors,
        'rowsThatDiffer': len(differ),
        'differences': differ[:20],
    }
    print(json.dumps(result, indent=1))
    sys.exit(1 if differ or (len(rb) == 0) else 0)


if __name__ == '__main__':
    main()
