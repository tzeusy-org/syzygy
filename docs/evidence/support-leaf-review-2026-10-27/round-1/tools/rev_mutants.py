#!/usr/bin/env python3
"""rev-530's own rule-6 mutants for PR #530 (syzygy-bpyt.6.3 stack 1), beyond the lane's 24.

Usage: rev_mutants.py <clone at fe3855a1, npm ci done> <base commit> <out.json> [--only id,id]

For each mutant: reset the clone to HEAD_COMMIT, replace each `old` by its `new` in its file (`old` must occur
exactly once), commit on a detached head, then run
  static  the lane's site-equivalence.py (from the clone at HEAD_COMMIT) over <base>..<mutant commit>;
          killed when a file's hash or freeze arguments differ, the global multisets differ, or a
          non-canonical local helper is reported;
  tests   `npx vitest run` over the listed projects or files; killed when the exit code is non-zero.
The clone is reset to HEAD_COMMIT afterwards. Every row stores old/new, HEAD_COMMIT, the mutant commit
(scratch, never pushed), each exit code and the vitest summary lines.
"""
import json
import os
import re
import subprocess
import sys

HEAD_COMMIT = 'fe3855a1b4f2164da3274e02d868399236c45c9c'
SHA = 'packages/support/src/sha256.ts'
FREEZE = 'packages/support/src/deep-freeze.ts'
GEN = 'packages/polaris-generation-core/src/'
CORE = 'packages/three-surface-poc-core/src/'
APP = 'apps/three-surface-poc/src/'
P = lambda *names: [a for n in names for a in ('--project', n)]
CLOSURE_GUARD = [CORE + 'test-artifact-verification-live-source.test.ts']
DRAFTER = [CORE + 'owner-act-drafter.test.ts']

MUTANTS = [
    ('R1-hash-whole-backing-buffer', [(SHA, '.update(value)', ".update(typeof value === 'string' ? value : Buffer.from(value.buffer))")],
     P('@syzygy/support', '@syzygy/three-surface-poc-core', '@syzygy/polaris-generation-core')),
    ('R2-freeze-skips-arrays', [(FREEZE, "typeof value === 'object' && !Object.isFrozen(value)", "typeof value === 'object' && !Array.isArray(value) && !Object.isFrozen(value)")],
     P('@syzygy/support', '@syzygy/three-surface-poc-core', '@syzygy/polaris-generation-core')),
    ('R3-equal-length-reordered-question-digest', [(GEN + 'dossier-profile.ts', 'JSON.stringify([q.id, q.question, q.scope, q.reason])', 'JSON.stringify([q.id, q.scope, q.question, q.reason])')],
     P('@syzygy/polaris-generation-core', '@syzygy/polaris-dossier')),
    ('R4-post-order-unguarded-freeze', [(FREEZE, "  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {\n    Object.freeze(value);\n    for (const member of Object.values(value)) deepFreeze(member);\n  }",
                                         "  if (value !== null && typeof value === 'object') {\n    for (const member of Object.values(value)) deepFreeze(member);\n    Object.freeze(value);\n  }")],
     P('@syzygy/support', '@syzygy/three-surface-poc-core', '@syzygy/polaris-generation-core')),
    ('R5-stale-local-latin1-copy', [(GEN + 'secret-redaction.ts', "import { sha256 } from '@syzygy/support';\n",
                                     "import { createHash } from 'node:crypto';\nconst sha256 = (text: string): string => createHash('sha256').update(text, 'latin1').digest('hex');\n")],
     P('@syzygy/polaris-generation-core', '@syzygy/polaris-dossier')),
    ('R6-closure-imports-node-http', [(SHA, "import { createHash } from 'node:crypto';\n", "import { createHash } from 'node:crypto';\nimport { request } from 'node:http';\nexport const probeRequest = request;\n")],
     CLOSURE_GUARD),
    ('R7-closure-starts-node', [(SHA, "import { createHash } from 'node:crypto';\n", "import { createHash } from 'node:crypto';\nimport { execFileSync } from 'node:child_process';\nexport const probeStart = (): string => execFileSync('node', ['-v'], { encoding: 'utf8' });\n")],
     CLOSURE_GUARD),
    ('R8-support-reads-a-file', [(SHA, "import { createHash } from 'node:crypto';\n", "import { createHash } from 'node:crypto';\nimport { readFileSync } from 'node:fs';\nexport const probeRead = (): string => readFileSync('/etc/hostname', 'utf8');\n")],
     CLOSURE_GUARD + DRAFTER),
    ('R9-equal-length-reordered-attempt-id', [(APP + 'polaris-generation/durable-lifecycle.ts', '`${input.requestId}\\0${input.stage}\\0${input.ordinal}`', '`${input.stage}\\0${input.requestId}\\0${input.ordinal}`')],
     [APP + 'polaris-generation/durable-lifecycle-generate.test.ts', APP + 'polaris-generation/durable-lifecycle.test.ts', APP + 'polaris-generation/dossier-trigger.test.ts']),
    ('R10-upstream-same-length-surface-trees', [(APP + 'walkthrough-inputs.ts', '    trees.push(tree);\n', '    trees.unshift(tree);\n')],
     [APP + 'walkthrough-inputs.test.ts']),
]


def run(cmd, cwd, env=None, timeout=3600):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env={**os.environ, **(env or {})}, timeout=timeout)


def main():
    clone, base, out = sys.argv[1:4]
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    site_eq = os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-3/site-equivalence.py')
    rows = json.load(open(out)) if os.path.exists(out) else []
    done = {r['id'] for r in rows}
    for mid, edits, vitest_args in MUTANTS:
        if (only and mid not in only) or mid in done:
            continue
        run(['git', 'reset', '-q', '--hard', HEAD_COMMIT], clone)
        for path, old, new in edits:
            full = os.path.join(clone, path)
            text = open(full, encoding='utf-8').read()
            assert text.count(old) == 1, (mid, path, text.count(old))
            open(full, 'w', encoding='utf-8').write(text.replace(old, new, 1))
        run(['git', '-c', 'user.name=rev530', '-c', 'user.email=rev530@localhost', 'commit', '-qa', '-m', f'mutant {mid}'], clone)
        mutant_commit = run(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
        static = run([sys.executable, site_eq, clone, base, mutant_commit], clone)
        s = json.loads(static.stdout)
        static_killed = bool(s['filesWhoseHashArgumentsDiffer'] or s['filesWhoseFreezeArgumentsDiffer'] or not s['globalHashArguments']['equal']
                             or not s['globalFreezeArguments']['equal'] or s['noncanonicalLocalHelpers'])
        tmp = f'/tmp/r530-mut-{mid[:3]}'
        os.makedirs(tmp, exist_ok=True)
        tests = run(['npx', 'vitest', 'run', *vitest_args], clone, env={'TMPDIR': tmp})
        run(['rm', '-rf', tmp], clone)
        summary = [line.strip() for line in re.sub(r'\x1b\[[0-9;]*m', '', tests.stdout + tests.stderr).splitlines()
                   if re.match(r'\s*(Test Files|Tests)\s', line)]
        failed = [line.strip() for line in re.sub(r'\x1b\[[0-9;]*m', '', tests.stdout + tests.stderr).splitlines() if line.strip().startswith(('FAIL', '×', '- ', '+ ')) or 'reason' in line][:24]
        rows.append({'id': mid, 'edits': [{'file': p, 'old': o, 'new': n} for p, o, n in edits], 'ranAt': HEAD_COMMIT, 'mutantCommit': mutant_commit,
                     'static': {'killed': static_killed, 'exit': static.returncode, 'hashDiffer': s['filesWhoseHashArgumentsDiffer'],
                                'freezeDiffer': s['filesWhoseFreezeArgumentsDiffer'], 'noncanonical': [n['file'] for n in s['noncanonicalLocalHelpers']]},
                     'tests': {'killed': tests.returncode != 0, 'exit': tests.returncode, 'args': vitest_args, 'summary': summary, 'failed': failed}})
        json.dump(rows, open(out, 'w'), indent=1)
        print(mid, 'static', static_killed, 'tests', tests.returncode, summary, flush=True)
    run(['git', 'reset', '-q', '--hard', HEAD_COMMIT], clone)


if __name__ == '__main__':
    main()
