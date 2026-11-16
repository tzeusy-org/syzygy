#!/usr/bin/env python3
"""Apply note N1's proposed mask assertion to markdown-code-context.test.ts in a scratch tree (round 3). Usage: mask-order-assertion.py <tree>"""
import sys
p = sys.argv[1] + '/packages/three-surface-poc-core/src/markdown-code-context.test.ts'
s = open(p, encoding='utf-8').read()
old = "    expect(got.masked.slice(0, got.masked.length - 8).trim()).toBe('');\n"
new = ("    // Exact bytes, so a reordered fence fails: the script line is the fence's only line of its length.\n"
       "    expect(got.masked === `   ${end}        ${end}${` ${end}`.repeat(LINES)}   ${end}<script>`, 'the masked text differs from every non-terminator byte blanked, in line order').toBe(true);\n")
assert s.count(old) == 1, s.count(old)
open(p, 'w', encoding='utf-8').write(s.replace(old, new))
print('applied')
