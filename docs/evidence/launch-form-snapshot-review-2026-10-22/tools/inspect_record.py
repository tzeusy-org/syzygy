"""Inspect the rule-6 evidence record's structure without dumping it whole."""
import hashlib
import json
import sys

path = sys.argv[1]
raw = open(path, 'rb').read()
print('sha256', hashlib.sha256(raw).hexdigest(), 'bytes', len(raw))
rec = json.loads(raw)


def shape(value, depth=0, max_depth=2):
    pad = '  ' * depth
    if isinstance(value, dict):
        for key, inner in value.items():
            kind = type(inner).__name__
            extra = ''
            if isinstance(inner, (list, dict)):
                extra = f' len={len(inner)}'
            elif isinstance(inner, str):
                extra = f' strlen={len(inner)}' + (f' = {inner!r}' if len(inner) <= 120 else '')
            else:
                extra = f' = {inner!r}'
            print(f'{pad}{key}: {kind}{extra}')
            if depth < max_depth and isinstance(inner, (dict, list)):
                shape(inner, depth + 1, max_depth)
    elif isinstance(value, list):
        if value:
            print(f'{pad}[0] of {len(value)}:')
            shape(value[0], depth + 1, max_depth)


shape(rec, 0, int(sys.argv[2]) if len(sys.argv) > 2 else 2)
