#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.1.18: do the new tests fail when a one-call spread push comes back, or a loop is off by one?

Usage: spread-mutants.py <scratch clone checked out at the code commit, npm ci done> <code commit> <base commit> <tmpdir> <out json>
                         [--only id,id]

For each mutant: replace each `old` fragment of one source file by its `new` (every `old` must occur exactly once), run one vitest
invocation over the four test files below, store every failing test, and restore the file. A mutant is KILLED when at least one test
fails. MU1 and MU2 restore the old one-call spread at one site each; MU3 to MU6 are the off-by-one and order faults a hand-written
loop can have. BASE-both-spreads restores both old lines at once: it is the proof that the new tests fail on the base behaviour.
Each row stores the old and new fragments, the code commit it ran at and the sha256 of the mutated file, so it can be re-run.
The detectors:
  mask       packages/three-surface-poc-core/src/markdown-code-context.test.ts
  extractor  packages/three-surface-poc-core/src/project-shape-extraction.test.ts
  reader     packages/three-surface-poc-core/src/git-object-reader.test.ts
  model      packages/three-surface-poc-core/src/project-shape-model.test.ts
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
DETECTORS = {
    'mask': [CORE + 'markdown-code-context.test.ts'],
    'extractor': [CORE + 'project-shape-extraction.test.ts'],
    'reader': [CORE + 'git-object-reader.test.ts'],
    'model': [CORE + 'project-shape-model.test.ts'],
}

MASK_LOOP = '        for (const pendingLine of pending) out.push(blank(pendingLine));\n'
EXTRACTOR_LOOP = '    for (const item of result.items) all.push(item);\n'
MASK_SPREAD = '        out.push(...pending.map(blank));\n'
EXTRACTOR_SPREAD = '    all.push(...result.items);\n'

# (id, file, [(old, new)], note)
MUTANTS = [
    ('MU1-mask-spread', MASK, [(MASK_LOOP, MASK_SPREAD)], 'the base line: one spread call over the fence'),
    ('MU2-extractor-spread', EXTRACTOR, [(EXTRACTOR_LOOP, EXTRACTOR_SPREAD)], 'the base line: one spread call over the class'),
    ('MU3-mask-loop-drops-closer', MASK, [(MASK_LOOP, '        for (const pendingLine of pending.slice(0, -1)) out.push(blank(pendingLine));\n')], 'the closing line is not blanked or kept: the masked text loses a line'),
    ('MU4-extractor-loop-drops-last-item', EXTRACTOR, [(EXTRACTOR_LOOP, '    for (const item of result.items.slice(0, -1)) all.push(item);\n')], 'the last item of each class is lost; the denominator still counts it'),
    ('MU5-mask-loop-reversed', MASK, [(MASK_LOOP, '        for (let at = pending.length - 1; at >= 0; at -= 1) out.push(blank(pending[at] ?? \'\'));\n')], 'the fence lines are blanked in reverse order'),
    ('MU6-extractor-loop-reversed', EXTRACTOR, [(EXTRACTOR_LOOP, '    for (let at = result.items.length - 1; at >= 0; at -= 1) all.push(result.items[at] as ExtractedItem);\n')], 'the items of each class are appended in reverse order'),
    ('R10-extractor-size-gated-reversal', EXTRACTOR, [(EXTRACTOR_LOOP, '    for (let at = 0; at < result.items.length; at += 1) all.push(result.items[result.items.length > 100_000 ? result.items.length - 1 - at : at] as ExtractedItem);\n')], 'review round 2: a class past 100,000 items is appended in reverse order (a size-gated fault no small fixture reaches)'),
    ('R11-extractor-chunks-last-first', EXTRACTOR, [(EXTRACTOR_LOOP, '    for (let at = Math.floor((result.items.length - 1) / 50_000) * 50_000; at >= 0; at -= 50_000) all.push(...result.items.slice(at, at + 50_000));\n')], 'review round 2: a chunked spread whose 50,000-item chunks are appended last-first (identical to the loop for a class of 50,000 items or fewer)'),
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
    originals = {f: open(os.path.join(clone, f), encoding='utf8').read() for f in (MASK, EXTRACTOR)}
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
    base_files = {f: run(['git', 'show', f'{base_commit}:{f}'], clone).stdout for f in (MASK, EXTRACTOR)}
    jobs.append(('BASE-both-spreads', base_files, 'the whole of both files at ' + base_commit, 'the new tests fail on the base behaviour'))

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
