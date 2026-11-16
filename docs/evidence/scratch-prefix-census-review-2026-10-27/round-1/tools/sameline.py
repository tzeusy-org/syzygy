#!/usr/bin/env python3
"""From creator-sweep.json, print lines where an unwrapped creator and tmpdir() (or /tmp/) share a line, and each env-object and
literal-tmp hit. Usage: sameline.py <creator-sweep.json> <kind>[,<kind>...]"""
import json
import re
import sys

d = json.load(open(sys.argv[1]))
TMP = re.compile(r'\btmpdir\(\)|[\'"`]/tmp/|tmpdir\b|TMPDIR')
for kind in sys.argv[2].split(','):
    hits = d['byKind'][kind]['hits']
    same = [(f, i, l) for f, lines in hits.items() for i, l in lines if TMP.search(l)]
    print(f'== {kind}: {len(same)} same-line of {d["byKind"][kind]["lines"]} lines')
    for f, i, l in same:
        print(f'  {f}:{i}: {l}')
