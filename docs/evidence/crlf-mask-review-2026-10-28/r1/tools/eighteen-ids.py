#!/usr/bin/env python3
"""Method 1 for the 18 case ids: parse the CASES table of fence-rules.test.ts by Python re, keep whole == WF and extraction == profile."""
import re, sys
src = open(sys.argv[1], encoding='utf8').read()
block = src[src.index('const CASES: readonly FenceCase[] = ['):src.index('\n];', src.index('const CASES: readonly FenceCase[] = ['))]
rows = re.findall(r"\{ id: '([^']+)'[^\n]*?profile: '([A-Z]+)', links: '[A-Z]+', extraction: '([A-Z]+)', renderer: '[A-Z]+', gate: '[A-Z]+', whole: ([A-Z]+) \}", block)
print('rows', len(rows), 'lines in block', block.count('{ id:'))
agree = [i for i, p, e, w in rows if w == 'WF' and p == e]
print(len(agree), agree)
