#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.55: do the tests fail when the shared recognizer, the mask built from it, or a reader's use of it changes?

Usage: fence-mutants.py <scratch clone checked out at the code commit, npm ci done> <code commit> <base commit> <tmpdir> <out json>
                        [--only id,id]

For each mutant: replace each `old` fragment of one source file by its `new` (every `old` must occur exactly once), run one vitest
invocation over the six test files below, store every failing test, and restore the file. A mutant is KILLED when at least one test
fails. R* mutate the recognizer, K* the mask built from its ranges, W* a reader's use of it. BASE-readers restores the base commit's
whole extractor and manifest module (the old fence rules) beside the new recognizer: it is the proof that the new tests fail on the old
reader behaviour. Each row stores the old and new fragments, the code commit it ran at and the sha256 of the mutated file, so it can be
re-run. The detectors:
  mask        packages/three-surface-poc-core/src/markdown-code-context.test.ts
  extractor   packages/three-surface-poc-core/src/project-shape-extraction.test.ts
  manifest    packages/three-surface-poc-core/src/project-shape-manifest.test.ts
  observation packages/three-surface-poc-core/src/project-shape-observation.test.ts
  reader      packages/three-surface-poc-core/src/git-object-reader.test.ts
  fenceRules  apps/three-surface-poc/src/fence-rules.test.ts
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

CORE = 'packages/three-surface-poc-core/src/'
MASK = CORE + 'markdown-code-context.ts'
EXTRACTOR = CORE + 'project-shape-extraction.ts'
MANIFEST = CORE + 'project-shape-manifest.ts'
DETECTORS = {
    'mask': [CORE + 'markdown-code-context.test.ts'],
    'extractor': [CORE + 'project-shape-extraction.test.ts'],
    'manifest': [CORE + 'project-shape-manifest.test.ts'],
    'observation': [CORE + 'project-shape-observation.test.ts'],
    'reader': [CORE + 'git-object-reader.test.ts'],
    'fenceRules': ['apps/three-surface-poc/src/fence-rules.test.ts'],
}
FILES = (MASK, EXTRACTOR, MANIFEST)

# (id, file, [(old, new)], note)
MUTANTS = [
    ('R1-opener-indent-4', MASK, [('const FENCE_OPENER = /^ {0,3}(', 'const FENCE_OPENER = /^ {0,4}(')], 'a four-space-indented line opens a fence'),
    ('R2-closer-length-strict', MASK, [('return run[0] === char && run.length >= length;', 'return run[0] === char && run.length > length;')], 'a closer must be longer than the opener'),
    ('R3-closer-allows-trailing-tab', MASK, [('/^ {0,3}(`{3,}|~{3,}) *$/', '/^ {0,3}(`{3,}|~{3,})[ \\t]*$/')], 'a closer-shaped line ending in a tab closes'),
    ('R4-span-closes-at-longer-run', MASK, [('} else if (runLength === span.length) {', '} else if (runLength >= span.length) {')], 'a longer backtick run closes a span'),
    ('R5-backtick-info-ignored', MASK, [("if (run[0] === '`' && info.includes('`')) note('backtick-fence-with-backtick-in-info-string', lineNumber);", '')], 'a backtick fence with a backtick in its info string is not malformed'),
    ('R6-fence-range-includes-terminator', MASK, [('fenceRanges.push([fence.start, lineStart + line.length]);', "fenceRanges.push([fence.start, lineStart + line.length + (terminators[index] ?? '').length]);")], 'a fence range runs through its closer line terminator'),
    ('R7-unclosed-fence-range-dropped', MASK, [('fenceRanges.push([fence.start, text.length]);', '')], 'an unclosed fence has no range (D1 recovery)'),
    ('R8-open-span-kept-at-fence-opener', MASK, [("        note('unclosed-inline-span', span.line);\n        span = undefined;\n      }\n      const run", "        note('unclosed-inline-span', span.line);\n      }\n      const run")], 'a span still open at a fence opener stays open (D1 recovery)'),
    ('R9-first-malformation-overwritten', MASK, [('malformed ??= { reason, line };', 'malformed = { reason, line };')], 'the last malformation is reported, not the first'),
    ('R10-fences-count-counts-unclosed', MASK, [('const fences = fenceRanges.length;', 'const fences = fenceRanges.length + (fence !== undefined ? 1 : 0);')], 'an unclosed fence is counted as closed'),
    ('R11-is-fenced-excludes-opener-offset', MASK, [('range[0] <= offset;', 'range[0] < offset;')], 'the first offset of a fence is not fenced'),
    ('R12-is-fenced-includes-range-end', MASK, [('if ((ranges[mid] as CodeContextRange)[1] > offset) high = mid;', 'if ((ranges[mid] as CodeContextRange)[1] >= offset) high = mid;')], 'the offset at a range end is fenced'),
    ('R13-span-range-not-clipped-at-start', MASK, [('out.push([Math.max(range[0], start), Math.min(range[1], end)]);', 'out.push([range[0], Math.min(range[1], end)]);')], 'a span range that opens on an earlier line is not clipped to the line'),
    ('K1-mask-ignores-spans', MASK, [('[...recognition.fenceRanges, ...recognition.spanRanges]', '[...recognition.fenceRanges]')], 'the mask does not blank spans'),
    ('K2-mask-blanks-cr', MASK, [(".replace(/[^\\r\\n]/g, ' ')", ".replace(/[^\\n]/g, ' ')")], 'the mask blanks a CR'),
    ('K3-mask-ignores-malformed', MASK, [("  if (recognition.malformed !== undefined) return { kind: 'malformed', ...recognition.malformed };\n", '')], 'the mask is built from the ranges of a malformed text'),
    ('W1-extractor-ignores-recognizer', EXTRACTOR, [('const inside = isFencedAt(recognition, offset);', 'const inside = false;')], 'the extractor sees no fence'),
    ('W2-extractor-offset-drift', EXTRACTOR, [('offset += raw.length + 1;', 'offset += raw.length;')], 'the extractor asks the recognizer about the wrong offset'),
    ('W3-links-ignore-fences', MANIFEST, [('if (isFencedAt(recognition, start)) continue;', '')], 'the link reader sees no fence'),
    ('W4-links-keep-spans', MANIFEST, [('if (!stripInlineCode) {', 'if (true) {')], 'the link reader keeps code spans'),
    ('W5-links-blank-spans', MANIFEST, [(".replace(/[^\\r\\n]/g, '')", ".replace(/[^\\r\\n]/g, ' ')")], 'the link reader blanks a span instead of deleting it (D3)'),
    ('W6-links-offset-drift', MANIFEST, [('offset += line.length + 1;', 'offset += line.length;')], 'the link reader asks the recognizer about the wrong offset'),
    ('W7-roots-strip-spans', MANIFEST, [('const lines = stripFences(text, false);', 'const lines = stripFences(text, true);')], 'the root-index pillar reader deletes code spans (its table cells are spans)'),
]
def run(cmd, cwd, env=None, check=True):
    return subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, check=check)


def sha_text(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


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
    originals = {f: open(os.path.join(clone, f), encoding='utf8').read() for f in FILES}
    env = dict(os.environ, TMPDIR=tmpdir)
    os.makedirs(tmpdir, exist_ok=True)

    head_now = run(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
    if head_now != code_commit:
        raise SystemExit(f'clone is at {head_now}, not {code_commit}')
    if run(['git', 'status', '--porcelain'], clone).stdout.strip():
        raise SystemExit('clone is not clean')
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
        by_detector, failing = {}, []
        for name, files in DETECTORS.items():
            failed, total = [], 0
            for result in data['testResults']:
                rel = os.path.relpath(result['name'], clone)
                if rel not in files:
                    continue
                if result.get('status') == 'failed' and not result['assertionResults']:
                    failed.append(f'(file did not load) {rel}')
                for t in result['assertionResults']:
                    total += 1
                    if t['status'] == 'failed':
                        failed.append(t['fullName'])
            by_detector[name] = {'tests': total, 'failed': len(failed)}
            failing += failed
        return by_detector, failing

    jobs = []
    for mid, file, pairs, note in MUTANTS:
        mutated = originals[file]
        for old, new in pairs:
            if mutated.count(old) != 1:
                raise SystemExit(f'{mid}: the old fragment occurs {mutated.count(old)} times: {old!r}')
            mutated = mutated.replace(old, new)
        jobs.append((mid, {file: mutated}, [{'file': file, 'old': o, 'new': n} for o, n in pairs], note))
    base_files = {f: run(['git', 'show', f'{base_commit}:{f}'], clone).stdout for f in (EXTRACTOR, MANIFEST)}
    jobs.append(('BASE-readers', {EXTRACTOR: base_files[EXTRACTOR], MANIFEST: base_files[MANIFEST]}, 'the whole extractor and manifest modules at ' + base_commit, 'the new tests fail on the old reader fence rules'))

    try:
        control, control_failing = detect('control')
        rows.append({'id': 'CONTROL-code-commit', 'ranAt': code_commit, 'detectors': control, 'failingTests': control_failing})
        print('CONTROL', {k: (v['tests'], v['failed']) for k, v in control.items()}, flush=True)
        for mid, files, replacements, note in jobs:
            if only is not None and mid not in only:
                continue
            for file, text in files.items():
                with open(os.path.join(clone, file), 'w', encoding='utf8') as handle:
                    handle.write(text)
            try:
                result, failing = detect(mid.split('-')[0])
            finally:
                for file, text in originals.items():
                    with open(os.path.join(clone, file), 'w', encoding='utf8') as handle:
                        handle.write(text)
            row = {
                'id': mid,
                'ranAt': code_commit,
                'replacements': replacements,
                'mutatedFileSha256': {f: sha_text(t) for f, t in files.items()},
                'note': note,
                'outcome': 'killed' if failing else 'SURVIVED',
                'detectors': result,
                'failingTests': failing,
            }
            rows.append(row)
            print(mid, row['outcome'], {k: v['failed'] for k, v in result.items()}, flush=True)
    finally:
        for file, text in originals.items():
            with open(os.path.join(clone, file), 'w', encoding='utf8') as handle:
                handle.write(text)

    mutants = [r for r in rows if not r['id'].startswith(('CONTROL', 'BASE'))]
    base = [r for r in rows if r['id'].startswith('BASE')]
    summary = {
        'codeCommit': code_commit,
        'baseCommit': base_commit,
        'controlFailing': len(rows[0]['failingTests']),
        'mutants': len(mutants),
        'killed': sum(1 for r in mutants if r['outcome'] == 'killed'),
        'survived': [r['id'] for r in mutants if r['outcome'] == 'SURVIVED'],
        'baseFailingTests': len(base[0]['failingTests']) if base else None,
    }
    with open(out, 'w', encoding='utf8') as handle:
        json.dump({'summary': summary, 'rows': rows}, handle, indent=1)
        handle.write('\n')
    print(json.dumps(summary))
    return 0 if not summary['survived'] and summary['controlFailing'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
