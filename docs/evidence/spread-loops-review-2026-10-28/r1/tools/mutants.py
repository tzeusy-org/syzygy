#!/usr/bin/env python3
"""Reviewer's rule-6 runner for syzygy-bpyt.1.18 (R-GP-IMPL-SPREAD-LOOPS-1).

Usage: mutants.py <worktree at the code commit, npm ci done> <tmpdir> <out json> [--timeout MS]
For each mutant: every `old` must occur exactly once in the file; replace it by `new`, run one vitest invocation over the four
changed test files (default per-test timeout unless --timeout), restore the file, and store for every failing test its full name
and the first 400 characters of its first failure message, plus whether that message is a timeout. A mutant is KILLED only by a
failure that is not a timeout; a kill by timeout alone is reported as TIMEOUT-ONLY. R1..R8 are the reviewer's own; L1..L6 re-run
the lane's MU1..MU6 fragments verbatim so their kills can be read. Each row stores old, new, the commit and the mutated file sha256.
"""
import argparse, hashlib, json, os, subprocess, sys

CORE = 'packages/three-surface-poc-core/src/'
MASK = CORE + 'markdown-code-context.ts'
EXTRACTOR = CORE + 'project-shape-extraction.ts'
TESTS = [CORE + f for f in ('markdown-code-context.test.ts', 'project-shape-extraction.test.ts', 'git-object-reader.test.ts', 'project-shape-model.test.ts')]
MASK_LOOP = '        for (const pendingLine of pending) out.push(blank(pendingLine));\n'
EXTRACTOR_LOOP = '    for (const item of result.items) all.push(item);\n'

MUTANTS = [
    ('L1-mask-spread', MASK, MASK_LOOP, '        out.push(...pending.map(blank));\n'),
    ('L2-extractor-spread', EXTRACTOR, EXTRACTOR_LOOP, '    all.push(...result.items);\n'),
    ('L3-mask-drops-closer', MASK, MASK_LOOP, '        for (const pendingLine of pending.slice(0, -1)) out.push(blank(pendingLine));\n'),
    ('L4-extractor-drops-last', EXTRACTOR, EXTRACTOR_LOOP, '    for (const item of result.items.slice(0, -1)) all.push(item);\n'),
    ('L5-mask-reversed', MASK, MASK_LOOP, "        for (let at = pending.length - 1; at >= 0; at -= 1) out.push(blank(pending[at] ?? ''));\n"),
    ('L6-extractor-reversed', EXTRACTOR, EXTRACTOR_LOOP, '    for (let at = result.items.length - 1; at >= 0; at -= 1) all.push(result.items[at] as ExtractedItem);\n'),
    ('R1-mask-skips-opener', MASK, MASK_LOOP, '        for (const pendingLine of pending.slice(1)) out.push(blank(pendingLine));\n'),
    ('R2-mask-blanks-into-wrong-array', MASK, MASK_LOOP, '        const sink: string[] = [];\n        for (const pendingLine of pending) sink.push(blank(pendingLine));\n'),
    ('R3-mask-fails-open-past-150000', MASK, MASK_LOOP, '        for (const pendingLine of pending) out.push(pending.length > 150_000 ? pendingLine : blank(pendingLine));\n'),
    ('R4-mask-chunked-spread-150000', MASK, MASK_LOOP, '        for (let at = 0; at < pending.length; at += 150_000) out.push(...pending.slice(at, at + 150_000).map(blank));\n'),
    ('R5-extractor-dedupes-statement', EXTRACTOR, EXTRACTOR_LOOP, '    const seen = new Set<string | undefined>();\n    for (const item of result.items) { if (seen.has(item.statement)) continue; seen.add(item.statement); all.push(item); }\n'),
    ('R6-extractor-caps-125000', EXTRACTOR, EXTRACTOR_LOOP, '    for (const item of result.items.slice(0, 125_000)) all.push(item);\n'),
    ('R7-extractor-chunked-spread-150000', EXTRACTOR, EXTRACTOR_LOOP, '    for (let at = 0; at < result.items.length; at += 150_000) all.push(...result.items.slice(at, at + 150_000));\n'),
    ('R8-extractor-pushes-first-twice', EXTRACTOR, EXTRACTOR_LOOP, '    for (const item of result.items) all.push(item);\n    if (result.items.length > 100_000) all.push(result.items[0] as ExtractedItem);\n'),
]


def run(cmd, cwd, env=None, check=True):
    return subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, check=check)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('tree'); p.add_argument('tmpdir'); p.add_argument('out'); p.add_argument('--timeout'); p.add_argument('--only')
    ns = p.parse_args()
    only = set(ns.only.split(',')) if ns.only else None
    env = dict(os.environ, TMPDIR=ns.tmpdir)
    os.makedirs(ns.tmpdir, exist_ok=True)
    commit = run(['git', 'rev-parse', 'HEAD'], ns.tree).stdout.strip()
    if run(['git', 'status', '--porcelain'], ns.tree).stdout.strip():
        raise SystemExit('tree is not clean')
    originals = {f: open(os.path.join(ns.tree, f), encoding='utf8').read() for f in (MASK, EXTRACTOR)}
    extra = [f'--testTimeout={ns.timeout}', f'--hookTimeout={ns.timeout}'] if ns.timeout else []

    def detect(label):
        report = os.path.join(ns.tmpdir, f'{label}.json')
        if os.path.exists(report):
            os.remove(report)
        load0 = open('/proc/loadavg').read().split()[0]
        run(['npx', 'vitest', 'run', *extra, '--reporter=json', f'--outputFile={report}', *TESTS], ns.tree, env, check=False)
        data = json.load(open(report, encoding='utf8'))
        tests, failing = 0, []
        for r in data['testResults']:
            if r.get('status') == 'failed' and not r['assertionResults']:
                failing.append({'test': f'(file did not load) {r["name"]}', 'message': (r.get('message') or '')[:400], 'timeout': False})
            for t in r['assertionResults']:
                tests += 1
                if t['status'] == 'failed':
                    msg = (t.get('failureMessages') or [''])[0]
                    failing.append({'test': t['fullName'], 'message': msg[:400], 'timeout': 'timed out' in msg})
        return {'tests': tests, 'loadavg1': load0, 'failing': failing}

    rows = [dict(id='CONTROL', ranAt=commit, **detect('control'))]
    print('CONTROL', rows[0]['tests'], len(rows[0]['failing']), flush=True)
    try:
        for mid, file, old, new in MUTANTS:
            if only and mid not in only:
                continue
            text = originals[file]
            if text.count(old) != 1:
                raise SystemExit(f'{mid}: old occurs {text.count(old)} times')
            mutated = text.replace(old, new)
            with open(os.path.join(ns.tree, file), 'w', encoding='utf8') as h:
                h.write(mutated)
            try:
                res = detect(mid)
            finally:
                with open(os.path.join(ns.tree, file), 'w', encoding='utf8') as h:
                    h.write(text)
            real = [f for f in res['failing'] if not f['timeout']]
            outcome = 'killed' if real else ('TIMEOUT-ONLY' if res['failing'] else 'SURVIVED')
            rows.append(dict(id=mid, ranAt=commit, file=file, old=old, new=new, mutatedFileSha256=hashlib.sha256(mutated.encode()).hexdigest(), outcome=outcome, **res))
            print(mid, outcome, len(res['failing']), 'timeouts', sum(f['timeout'] for f in res['failing']), flush=True)
    finally:
        for f, t in originals.items():
            with open(os.path.join(ns.tree, f), 'w', encoding='utf8') as h:
                h.write(t)
    with open(ns.out, 'w', encoding='utf8') as h:
        json.dump(rows, h, indent=1)
        h.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
