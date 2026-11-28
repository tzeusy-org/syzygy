#!/usr/bin/env python3
"""Build the MODIFIED REQ-polaris-generation-034 that corrects two statements of the 2.40 walks text (syzygy-3efd.90).

Built from the walk advice 2.51 bytes by anchored edits; every edit asserts its anchor occurs exactly once.
Usage: walk_errata_build_spec.py <worktree> <out>.

1. The brief v24 paragraph is quoted with bare quotation marks, the bytes `brief.ts` issues (asserted here against
   `WALK_PARAGRAPH`), where 2.40 wrote a backslash before each of twelve (design.md D1).
2. Every walk box takes the pointer, so a walked figure's drawing shows no per-node tooltip under the pointer: the
   trade-off is accepted and stated, and no code changes (design.md D2).
"""
import pathlib
import sys

V = '2.53'
W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PREDECESSOR = 'openspec/changes/dossier-walk-advice/proposed/polaris-generation/spec.md'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src
BS = chr(0x5c)
QUOTE = chr(0x22)


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith('# Dossier walk advice'), lines[0]
assert lines[2].startswith('Candidate version 2.51;'), lines[2][:40]
lines[0] = '# Dossier walk errata: the brief v24 paragraph\'s quotation marks, and the walk layer over the drawing\'s tooltips'
lines[2] = (f"Candidate version {V}; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One "
            "MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that walk "
            "advice version 2.51 gave it. It corrects two statements of the figure walks of version 2.40 to the behaviour "
            "Syzygy ships: the brief v24 paragraph is quoted with the bare quotation marks the brief issues, and the walk "
            "layer's boxes all take the pointer, so a walked figure's drawing shows no per-node tooltip under it, which is "
            "now stated as a trade-off. No finding, record, page, brief byte, draft schema or brief version moves, and no "
            "scenario is added. Every other sentence and scenario of the predecessor is carried unchanged; the exact changes "
            "are in SEMANTIC-DELTA.md. Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines)

# 1. The brief v24 paragraph, quoted as the brief issues it.
OPEN = 'which reads: ' + QUOTE + 'Where a section or deep dive explains a graph figure drawn there step by step'
CLOSE = QUOTE + ' Every statement above of what brief v23 carries, equals or differs by holds of brief v24'
assert text.count(OPEN) == 1 and text.count(CLOSE) == 1
a = text.index(OPEN) + len('which reads: ' + QUOTE)
b = text.index(CLOSE)
assert a < b
quoted = text[a:b]
escaped = BS + QUOTE
assert quoted.count(escaped) == 12 and text.count(escaped) == 12, (quoted.count(escaped), text.count(escaped))
plain = quoted.replace(escaped, QUOTE)
assert BS not in plain
brief = (W / 'packages/polaris-dossier/src/brief.ts').read_text(encoding='utf-8')
head = "export const WALK_PARAGRAPH = '"
assert brief.count(head) == 1
literal = brief[brief.index(head) + len(head):]
literal = literal[:literal.index("';\n")].replace(BS + "'", "'")
assert BS not in literal and literal == plain, 'the corrected quotation differs from WALK_PARAGRAPH'
text = text[:a] + plain + text[b:]

LAST = 'holds of brief v24 apart from those three differences. The success report and the brief record SHALL name brief v24.'
replace(LAST, LAST + (f' From version {V}, the paragraph quoted above is that paragraph\'s exact text, every quotation mark in it '
                      'one quotation mark with no backslash before it, the bytes brief v24 issues; version 2.40 and every '
                      'version until this one wrote a backslash before each of its twelve quotation marks, an escape of '
                      'this text that no brief issued.'))

# 2. The walk layer takes the pointer over every box; the drawing's own tooltips give way.
END = 'A walk adds no read, no source, no label and no claim, and no text of the draft but the element labels the figure\'s lists already show.'
replace(END, END + (f' Every box of a walk\'s layer takes the pointer, whether or not it holds a badge or a link (version {V}), so on '
                    'a walked figure the drawing\'s own tooltip for a node, the `<title>` the drawing gives it, does not show '
                    'under the pointer. This is a trade-off, kept for two reasons: a box\'s `walk-source` link fills the box and '
                    'takes the pointer to be followed, and the outline under the pointer marks every box of a walked figure '
                    'alike; the label and marking such a tooltip carries stay shown by the node\'s box in the drawing and by its '
                    'item in the figure\'s list of every component and relationship. A figure with no walk keeps its tooltips, '
                    'and so does a box version 2.50 lets pass the pointer to the drawing.'))

assert '2.NN' not in text and text.count(escaped) == 0
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')), len(src.encode()) - len(text.encode()))
