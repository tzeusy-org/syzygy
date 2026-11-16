"""R-GP-IMPL-SOURCE-RESOLUTION-3: check F1-F4 replacements in body-r3 against round-2 raw section 4, independently of apply_r2.py.

python3 -I check_body.py RAW BODY_R2 BODY_R3
"""
import difflib, hashlib, re, sys

raw_p, b2_p, b3_p = sys.argv[1:4]
for p in (raw_p, b2_p, b3_p):
    print(hashlib.sha256(open(p, "rb").read()).hexdigest(), p.rsplit("/", 1)[-1])
raw = open(raw_p, encoding="utf-8").read().split("\n")
b2 = open(b2_p, encoding="utf-8").read()
b3 = open(b3_p, encoding="utf-8").read()

# Find every blockquote in raw section 4 by scanning, not by line number.
s4 = raw.index("## 4. Findings"); s5 = raw.index("## 5. Changed outputs")
quotes = []
i = s4
while i < s5:
    if re.match(r"^\s*> ", raw[i]):
        j = i
        while j < s5 and re.match(r"^\s*> ", raw[j]):
            j += 1
        quotes.append((i + 1, j, "\n".join(re.sub(r"^\s*> ", "", l) for l in raw[i:j])))
        i = j
    else:
        i += 1
print("blockquotes in section 4:", len(quotes), [(a, b) for a, b, _ in quotes])

OLD = {
    "F1a": "`no-egress.test.ts` replaces its 10-entry esbuild alias list with `conditions: ['source']`.",
    "F1b": "- Class 4: the S10 no-egress proof now resolves its bundle by condition instead of aliases.\n- Class 6: every private workspace package's `exports` map gains an entry.",
    "F2": "- A row in `workspace-reach.test.ts` covers the plugin case. It imports each workspace export entry as the suite does, and requires the same module instance that the entry's `source` file loads as. So it fails when any entry loads another module, such as its dist. The POC app's `.` entry is left out, because importing `main.ts` starts the POC.",
    "F3": "Two more rows check what TypeScript emits:",
    "F4": "Since then the script has gained refusals. For a tree with no reference cycle, it removes the same set of dists and makes the same `tsc -b` call.",
}
names = ["F1a", "F1b", "F2", "F3", "F4"]
for (a, b, q), n in zip(quotes, names):
    print(f"{n}: raw lines {a}-{b}; old in r2={b2.count(OLD[n])} old in r3={b3.count(OLD[n])} new in r2={b2.count(q)} new in r3={b3.count(q)}")

# Reconstruct expected r3 from r2: apply the five replacements plus round-2 paragraph, compare.
exp = b2
for (a, b, q), n in zip(quotes, names):
    exp = exp.replace(OLD[n], q)
print("r3 == r2+replacements:", exp == b3)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, exp.split("\n"), b3.split("\n"), autojunk=False).get_opcodes():
    if tag != "equal":
        print(tag, "exp", i1, i2, repr(exp.split("\n")[i1:i2])[:300], "| r3", j1, j2, repr(b3.split("\n")[j1:j2])[:600])
print("r2 ends", repr(b2[-3:]), "r3 ends", repr(b3[-3:]))
print("U+00A0", b3.count(" "), "U+FEFF", b3.count("﻿"))
