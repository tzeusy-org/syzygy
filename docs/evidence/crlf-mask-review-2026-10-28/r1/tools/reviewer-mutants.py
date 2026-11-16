#!/usr/bin/env python3
"""Reviewer rule-6 mutants for PR 544 (R-GP-IMPL-CRLF-MASK-1).

Usage: reviewer-mutants.py <clone at the reviewed commit, npm ci done> <tmpdir> <out.json>
Each mutant replaces one or more fragments (each must occur exactly once) of one production file, runs one vitest invocation over
the seven test files of the PR, records every failing test with its first assertion line, and restores the file. The load average
is recorded beside every run.
"""
import hashlib
import json
import os
import subprocess
import sys

MASK = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
READER = 'packages/three-surface-poc-core/src/git-object-reader.ts'
SEVEN = [
    'packages/three-surface-poc-core/src/markdown-code-context.test.ts',
    'packages/three-surface-poc-core/src/content-classification.test.ts',
    'packages/three-surface-poc-core/src/git-object-reader.test.ts',
    'apps/three-surface-poc/src/fence-rules.test.ts',
    'apps/three-surface-poc/src/verbatim-route.test.ts',
    'apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts',
    'packages/polaris-dossier/src/screen.test.ts',
]
BS = '\\'
LINE_END = 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n/g;'
JOIN = "out.map((line, index) => line + (terminators[index] ?? '')).join('')"
MUTANTS = [
    ('RM1-closer-sees-cr-of-crlf', MASK, [('if (fenceCloser(line, fence.char, fence.length)) {',
      "if (fenceCloser(line + (terminators[index] === '" + BS + 'r' + BS + "n' ? '" + BS + "r' : ''), fence.char, fence.length)) {")],
     'the closer regex alone sees the CR of a CRLF line end'),
    ('RM2-drop-final-terminator', MASK, [(JOIN,
      "out.map((line, index) => line + (index === out.length - 2 && out[out.length - 1] === '' ? '' : (terminators[index] ?? ''))).join('')")],
     'a text that ends in a terminator loses it in the mask'),
    ('RM3-opener-sees-bare-cr', MASK, [('const opener = FENCE_OPENER.exec(line);',
      "const opener = FENCE_OPENER.exec(line + (terminators[index] === '" + BS + "r' ? '" + BS + "r' : ''));")],
     'the opener regex alone sees a bare CR line end'),
    ('RM4-cr-blanked-length-kept', MASK, [(JOIN, "out.map((line, index) => line + (terminators[index] ?? '').replace('" + BS + "r', ' ')).join('')")],
     'every CR of the mask becomes a space; length and LF offsets kept'),
    ('RM5-span-reset-at-bare-cr', MASK, [('    out.push(rendered);\n', "    out.push(rendered);\n    if (terminators[index] === '" + BS + "r') span = undefined;\n")],
     'an inline span cannot continue across a bare CR'),
    ('RM6-malformed-line-counts-lf-only', MASK, [('const lineNumber = index + 1;', "const lineNumber = terminators.slice(0, index).filter((t) => t.includes('" + BS + "n')).length + 1;")],
     'the malformed line counts LF-bearing line ends only (the positionOf model)'),
    ('RM7-u2028-is-a-line-end', MASK, [(LINE_END, 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'u2028/g;')],
     'U+2028 ends a line too: changes LF texts that hold one'),
    ('RM8-positionOf-counts-bare-cr', READER, [('if (text.charCodeAt(i) === 10) {',
      'if (text.charCodeAt(i) === 10 || (text.charCodeAt(i) === 13 && text.charCodeAt(i + 1) !== 10)) {')],
     'positionOf counts a bare CR as a line end (changes non-malformed positions in bare-CR texts only)'),
    ('RM9-crlf-re-emitted-as-lfcr', MASK, [('terminators.push(end[0]);', "terminators.push(end[0] === '" + BS + 'r' + BS + "n' ? '" + BS + 'n' + BS + "r' : end[0]);")],
     'a CRLF comes back as LF CR: length kept, bytes swapped'),
]


def sha(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def loadavg():
    return open('/proc/loadavg').read().strip()


def detect(clone, tmpdir, label):
    report = os.path.join(tmpdir, f'{label}.json')
    if os.path.exists(report):
        os.remove(report)
    before = loadavg()
    proc = subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={report}', *SEVEN], cwd=clone,
                          env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True)
    after = loadavg()
    if not os.path.exists(report):
        raise SystemExit(f'{label}: no report (exit {proc.returncode}): {proc.stderr[-400:]}')
    data = json.load(open(report, encoding='utf8'))
    failed = []
    total = 0
    for result in data['testResults']:
        rel = os.path.relpath(result['name'], clone)
        if result.get('status') == 'failed' and not result['assertionResults']:
            failed.append({'file': rel, 'test': '(file did not load)', 'error': (result.get('message') or '')[:200]})
        for t in result['assertionResults']:
            total += 1
            if t['status'] != 'passed':
                msg = (t['failureMessages'][0] if t['failureMessages'] else '').split('\n')[0][:220]
                failed.append({'file': rel, 'test': t['fullName'][:200], 'error': msg})
    timeouts = sum(1 for f in failed if 'timed out' in f['error'].lower())
    return {'tests': total, 'failed': len(failed), 'timeouts': timeouts, 'loadavgBefore': before, 'loadavgAfter': after, 'failures': failed[:12],
            'failedTests': sorted(f['file'].rsplit('/', 1)[-1] + ' :: ' + f['test'][:140] for f in failed)}


def main():
    clone, tmpdir, out = sys.argv[1:4]
    os.makedirs(tmpdir, exist_ok=True)
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=clone, capture_output=True, text=True, check=True).stdout.strip()
    if subprocess.run(['git', 'status', '--porcelain'], cwd=clone, capture_output=True, text=True).stdout.strip():
        raise SystemExit('clone not clean')
    rows = [{'id': 'CONTROL', 'ranAt': commit, **detect(clone, tmpdir, 'control')}]
    print('CONTROL', rows[0]['tests'], rows[0]['failed'], flush=True)
    for mid, rel, pairs, note in MUTANTS:
        path = os.path.join(clone, rel)
        original = open(path, encoding='utf8').read()
        mutated = original
        for old, new in pairs:
            if mutated.count(old) != 1:
                raise SystemExit(f'{mid}: fragment occurs {mutated.count(old)} times: {old!r}')
            mutated = mutated.replace(old, new)
        try:
            with open(path, 'w', encoding='utf8') as handle:
                handle.write(mutated)
            result = detect(clone, tmpdir, mid.split('-')[0])
        finally:
            with open(path, 'w', encoding='utf8') as handle:
                handle.write(original)
        outcome = 'killed' if result['failed'] > 0 else 'SURVIVED'
        rows.append({'id': mid, 'ranAt': commit, 'file': rel, 'replacements': [{'old': o, 'new': n} for o, n in pairs], 'mutatedSha256': sha(mutated), 'note': note, 'outcome': outcome, **result})
        print(mid, outcome, result['failed'], 'timeouts', result['timeouts'], flush=True)
    with open(out, 'w', encoding='utf8') as handle:
        json.dump({'tool': 'rev-544/tools/reviewer-mutants.py', 'ranAt': commit, 'rows': rows}, handle, indent=1)
        handle.write('\n')


if __name__ == '__main__':
    main()
