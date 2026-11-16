#!/usr/bin/env python3
"""Second batch of reviewer mutants, run by reviewer-mutants.py's own runner. Usage: reviewer-mutants-2.py <clone> <tmpdir> <out.json>"""
import importlib.util
import os
import sys
spec = importlib.util.spec_from_file_location('rm', os.path.join(os.path.dirname(__file__), 'reviewer-mutants.py'))
rm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rm)
BS = '\\'
rm.MUTANTS = [
    ('RM10-positionOf-counts-every-cr', rm.READER, [('if (text.charCodeAt(i) === 10) {', 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 13) {')],
     'positionOf counts every CR as a line end (CRLF texts double-count; the C4 property)'),
    ('RM11-nel-is-a-line-end', rm.MASK, [(rm.LINE_END, 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'x85/g;')],
     'U+0085 (NEL) ends a line too: changes LF texts that hold one'),
    ('RM12-multiline-anchor-split', rm.MASK, [(rm.LINE_END, 'const LINE_END = /' + BS + 'r' + BS + 'n|[' + BS + 'r' + BS + 'n' + BS + 'u2028' + BS + 'u2029]/g;')],
     'the JavaScript line-terminator set (what ^ and $ under m, and the dot, treat as line ends)'),
]
rm.main()
