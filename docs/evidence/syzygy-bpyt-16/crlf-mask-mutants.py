#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.16: does the test set fail when the mask's line model changes?

Usage: crlf-mask-mutants.py <scratch clone checked out at the code commit, npm ci done> <code commit> <base commit> <tmpdir> <out json>
                            [--only id,id]

For each mutant: reset the mask file of the clone to the code commit, replace each `old` fragment by its `new` (every `old` must
occur exactly once), run one vitest invocation over the seven test files the change adds or edits, and store which of them failed.
A mutant is KILLED when at least one test fails. The detectors, by file:
  unit        packages/three-surface-poc-core/src/markdown-code-context.test.ts
  fenceRules  apps/three-surface-poc/src/fence-rules.test.ts
  callSites   git-object-reader.test.ts, content-classification.test.ts, verbatim-route.test.ts, public-source-screening.test.ts and
              packages/polaris-dossier/src/screen.test.ts: the five modules that hand a raw decoded body to scanActiveContent.
BASE is the whole mask file of the base commit: the new tests must fail on it (they pin the fix). A mutant marked `equivalent`
is argued, not run to a verdict: it is expected to survive, and the argument is stored beside it.
Each row stores the old and new fragments, the code commit it ran at and the sha256 of the mutated file, so it can be re-run.
A mutant changes the mask file unless TARGET names another file for it (MU20 and MU21 change positionOf in the reader). A mutant
listed in KILLER must be killed by its listed pins and no other test: the row stores every failing test, and the run exits 1 otherwise
(MU17 to MU19 by the U+2028 / U+2029 / U+0085 pin, the general pin and the fence-position pin, MU20 and MU21 by the GAP pin on reported positions;
R-GP-IMPL-CRLF-MASK-1; MU22 by the general pin alone, MU23 by the fence-position pin alone, MU24 by the U+2028 position pin alone;
R-GP-IMPL-CRLF-MASK-2).
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

MASK = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
READER = 'packages/three-surface-poc-core/src/git-object-reader.ts'
UNIT = ['packages/three-surface-poc-core/src/markdown-code-context.test.ts']
FENCE = ['apps/three-surface-poc/src/fence-rules.test.ts']
SITES = [
    'packages/three-surface-poc-core/src/git-object-reader.test.ts',
    'packages/three-surface-poc-core/src/content-classification.test.ts',
    'apps/three-surface-poc/src/verbatim-route.test.ts',
    'apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts',
    'packages/polaris-dossier/src/screen.test.ts',
]
DETECTORS = {'unit': UNIT, 'fenceRules': FENCE, 'callSites': SITES}

LINE_END = 'const LINE_END = /\\r\\n|\\r|\\n/g;'
JOIN = "out.map((line, index) => line + (terminators[index] ?? '')).join('')"
CLOSER = '/^ {0,3}(`{3,}|~{3,}) *$/'
OPENER = 'const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})(.*)$/;'
POSITION_OF = 'if (text.charCodeAt(i) === 10) {'

# (id, [(old, new)], note). MU1..MU6 are the vet's (V-CRLF-MASK-1) adapted to this implementation's fragments; MU7 is the analogue
# of the #533 round-2 mutant RV10 (a closer tolerating a trailing CR); the rest are the failure modes of a split that keeps
# its terminators.
MUTANTS = [
    ('MU1-lf-only', [(LINE_END, 'const LINE_END = /\\n/g;')], 'the line model of the base'),
    ('MU2-crlf-only', [(LINE_END, 'const LINE_END = /\\r?\\n/g;')], 'a bare CR is line content'),
    ('MU3-crlf-as-two-line-ends', [(LINE_END, 'const LINE_END = /\\r|\\n/g;')], 'CRLF counts two lines: only a line-number pin kills it'),
    ('MU4-no-bare-cr', [(LINE_END, 'const LINE_END = /\\r\\n|\\n/g;')], 'CRLF yes, bare CR no'),
    ('MU5-rejoin-with-lf', [(JOIN, "out.join('\\n')")], 'terminators replaced by LF'),
    ('MU6-cr-re-emitted-as-lf', [(JOIN, "out.map((line, index) => line + (terminators[index] === '\\r' ? '\\n' : (terminators[index] ?? ''))).join('')")], 'bare CR becomes LF in the mask'),
    ('MU7-lf-split-closer-tolerates-cr', [(LINE_END, 'const LINE_END = /\\n/g;'), (CLOSER, '/^ {0,3}(`{3,}|~{3,}) *\\r?$/')], 'RV10 analogue: regex-only tolerance of a trailing CR, LF-only split'),
    ('MU8-lf-split-opener-and-closer-tolerate-cr', [(LINE_END, 'const LINE_END = /\\n/g;'), (CLOSER, '/^ {0,3}(`{3,}|~{3,}) *\\r?$/'), (OPENER, 'const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})([^\\n]*?)\\r?$/;')], 'regex-only tolerance at both fence rules, LF-only split'),
    ('MU9-terminator-dropped', [(JOIN, "out.map((line) => line).join('')")], 'the mask loses every terminator'),
    ('MU10-terminator-index-shifted', [(JOIN, "out.map((line, index) => line + (terminators[index + 1] ?? '')).join('')")], 'each line takes the next terminator'),
    ('MU11-start-ignores-terminator-length', [('start = end.index + end[0].length;', 'start = end.index + 1;')], 'a CRLF leaves its LF as the first byte of the next line'),
    ('MU12-phantom-final-terminator', [("terminators.push('');", "terminators.push('\\n');")], 'the last line gains a terminator'),
    ('MU13-last-line-dropped', [("lines.push(text.slice(start));\n  terminators.push('');\n", '')], 'the text after the last terminator is lost'),
    ('MU14-line-keeps-its-terminator', [('lines.push(text.slice(start, end.index));', 'lines.push(text.slice(start, end.index + end[0].length));')], 'rules see CRLF at the end of a line'),
    ('MU15-alternation-order', [(LINE_END, 'const LINE_END = /\\r|\\r\\n|\\n/g;')], 'CR before CRLF: CRLF splits as CR then LF'),
    ('MU16-blank-keeps-nothing-but-lf', [("return ' '.repeat(segment.length);", "return segment.replace(/[^\\n]/g, ' ');")], 'EQUIVALENT: a line holds no CR or LF now (both are split points), so the old blanking and the new one agree'),
    ('MU17-u2028-is-a-line-end', [(LINE_END, 'const LINE_END = /\\r\\n|\\r|\\n|\\u2028/g;')], 'U+2028 ends a line: changes LF texts that hold one'),
    ('MU18-nel-is-a-line-end', [(LINE_END, 'const LINE_END = /\\r\\n|\\r|\\n|\\x85/g;')], 'U+0085 ends a line: changes LF texts that hold one'),
    ('MU19-js-line-terminators', [(LINE_END, 'const LINE_END = /\\r\\n|[\\r\\n\\u2028\\u2029]/g;')], 'the JavaScript line-terminator set'),
    ('MU22-vt-ff-are-line-ends', [(LINE_END, 'const LINE_END = /\\r\\n|[\\r\\n\\v\\f]/g;')], 'RW3 of R-GP-IMPL-CRLF-MASK-2: VT and FF end a line, a widening to "the other vertical whitespace": changes LF texts that hold one'),
    ('MU23-closer-tolerates-separators', [(CLOSER, '/^ {0,3}(`{3,}|~{3,})[ \\u2028\\u2029\\u0085]*$/')], 'RW5 of R-GP-IMPL-CRLF-MASK-2: a closer that tolerates a trailing U+2028, U+2029 or U+0085 (a separator read as a line end at fence positions only): changes LF texts that hold one'),
    ('MU24-positionOf-counts-u2028', [(POSITION_OF, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 0x2028) {')], 'RW10 of R-GP-IMPL-CRLF-MASK-2: positionOf counts U+2028 as a line end: moves an LF finding position'),
    ('MU20-positionOf-counts-bare-cr', [(POSITION_OF, 'if (text.charCodeAt(i) === 10 || (text.charCodeAt(i) === 13 && text.charCodeAt(i + 1) !== 10)) {')], 'positionOf counts a bare CR as a line end: renumbers non-malformed findings in bare-CR texts (reviewer RM8)'),
    ('MU21-positionOf-counts-every-cr', [(POSITION_OF, 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 13) {')], 'positionOf counts every CR as a line end: renumbers CRLF and CR findings (reviewer RM10)'),
]
EQUIVALENT = {'MU16-blank-keeps-nothing-but-lf'}
TARGET = {'MU20-positionOf-counts-bare-cr': READER, 'MU21-positionOf-counts-every-cr': READER, 'MU24-positionOf-counts-u2028': READER}
PIN_LINE_CONTENT = 'U+2028, U+2029 and U+0085 are line content, not line ends'
PIN_POSITIONS = 'CRLF as LF; a bare CR counted by the malformed line only'
PIN_GENERAL = 'no code unit but CR and LF ends a line'
PIN_FENCE_SEPARATORS = 'U+2028, U+2029 and U+0085 after a closing fence are line content: the fence stays unclosed'
PIN_POSITION_U2028 = 'U+2028 is line content: an LF text reports its finding on line 1'
# id -> the pins that may fail it; the first is the one it is expected to be killed by, and the run exits 1 unless every failing test
# is one of them. Since round 2 the general pin covers every code unit the F1 pin names and the fence-position pin the three separators at a closer, so MU17 to MU19 fail all three.
KILLER = {
    'MU17-u2028-is-a-line-end': [PIN_LINE_CONTENT, PIN_GENERAL, PIN_FENCE_SEPARATORS],
    'MU18-nel-is-a-line-end': [PIN_LINE_CONTENT, PIN_GENERAL, PIN_FENCE_SEPARATORS],
    'MU19-js-line-terminators': [PIN_LINE_CONTENT, PIN_GENERAL, PIN_FENCE_SEPARATORS],
    'MU20-positionOf-counts-bare-cr': [PIN_POSITIONS],
    'MU21-positionOf-counts-every-cr': [PIN_POSITIONS],
    'MU22-vt-ff-are-line-ends': [PIN_GENERAL],
    'MU23-closer-tolerates-separators': [PIN_FENCE_SEPARATORS],
    'MU24-positionOf-counts-u2028': [PIN_POSITION_U2028],
}


def run(cmd, cwd, env=None, check=True):
    return subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, check=check)


def sha(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('clone')
    parser.add_argument('code_commit')
    parser.add_argument('base_commit')
    parser.add_argument('tmpdir')
    parser.add_argument('out')
    parser.add_argument('--only')
    ns = parser.parse_args()
    clone, code_commit, base_commit, tmpdir, out = ns.clone, ns.code_commit, ns.base_commit, ns.tmpdir, ns.out
    only = set(ns.only.split(',')) if ns.only else None
    target = os.path.join(clone, MASK)
    originals = {MASK: open(target, encoding='utf8').read(), READER: open(os.path.join(clone, READER), encoding='utf8').read()}
    env = dict(os.environ, TMPDIR=tmpdir)
    os.makedirs(tmpdir, exist_ok=True)

    head_now = run(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
    if head_now != code_commit:
        raise SystemExit(f'clone is at {head_now}, not {code_commit}')
    if run(['git', 'status', '--porcelain'], clone).stdout.strip():
        raise SystemExit('clone is not clean')
    original = originals[MASK]
    base_source = run(['git', 'show', f'{base_commit}:{MASK}'], clone).stdout

    all_files = [f for files in DETECTORS.values() for f in files]
    rows = []

    def detect(label):
        report = os.path.join(tmpdir, f'{label}.json')
        if os.path.exists(report):
            os.remove(report)
        proc = run(['npx', 'vitest', 'run', '--testTimeout=60000', '--hookTimeout=60000', '--reporter=json', f'--outputFile={report}', *all_files], clone, env, check=False)
        if not os.path.exists(report):
            raise SystemExit(f'{label}: no report (exit {proc.returncode}): {proc.stderr[-400:]}')
        data = json.load(open(report, encoding='utf8'))
        by_detector = {}
        every_failure = []
        for name, files in DETECTORS.items():
            failed, total = [], 0
            for result in data['testResults']:
                rel = os.path.relpath(result['name'], clone)
                if rel not in files:
                    continue
                if result.get('status') == 'failed' and not result['assertionResults']:
                    failed.append({'test': f'(file did not load) {rel}', 'error': (result.get('message') or '')[:160]})
                for t in result['assertionResults']:
                    total += 1
                    if t['status'] == 'failed':
                        failed.append({'test': t['fullName'], 'error': (t['failureMessages'][0] if t['failureMessages'] else '').split('\n')[0][:160]})
            by_detector[name] = {'tests': total, 'failed': len(failed), 'firstFailed': failed[:4]}
            every_failure += [f['test'] for f in failed]
        return by_detector, every_failure

    try:
        control, _ = detect('control')
        rows.append({'id': 'CONTROL-code-commit', 'ranAt': code_commit, 'fileSha256': sha(target), 'detectors': control})
        print('CONTROL', {k: (v['tests'], v['failed']) for k, v in control.items()}, flush=True)

        jobs = [('BASE-whole-file-of-the-base-commit', None, base_source, 'the new tests pin the fix: they fail on the base mask')]
        for mid, pairs, note in MUTANTS:
            mutated = originals[TARGET.get(mid, MASK)]
            for old, new in pairs:
                if mutated.count(old) != 1:
                    raise SystemExit(f'{mid}: the old fragment occurs {mutated.count(old)} times: {old!r}')
                mutated = mutated.replace(old, new)
            jobs.append((mid, pairs, mutated, note))
        for mid, pairs, mutated, note in jobs:
            if only is not None and mid not in only:
                continue
            file = TARGET.get(mid, MASK)
            path = os.path.join(clone, file)
            with open(path, 'w', encoding='utf8') as handle:
                handle.write(mutated)
            try:
                result, every_failure = detect(mid.split('-')[0])
            finally:
                with open(path, 'w', encoding='utf8') as handle:
                    handle.write(originals[file])
            killed = any(v['failed'] > 0 for v in result.values())
            outcome = 'killed' if killed else ('survived-equivalent' if mid in EQUIVALENT else 'SURVIVED')
            row = {
                'id': mid,
                'ranAt': code_commit,
                'file': file,
                'replacements': [{'old': o, 'new': n} for o, n in pairs] if pairs is not None else 'the whole file of ' + base_commit,
                'fileSha256': hashlib.sha256(mutated.encode('utf8')).hexdigest(),
                'note': note,
                'outcome': outcome,
                'detectors': result,
            }
            if mid in KILLER:
                row['expectedKillers'] = KILLER[mid]
                row['failingTests'] = every_failure
                row['killedByExpectedKillerOnly'] = bool(every_failure) and all(any(pin in name for pin in KILLER[mid]) for name in every_failure)
                row['failingPins'] = [pin for pin in KILLER[mid] if any(pin in name for name in every_failure)]
            rows.append(row)
            print(mid, outcome, {k: v['failed'] for k, v in result.items()}, flush=True)
    finally:
        for file, text in originals.items():
            with open(os.path.join(clone, file), 'w', encoding='utf8') as handle:
                handle.write(text)

    mutants = [r for r in rows if r['id'].startswith('MU')]
    summary = {
        'codeCommit': code_commit,
        'baseCommit': base_commit,
        'mutants': len(mutants),
        'killed': sum(1 for r in mutants if r['outcome'] == 'killed'),
        'survivedEquivalent': sum(1 for r in mutants if r['outcome'] == 'survived-equivalent'),
        'survived': [r['id'] for r in mutants if r['outcome'] == 'SURVIVED'],
        'killedByExpectedKillerOnly': sum(1 for r in mutants if r.get('killedByExpectedKillerOnly')),
        'expectedKillerNotAlone': [r['id'] for r in mutants if 'expectedKiller' in r and not r['killedByExpectedKillerOnly']],
    }
    with open(out, 'w', encoding='utf8') as handle:
        json.dump({'summary': summary, 'rows': rows}, handle, indent=1)
        handle.write('\n')
    print(json.dumps(summary))
    return 0 if not summary['survived'] and not summary['expectedKillerNotAlone'] else 1


if __name__ == '__main__':
    sys.exit(main())
