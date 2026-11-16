#!/usr/bin/env python3
"""Adds the two proposed pins (F1 and N2 of R-GP-IMPL-CRLF-MASK-1) to a scratch clone at the reviewed commit, runs the two test
files at head and under RM7, RM11, RM12, RM8 and RM10, prints which tests fail, and restores every file.
Usage: verify-proposed-pins.py <clone> <tmpdir>"""
import json, os, subprocess, sys
clone, tmpdir = sys.argv[1:3]
BS = '\\'
UNIT = 'packages/three-surface-poc-core/src/markdown-code-context.test.ts'
READER_TEST = 'packages/three-surface-poc-core/src/git-object-reader.test.ts'
MASK = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
READER = 'packages/three-surface-poc-core/src/git-object-reader.ts'
F1_ANCHOR = "  // This test compares a rendering with another, so it proves equality, not correctness"
F1_PIN = (
    "  // Only CR and LF end a line, which leaves every LF reading as it was (syzygy-bpyt.1.14): U+2028, U+2029 and U+0085 are line\n"
    "  // content, blanked inside a span like any other character. A line end widened to them would keep them in the mask.\n"
    "  it('U+2028, U+2029 and U+0085 are line content, not line ends', () => {\n"
    "    for (const separator of ['" + BS + "u2028', '" + BS + "u2029', '" + BS + "u0085']) expect(masked(`a " + BS + "`b${separator}c" + BS + "` d`), JSON.stringify(separator)).toBe('a       d');\n"
    "  });\n\n")
N2_ANCHOR = "describe('declared resource limits are evaluation inputs', () => {"
N2_PIN = (
    "// GAP, for the line-model follow-up of syzygy-bpyt.16: positionOf counts LF only, so a CRLF text reports its LF form's positions and\n"
    "// a bare-CR text reports line 1 with the offset as column, while a malformed finding takes the mask's line, which counts every line end.\n"
    "describe('reported positions in CRLF and bare-CR texts', () => {\n"
    "  it('CRLF as LF; a bare CR counted by the malformed line only', () => {\n"
    "    expect(scanActiveContent('a" + BS + "r" + BS + "n<script>x</script>')).toEqual([{ form: 'script-element', line: 2, column: 1 }, { form: 'script-element', line: 2, column: 10 }]);\n"
    "    expect(scanActiveContent('a" + BS + "r<script>x</script>')).toEqual([{ form: 'script-element', line: 1, column: 3 }, { form: 'script-element', line: 1, column: 12 }]);\n"
    "    expect(scanActiveContent('a" + BS + "rb" + BS + "r`x')).toEqual([{ form: 'malformed-code-context', line: 3, column: 1, context: 'unclosed-inline-span' }]);\n"
    "  });\n"
    "});\n\n")
LINE_END = 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n/g;'
POS = 'if (text.charCodeAt(i) === 10) {'
MUTANTS = [
    ('head', None, None, None),
    ('RM7', MASK, LINE_END, 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'u2028/g;'),
    ('RM11', MASK, LINE_END, 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'x85/g;'),
    ('RM12', MASK, LINE_END, 'const LINE_END = /' + BS + 'r' + BS + 'n|[' + BS + 'r' + BS + 'n' + BS + 'u2028' + BS + 'u2029]/g;'),
    ('RM8', READER, POS, 'if (text.charCodeAt(i) === 10 || (text.charCodeAt(i) === 13 && text.charCodeAt(i + 1) !== 10)) {'),
    ('RM10', READER, POS, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 13) {'),
]
def rd(p): return open(os.path.join(clone, p), encoding='utf8').read()
def wr(p, s): open(os.path.join(clone, p), 'w', encoding='utf8').write(s)
originals = {p: rd(p) for p in (UNIT, READER_TEST, MASK, READER)}
try:
    u = originals[UNIT]; assert u.count(F1_ANCHOR) == 1; wr(UNIT, u.replace(F1_ANCHOR, F1_PIN + F1_ANCHOR))
    r = originals[READER_TEST]; assert r.count(N2_ANCHOR) == 1; wr(READER_TEST, r.replace(N2_ANCHOR, N2_PIN + N2_ANCHOR))
    for p in (UNIT, READER_TEST):
        s = rd(p); print(p.rsplit('/', 1)[-1], 'U+00A0', s.count(chr(0xa0)), 'raw CR', s.count(chr(13)), 'non-ASCII', sum(1 for c in s if ord(c) > 127) - sum(1 for c in originals[p] if ord(c) > 127))
    for mid, path, old, new in MUTANTS:
        for p in (MASK, READER): wr(p, originals[p])
        if path:
            s = originals[path]; assert s.count(old) == 1; wr(path, s.replace(old, new))
        out = os.path.join(tmpdir, f'pins-{mid}.json')
        os.makedirs(tmpdir, exist_ok=True)
        load = open('/proc/loadavg').read().split()[0]
        subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={out}', UNIT, READER_TEST], cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True)
        d = json.load(open(out))
        failed = [a['fullName'][-90:] + ' | ' + (a['failureMessages'][0].split('\n')[0][:110] if a['failureMessages'] else '') for t in d['testResults'] for a in t['assertionResults'] if a['status'] != 'passed']
        print(f"{mid}: tests {d['numTotalTests']} failed {d['numFailedTests']} (loadavg {load})")
        for f in failed: print('    FAIL', f)
finally:
    for p, s in originals.items(): wr(p, s)
print('restored; git status:', subprocess.run(['git', 'status', '--porcelain'], cwd=clone, capture_output=True, text=True).stdout.strip() or 'clean')
