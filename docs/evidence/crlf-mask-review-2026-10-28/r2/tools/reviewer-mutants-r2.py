#!/usr/bin/env python3
"""Round-2 reviewer mutants (RW1..RW11) for PR 544, run by round 1's runner (copied here as reviewer-mutants-runner.py, unchanged
but for this docstring's caller): one vitest run over the seven test files per mutant, every failing test and its first assertion
line listed, the load average recorded, the file restored. Usage: reviewer-mutants-r2.py <clone at the code head> <tmpdir> <out.json>
[--only RW1,RW2]. Every escape is built from BS so no typed backslash-u reaches this file."""
import importlib.util
import os
import sys
spec = importlib.util.spec_from_file_location('rm', os.path.join(os.path.dirname(__file__), 'reviewer-mutants-runner.py'))
rm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rm)
BS = '\\'
def esc(*parts):
    return ''.join(BS + p for p in parts)
LINE_END = 'const LINE_END = /' + esc('r', 'n') + '|' + esc('r') + '|' + esc('n') + '/g;'
def line_end(body):
    return 'const LINE_END = /' + body + '/g;'
CRLF, CR, LF = esc('r', 'n'), esc('r'), esc('n')
LS, PS, NEL, VT, FF = esc('u2028'), esc('u2029'), esc('x85'), esc('v'), esc('f')
CLOSER = '/^ {0,3}(`{3,}|~{3,}) *$/'
SPAN_CHAR = "rendered += span === undefined ? line[cursor] : ' ';"
POS = 'if (text.charCodeAt(i) === 10) {'
MUTANTS = [
    ('RW1-u2029-is-a-line-end', rm.MASK, [(LINE_END, line_end(f'{CRLF}|{CR}|{LF}|{PS}'))],
     'widening: U+2029 alone ends a line (round 1 named it; MU19 adds it only beside U+2028)'),
    ('RW2-unicode-newline-set', rm.MASK, [(LINE_END, line_end(f'{CRLF}|[{LF}{VT}{FF}{CR}{NEL}{LS}{PS}]'))],
     'widening: the Unicode newline-guidelines set (CR, LF, CRLF, NEL, VT, FF, LS, PS)'),
    ('RW3-vt-ff-are-line-ends', rm.MASK, [(LINE_END, line_end(f'{CRLF}|[{CR}{LF}{VT}{FF}]'))],
     'widening: VT and FF end a line (members of that set and of str.splitlines, outside the pinned three)'),
    ('RW4-python-splitlines-set', rm.MASK, [(LINE_END, line_end(f'{CRLF}|[{CR}{LF}{VT}{FF}' + esc('x1c', 'x1d', 'x1e') + f'{NEL}{LS}{PS}]'))],
     "widening: Python str.splitlines' set"),
    ('RW5-closer-tolerates-trailing-separators', rm.MASK, [(CLOSER, '/^ {0,3}(`{3,}|~{3,})[ ' + LS + PS + NEL + ']*$/')],
     'widening at fence positions only: a closer may end in U+2028, U+2029 or U+0085 (the separator read as a line end by the closer alone)'),
    ('RW6-u2028-kept-in-a-span', rm.MASK, [(SPAN_CHAR, "rendered += span === undefined || line[cursor] === '" + LS + "' ? line[cursor] : ' ';")],
     'widening in spans only: inside a span U+2028 is kept in the mask, as a line end is'),
    ('RW7-span-reset-at-u2028', rm.MASK, [(SPAN_CHAR, "if (line[cursor] === '" + LS + "') span = undefined;\n        " + SPAN_CHAR)],
     'widening in spans only: an inline span cannot continue across U+2028 (the RM5 analogue)'),
    ('RW8-final-bare-cr-not-a-line-end', rm.MASK, [(LINE_END, line_end(f'{CRLF}|{CR}(?!$)|{LF}'))],
     'narrowing: a CR that ends the text is line content'),
    ('RW9-lfcr-is-one-line-end', rm.MASK, [(LINE_END, line_end(f'{CRLF}|{LF}{CR}|{CR}|{LF}'))],
     'widening of the two-unit terminator: LF CR is one line end'),
    ('RW10-positionOf-counts-u2028', rm.READER, [(POS, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 0x2028) {')],
     'positionOf counts U+2028: renumbers LF findings after one'),
    ('RW11-positionOf-skips-lf-of-crlf', rm.READER, [(POS, 'if (text.charCodeAt(i) === 10 && text.charCodeAt(i - 1) !== 13) {')],
     'positionOf counts no line end at a CRLF'),
    ('RW12-positionOf-column-resets-at-bare-cr', rm.READER, [(POS, 'if (text.charCodeAt(i) === 13 && text.charCodeAt(i + 1) !== 10) lineStart = i + 1;\n    ' + POS)],
     'positionOf restarts the column at a bare CR without counting a line'),
]
only = None
if '--only' in sys.argv:
    k = sys.argv.index('--only')
    only = set(sys.argv[k + 1].split(','))
    del sys.argv[k:k + 2]
rm.MUTANTS = [m for m in MUTANTS if only is None or m[0].split('-')[0] in only]
rm.main()
