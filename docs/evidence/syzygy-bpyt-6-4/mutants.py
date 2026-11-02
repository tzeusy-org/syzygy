#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.6.4: the untyped-Unknown gate must fail when each predicate breaks.

Usage: mutants.py <checkout> <out.json>

Each mutant replaces one fragment (exactly one occurrence) in one file, runs its check, restores the file
byte for byte, and records old/new, the check, its exit code and the diagnostics that prove the named
predicate fired. Type mutants widen one field back to string (or any): the check is the root typecheck,
and the predicate fired when TS2578 (unused @ts-expect-error) is reported in project-shape-model.test.ts.
Runtime mutants change a value: the check is the one vitest case.
"""
import json
import os
import re
import subprocess
import sys

ROOT, OUT = sys.argv[1], sys.argv[2]
TEST = 'packages/three-surface-poc-core/src/project-shape-model.test.ts'
CORE = 'packages/three-surface-poc-core/src/'

MUTANTS = [
    ('T1-constructor', CORE + 'epistemic.ts',
     'export function unknown(closedReason: UnknownReason, basis: string',
     'export function unknown(closedReason: any, basis: string', 'type'),
    ('T2-fixed-unknown', CORE + 'content-classification.ts',
     '  readonly degradationState: string;\n  readonly unknownReason: UnknownReason;\n}',
     '  readonly degradationState: string;\n  readonly unknownReason: string;\n}', 'type'),
    ('T3-degradation', CORE + 'project-shape-observation.ts',
     '  readonly unknownReason: UnknownReason;\n  readonly detail: string;\n}',
     '  readonly unknownReason: string;\n  readonly detail: string;\n}', 'type'),
    ('T4-class-denominator', CORE + 'project-shape-coverage.ts',
     "'source-withheld';\n      readonly unknownReason: UnknownReason;",
     "'source-withheld';\n      readonly unknownReason: string;", 'type'),
    ('T5-reconciled-fact', CORE + 'project-shape-coverage.ts',
     "      readonly state: 'unknown';\n      readonly declarations: readonly Declaration[];\n      readonly unknownReason: UnknownReason;",
     "      readonly state: 'unknown';\n      readonly declarations: readonly Declaration[];\n      readonly unknownReason: string;", 'type'),
    ('T6-item-coverage', CORE + 'project-shape-coverage.ts',
     '  readonly unknownReason?: UnknownReason;\n}',
     '  readonly unknownReason?: string;\n}', 'type'),
    ('T7-current-authority', CORE + 'proposed-work.ts',
     'readonly reason: UnknownReason | typeof NO_SEED_SET_CURRENT_AUTHORITY_REASON;',
     'readonly reason: string;', 'type'),
    ('R1-constructor-key-order', CORE + 'epistemic.ts',
     "    reason: basis,\n    closedReason,\n",
     "    closedReason,\n    reason: basis,\n", 'runtime'),
    ('R2-producer-reason', CORE + 'epistemic.ts',
     "  testArtifact: 'missing-evidence',",
     "  testArtifact: 'no-test-evidence' as UnknownReason,", 'runtime'),
    ('R3-failure-state-reason', CORE + 'project-shape-observation.ts',
     "unknownReason: 'unconsented-source-or-provider' },\n} as const satisfies",
     "unknownReason: 'consent-withdrawn' as UnknownReason },\n} as const satisfies", 'runtime'),
]


def run(cmd):
    env = {**os.environ, 'TMPDIR': os.environ.get('TMPDIR', '/tmp/b64/tt')}
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=env)
    return p.returncode, re.sub(r'\x1b\[[0-9;]*m', '', p.stdout + p.stderr)


def main():
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    results = []
    for mid, path, old, new, kind in MUTANTS:
        full = os.path.join(ROOT, path)
        original = open(full, 'rb').read()
        text = original.decode()
        count = text.count(old)
        if count != 1:
            results.append({'id': mid, 'file': path, 'old': old, 'new': new, 'error': f'old fragment occurs {count} times'})
            continue
        open(full, 'wb').write(text.replace(old, new).encode())
        try:
            if kind == 'type':
                code, out = run(['npx', 'tsc', '-p', 'tsconfig.json', '--noEmit'])
                lines = [l for l in out.splitlines() if 'error TS' in l]
                fired = [l for l in lines if l.startswith(TEST) and 'TS2578' in l]
                results.append({'id': mid, 'kind': kind, 'file': path, 'old': old, 'new': new, 'check': 'npx tsc -p tsconfig.json --noEmit',
                                'exitCode': code, 'killed': code != 0 and len(fired) > 0, 'predicateDiagnostics': fired, 'otherDiagnostics': len(lines) - len(fired)})
            else:
                code, out = run(['npx', 'vitest', 'run', TEST, '-t', 'a producer cannot emit an untyped Unknown reason'])
                tail = [l.strip() for l in out.splitlines() if 'Tests ' in l or 'AssertionError' in l or 'Expected' in l][:6]
                results.append({'id': mid, 'kind': kind, 'file': path, 'old': old, 'new': new,
                                'check': "npx vitest run " + TEST + " -t 'a producer cannot emit an untyped Unknown reason'",
                                'exitCode': code, 'killed': code != 0, 'output': tail})
        finally:
            open(full, 'wb').write(original)
    clean = subprocess.run(['git', 'status', '--porcelain', '--', 'packages', 'apps'], cwd=ROOT, capture_output=True, text=True).stdout
    record = {'bead': 'syzygy-bpyt.6.4', 'commit': head, 'treeRestored': clean == '', 'mutants': results,
              'killed': sum(1 for r in results if r.get('killed')), 'total': len(MUTANTS)}
    open(OUT, 'w').write(json.dumps(record, indent=1) + '\n')
    print(json.dumps({k: record[k] for k in ('commit', 'treeRestored', 'killed', 'total')}))
    for r in results:
        print(r['id'], r.get('killed'), r.get('exitCode'), r.get('error', ''))


if __name__ == '__main__':
    main()
