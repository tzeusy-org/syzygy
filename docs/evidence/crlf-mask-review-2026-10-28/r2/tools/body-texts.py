"""Checks that the PR body carries round 1's proposed texts for N2(b) and N4(b) verbatim, reports N4(a) and N4(c), and extracts
round 1's proposed texts from its raw by their quoting. Usage: python3 -I body-texts.py <round-1 raw> <body file>"""
import re, sys
raw = open(sys.argv[1], encoding='utf8').read()
body = open(sys.argv[2], encoding='utf8').read()
flat = lambda s: re.sub(r'\s+', ' ', s)
r = flat(raw)
n2b = re.search(r'with: "(\[Observed\] `positionOf` counts LF only and is unchanged \(the ruling\)\. In a text that holds a bare CR.*?it is not G2 or G3\.)"', r).group(1)
n4b = re.search(r"Replace the bullet's text after the file name with: \"(.*?file\.)\"", r).group(1)
n4c = re.search(r'Append: "(.*?)"', r).group(1)
b = flat(body)
print('N2(b) proposed text, chars', len(n2b), '| in body verbatim:', n2b in b, '| occurrences', b.count(n2b))
print('N4(b) proposed text, chars', len(n4b), '| in body verbatim:', n4b in b, '| occurrences', b.count(n4b))
print('N4(c) proposed text:', repr(n4c), '| in body verbatim:', n4c in b)
m = re.search(r'\(332 → \d+ at the merge commit, the extra test being main\'s\)', b)
print('N4(c) as adapted in the body:', repr(m.group(0)) if m else None)
print('N4(a) placeholder present:', 'BATTERY_PLACEHOLDER' in body, '| Battery section:', '## Battery' in body)
old_residual = 'A non-malformed finding in a bare-CR or mixed text keeps its LF-only line and column'
print('round-1 residual wording still present:', old_residual in b)
