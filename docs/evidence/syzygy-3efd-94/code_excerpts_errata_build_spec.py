#!/usr/bin/env python3
"""Build the MODIFIED REQ-polaris-generation-034 that corrects the 2.54 code excerpts text (syzygy-3efd.94).

Built from the view levels errata 2.55 bytes by anchored edits; every edit asserts its anchor occurs exactly once.
Usage: code_excerpts_errata_build_spec.py <worktree> <out>.

1. The range condition is a second requirement, not an appositive: the excerpt's own range must be well formed, not reversed
   and 1 to 60 lines, whether or not a range finding is drawn (R33 code review finding 2; design.md D2).
2. Where an excerpt's `schema` findings at its lists come in the order (R33 finding 4; design.md D3).
3. A `range-beyond-blob` finding does not skip these checks (R33 finding 5; design.md D4).
4. The browser scenario: a band is its line's line box and the topmost element painting a background at a point between two
   characters, with the text above it; a number lies on its line as the line's text does (R33 finding 6, CI run 46164381249;
   design.md D5).
5. The line bound of a highlight and a note, 10,000,000, is stated (R33 finding 9; design.md D6).
6. A scenario sentence: an excerpt of an absent path whose range is reversed or over 60 lines is skipped (R33 finding 1;
   design.md D2); and which positions hold an excerpt (R33-code finding 3; design.md D3).
"""
import pathlib
import sys

V = '2.56'
W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
# The predecessor: its path, the start of its title line, its version and the name the preamble gives it. A rebind over
# another predecessor (design.md D1) changes these four, and nothing else in this script.
PREDECESSOR = 'openspec/changes/dossier-view-levels-errata/proposed/polaris-generation/spec.md'
PRED_TITLE = '# Dossier view levels errata'
PRED_VERSION = '2.55'
PRED_NAME = 'view levels errata'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith(PRED_TITLE), lines[0]
assert lines[2].startswith(f'Candidate version {PRED_VERSION}'), lines[2][:40]
lines[0] = '# Dossier code excerpts errata: the skip rule, the finding order, the line bound and the bands'
lines[2] = (f"Candidate version {V}; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One "
            "MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that "
            f"{PRED_NAME} version {PRED_VERSION} gave it. It corrects the code excerpts of version 2.54 to agree with "
            "themselves and with the code Syzygy ships: the range an excerpt's checks need is a condition of its own, not a "
            "gloss on the range findings; an excerpt's `schema` findings at its lists come first in its group; a "
            "`range-beyond-blob` finding does not skip the checks; a highlight's and a note's lines are bounded at 10,000,000 "
            "as a citation's are; and the browser scenario reads a band as its line's line box, the topmost element painting a "
            "background there, and a number as lying on its line as the line's text does. No draft schema, brief version or "
            "byte, finding, record or page byte moves, and no scenario is added. Every other sentence and scenario of the "
            "predecessor is carried unchanged; the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective requirements "
            "are unchanged.")
text = '\n'.join(lines)

# 5. The line bound.
replace('each `{"startLine", "endLine"}`, two integers from 1: the lines the excerpt draws the reader\'s eye to',
        'each `{"startLine", "endLine"}`, two integers from 1 to 10,000,000, the bound the published draft schema sets on '
        'every line number a citation\'s among them: the lines the excerpt draws the reader\'s eye to')
replace('each `{"line", "block"}`: `line` an integer from 1, a line of the excerpt',
        'each `{"line", "block"}`: `line` an integer from 1 to 10,000,000, a line of the excerpt')
replace('each an integer from 1 but `block`, a handle, are each a `schema` finding at that path.',
        'each an integer from 1 to 10,000,000 but `block`, a handle, are each a `schema` finding at that path.')

# 1 and 6. The range condition.
replace('They are computed only for an excerpt whose citation draws no `range-invalid` or `code-excerpt-too-long` finding, a '
        'well-formed, non-reversed range of 1 to 60 lines, and,',
        'They are computed only for an excerpt whose citation draws no `range-invalid` or `code-excerpt-too-long` finding and '
        f'whose cited range is well formed (its `startLine` and `endLine` two integers from 1), not reversed and 1 to 60 lines '
        'long; the second condition is read on its own, so an excerpt citing a path that names no blob at '
        'the pinned revision, whose citation draws `path-absent` and neither range finding, is still skipped where its range '
        'is not such a range; and,')

# 2 and 3. The order, and range-beyond-blob.
replace("each excerpt's highlight findings come before its note findings, and all of them follow every finding version 2.53 "
        "reports for the draft.",
        "each excerpt's `schema` findings at its `highlights` and at its `notes` come first, in that order, then its highlight "
        "findings, then its note findings, and all of them follow every finding version 2.53 reports for the draft; the "
        "`schema` findings at its lists are reported whatever its range, and only the findings of kinds `code-highlight`, "
        "`code-note` and `unresolved-reference` at its lists are skipped. An excerpt here is a `code` element at a position "
        "the draft admits one, an entry of a section's, a subsection's or a deep dive's `paragraphs` or of a `details` "
        "element's `elements` there; a `code` object anywhere else draws version 2.53's `schema` finding at its parent, and "
        "this version neither reads nor checks its members.")
replace('they are computed and reported alike whatever classification and screening decide for the blob an excerpt cites, '
        'and no detail names a byte, a path or a line count of a blob.',
        'they are computed and reported alike whatever classification and screening decide for the blob an excerpt cites, '
        'and no detail names a byte, a path or a line count of a blob. A `range-beyond-blob` finding at an excerpt\'s '
        'citation therefore skips none of them: the excerpt\'s lines are those its citation numbers, whatever the blob holds.')

# 4. The browser scenario.
replace("- **THEN** each number of the gutter and each band has the same top and height as the line of the excerpt it names, "
        "line 10's number and line 12's band among them, each band spans the excerpt's whole width and is the topmost element "
        "at a point of it between two characters, and line 15 is one line, in both drafts",
        "- **THEN** each band has the same top and height as the line box of the line of the excerpt it names, and each "
        "number of the gutter lies in its line's box at the offset at which that line's text lies in its own (the offset the "
        "engine's rounding of the font gives, the same on every line), line 10's number and line 12's band among them; each "
        "band spans the excerpt's whole width and, at a point of it between two characters, is the topmost element painting a "
        "background there, with the excerpt's text above it; and line 15 is one line, in both drafts")

# 6. The malformed-lists scenario: the absent path.
replace("- **AND** the same `highlights` `[{\"startLine\": 30, \"endLine\": 31}]` on an excerpt whose citation draws a "
        "`range-invalid` or a `code-excerpt-too-long` finding draw no finding of this version",
        "- **AND** the same `highlights` `[{\"startLine\": 30, \"endLine\": 31}]` on an excerpt whose citation draws a "
        "`range-invalid` or a `code-excerpt-too-long` finding draw no finding of this version, nor on an excerpt citing a "
        "path that names no blob, whose citation draws `path-absent` alone, with lines 20 to 10 or 1 to 70; with lines 1 to "
        "5 on that path they draw `code-highlight` at `$.sections[0].paragraphs[2].highlights[0]` with the detail "
        "`` `highlights[0]` lies outside the excerpt's lines 1 to 5 ``")

assert '2.NN' not in text
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')), len(text.encode()) - len(src.encode()))
