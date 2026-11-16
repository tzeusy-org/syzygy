#!/usr/bin/env python3
"""Round-3 reviewer mutants for PR 544 (R-GP-IMPL-CRLF-MASK-3).

Usage: python3 -I mutants-r3.py <clone at 497515ae, npm ci done, clean> <tmpdir> <out.json>
PX rows mutate one production file and run the seven test files. TX rows weaken one of the three round-2 pins (a test-file edit)
and apply the production mutant that pin is the only killer of, then run the one test file that holds the pin: a TX row that
survives shows that the weakened part of the pin is what kills; a TX row that is still killed shows that part is not load-bearing
for that mutant. Each replacement must occur exactly once; every file is restored after each row. Load is recorded per run.
"""
import hashlib
import json
import os
import subprocess
import sys

MASK = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
READER = 'packages/three-surface-poc-core/src/git-object-reader.ts'
UNIT = 'packages/three-surface-poc-core/src/markdown-code-context.test.ts'
GOR = 'packages/three-surface-poc-core/src/git-object-reader.test.ts'
SEVEN = [
    UNIT,
    'packages/three-surface-poc-core/src/content-classification.test.ts',
    GOR,
    'apps/three-surface-poc/src/fence-rules.test.ts',
    'apps/three-surface-poc/src/verbatim-route.test.ts',
    'apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts',
    'packages/polaris-dossier/src/screen.test.ts',
]
BS = '\\'
LINE_END = 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n/g;'
def le(body):
    return 'const LINE_END = /' + body + '/g;'
CLOSER = '/^ {0,3}(`{3,}|~{3,}) *$/'
OPENER = 'const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})(.*)$/;'
POS = 'if (text.charCodeAt(i) === 10) {'
MU22 = (MASK, LINE_END, le(BS + 'r' + BS + 'n|[' + BS + 'r' + BS + 'n' + BS + 'v' + BS + 'f]'))
MU23 = (MASK, CLOSER, '/^ {0,3}(`{3,}|~{3,})[ ' + BS + 'u2028' + BS + 'u2029' + BS + 'u0085]*$/')
MU24 = (READER, POS, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 0x2028) {')

GENERAL_LOOP = 'for (let unit = 0; unit <= 0xffff; unit += 1) {'
POS_ASSERT = "expect(scanActiveContent('a" + BS + "u2028<script>x</script>')).toEqual([{ form: 'script-element', line: 1, column: 3 }, { form: 'script-element', line: 1, column: 12 }]);"

# (id, [(file, old, new)], files to run, note)
MUTANTS = [
    ('PX1-closer-tolerates-vt-ff', [(MASK, CLOSER, '/^ {0,3}(`{3,}|~{3,})[ ' + BS + 'v' + BS + 'f]*$/')], SEVEN,
     'a closer that tolerates a trailing VT or FF: RW5 with the two units the fence row does not name'),
    ('PX2-closer-tolerates-js-whitespace', [(MASK, CLOSER, '/^ {0,3}(`{3,}|~{3,})' + BS + 's*$/')], SEVEN,
     'a closer that tolerates any trailing JavaScript whitespace (\\s), a plausible "allow trailing whitespace" edit'),
    ('PX3-fs-gs-rs-are-line-ends', [(MASK, LINE_END, le(BS + 'r' + BS + 'n|[' + BS + 'r' + BS + 'n' + BS + 'x1c-' + BS + 'x1e]'))], SEVEN,
     'LINE_END widened to U+001C..U+001E (str.splitlines reads them as line ends); not in the differential slice'),
    ('PX4-positionOf-counts-u2029', [(READER, POS, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 0x2029) {')], SEVEN,
     'positionOf counts U+2029: RW10 with the paragraph separator the position pin does not name'),
    ('PX5-positionOf-counts-vt', [(READER, POS, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 0x0b) {')], SEVEN,
     'positionOf counts VT'),
    ('PX6-opener-dotall', [(MASK, OPENER, 'const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})(.*)$/s;')], SEVEN,
     'the opener regex gains the s flag, so U+2028 and U+2029 become info-string content (an LF reading change)'),
    ('TX1-general-pin-skips-vt-ff+MU22', [(UNIT, GENERAL_LOOP, 'for (let unit = 0; unit <= 0xffff; unit += unit === 0x0a ? 3 : 1) {'), MU22], [UNIT],
     'the general pin loop skips U+000B and U+000C; MU22 applied'),
    ('TX2-general-pin-stops-below-0x80+MU17', [(UNIT, GENERAL_LOOP, 'for (let unit = 0; unit < 0x80; unit += 1) {'),
                                              (MASK, LINE_END, le(BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'u2028'))], [UNIT],
     'the general pin covers ASCII only; MU17 (U+2028) applied: the F1 pin and the fence row still see it'),
    ('TX3-fence-row-reason-only+MU23', [(UNIT, "JSON.stringify(separator)).toEqual({ reason: 'unclosed-fence', line: 1 });",
                                        "JSON.stringify(separator)).toMatchObject({ reason: 'unclosed-fence' });"), MU23], [UNIT],
     'the fence row checks the reason and not the line; MU23 applied'),
    ('TX4-fence-row-u0085-only+closer-ls-ps', [(UNIT, "for (const separator of ['" + BS + "u2028', '" + BS + "u2029', '" + BS + "u0085']) expect(malformed(",
                                                  "for (const separator of ['" + BS + "u0085']) expect(malformed("),
                                                 (MASK, CLOSER, '/^ {0,3}(`{3,}|~{3,})[ ' + BS + 'u2028' + BS + 'u2029]*$/')], [UNIT],
     'the fence row names U+0085 only; a closer tolerating U+2028 and U+2029 applied'),
    ('TX5-position-pin-either-line+MU24', [(GOR, POS_ASSERT,
        "const found = scanActiveContent('a" + BS + "u2028<script>x</script>');\n    expect(found.map((f) => f.form)).toEqual(['script-element', 'script-element']);\n    expect(found.every((f) => f.line === 1 || f.line === 2)).toBe(true);"), MU24], [GOR],
     'the position pin accepts line 1 or 2 and ignores the column; MU24 applied'),
    ('TX6-position-pin-line-only+MU24', [(GOR, POS_ASSERT,
        "expect(scanActiveContent('a" + BS + "u2028<script>x</script>').map((f) => f.line)).toEqual([1, 1]);"), MU24], [GOR],
     'the position pin checks the line and not the column; MU24 applied'),
]


def sha(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def loadavg():
    return open('/proc/loadavg').read().strip()


def detect(clone, tmpdir, label, files):
    report = os.path.join(tmpdir, f'{label}.json')
    if os.path.exists(report):
        os.remove(report)
    before = loadavg()
    proc = subprocess.run(['npx', 'vitest', 'run', '--testTimeout=60000', '--hookTimeout=60000', '--reporter=json', f'--outputFile={report}', *files],
                          cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True)
    after = loadavg()
    if not os.path.exists(report):
        raise SystemExit(f'{label}: no report (exit {proc.returncode}): {proc.stderr[-400:]}')
    data = json.load(open(report, encoding='utf8'))
    failed, total = [], 0
    for result in data['testResults']:
        rel = os.path.relpath(result['name'], clone)
        if result.get('status') == 'failed' and not result['assertionResults']:
            failed.append({'file': rel, 'test': '(file did not load)', 'error': (result.get('message') or '')[:200]})
        for t in result['assertionResults']:
            total += 1
            if t['status'] == 'failed':
                failed.append({'file': rel, 'test': t['fullName'][-140:], 'error': (t['failureMessages'][0] if t['failureMessages'] else '').split('\n')[0][:200]})
    return {'tests': total, 'failed': len(failed), 'failures': failed, 'loadBefore': before, 'loadAfter': after}


def main():
    clone, tmpdir, out = sys.argv[1:4]
    os.makedirs(tmpdir, exist_ok=True)
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=clone, capture_output=True, text=True, check=True).stdout.strip()
    if subprocess.run(['git', 'status', '--porcelain'], cwd=clone, capture_output=True, text=True, check=True).stdout.strip():
        raise SystemExit('clone is not clean')
    rows = []
    try:
        for mid, reps, files, note in MUTANTS:
            originals = {}
            for file, old, new in reps:
                path = os.path.join(clone, file)
                text = originals.get(file) or open(path, encoding='utf8').read()
                originals.setdefault(file, text)
                current = open(path, encoding='utf8').read()
                if current.count(old) != 1:
                    raise SystemExit(f'{mid}: fragment occurs {current.count(old)} times in {file}: {old!r}')
                open(path, 'w', encoding='utf8').write(current.replace(old, new))
            mutated = {file: sha(open(os.path.join(clone, file), encoding='utf8').read()) for file in originals}
            try:
                result = detect(clone, tmpdir, mid.split('-')[0], files)
            finally:
                for file, text in originals.items():
                    open(os.path.join(clone, file), 'w', encoding='utf8').write(text)
            row = {'id': mid, 'ranAt': head, 'note': note, 'replacements': [{'file': f, 'old': o, 'new': n} for f, o, n in reps],
                   'mutatedFileSha256': mutated, 'ran': files, 'outcome': 'killed' if result['failed'] else 'SURVIVED', **result}
            rows.append(row)
            print(mid, row['outcome'], result['tests'], result['failed'], [f['test'][-70:] for f in result['failures']][:4], result['loadBefore'].split()[0], '->', result['loadAfter'].split()[0], flush=True)
    finally:
        if subprocess.run(['git', 'status', '--porcelain'], cwd=clone, capture_output=True, text=True).stdout.strip():
            print('WARNING: clone not clean after run', flush=True)
    json.dump({'tool': 'rev-544-r3/tools/mutants-r3.py', 'ranAt': head, 'rows': rows}, open(out, 'w', encoding='utf8'), indent=1)


if __name__ == '__main__':
    main()
