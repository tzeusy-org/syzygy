#!/usr/bin/env python3
"""Print the key shape of JSON records (keys, types, list lengths), never their prose."""
import json
import sys


def shape(value, depth, indent):
    pad = "  " * indent
    if isinstance(value, dict):
        for k, v in value.items():
            if isinstance(v, (dict, list)) and depth > 0:
                print(f"{pad}{k}: {type(v).__name__}[{len(v)}]")
                shape(v, depth - 1, indent + 1)
            else:
                s = repr(v)
                print(f"{pad}{k}: {s[:90]}")
    elif isinstance(value, list):
        if value:
            print(f"{pad}[0] of {len(value)}:")
            shape(value[0], depth - 1, indent + 1)


for path in sys.argv[2:]:
    print("==", path)
    shape(json.load(open(path, encoding="utf-8")), int(sys.argv[1]), 0)
