#!/usr/bin/env python3
"""rev-530: does packages/polaris-dossier/src/no-egress.test.ts prove the @syzygy/support SOURCE it ships with?

Usage: egress_alias_check.py <clone at fe3855a1, npm ci and npm run build done> <base clone at c104771f, npm ci done> <out json> <tmpdir>

Arms, in this order (the clone is reset to HEAD between arms):
  A  head, dist present (built from unmutated source), support src mutated to bind a loopback UDP socket at import.
     The proof bundles packages/support/dist, so it proves the stale dist, not the mutated source.
  B  as A, plus the proposed one-line alias '@syzygy/support' -> packages/support/src/index.ts. Should fail (killed).
  C  head, dist present, alias added, no mutant. Should pass (the fix does not break the proof).
  -- every dist/ directory under packages/ and apps/ is then deleted in the clone, and in the base clone --
  D  head, every dist absent, as committed. Fails if the bundle cannot resolve @syzygy/support.
  E  head, every dist absent, alias added. Should pass.
  F  base, every dist absent, as committed (control).
Each arm runs `npx vitest run packages/polaris-dossier/src/no-egress.test.ts` and stores exit, summary lines and the
first 'Could not resolve' / Internet-family lines.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys

clone, base, out, tmp = sys.argv[1:5]
TEST = 'packages/polaris-dossier/src/no-egress.test.ts'
SHA = 'packages/support/src/sha256.ts'
ALIAS_OLD = "      '@syzygy/three-surface-poc-core': src('packages/three-surface-poc-core/src/index.ts'),\n"
ALIAS_NEW = ALIAS_OLD + "      '@syzygy/support': src('packages/support/src/index.ts'),\n"
MUT_OLD = "import { createHash } from 'node:crypto';\n"
MUT_NEW = ("import { createHash } from 'node:crypto';\nimport { createSocket } from 'node:dgram';\n"
           "const probeSocket = createSocket('udp4');\nprobeSocket.bind(0, '127.0.0.1');\nprobeSocket.unref();\n")


def sh(cmd, cwd, **kw):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, **kw)


def edit(root, rel, old, new):
    p = os.path.join(root, rel)
    t = open(p, encoding='utf-8').read()
    assert t.count(old) == 1, (rel, t.count(old))
    open(p, 'w', encoding='utf-8').write(t.replace(old, new, 1))


def run(root, arm, edits):
    head = sh(['git', 'rev-parse', 'HEAD'], root).stdout.strip()
    sh(['git', 'checkout', '-q', '--', '.'], root)
    for rel, old, new in edits:
        edit(root, rel, old, new)
    os.makedirs(tmp, exist_ok=True)
    r = sh(['npx', 'vitest', 'run', TEST], root, env={**os.environ, 'TMPDIR': tmp})
    sh(['git', 'checkout', '-q', '--', '.'], root)
    text = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
    lines = text.splitlines()
    row = {'arm': arm, 'ranAt': head, 'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits], 'exit': r.returncode,
           'summary': [l.strip() for l in lines if re.match(r'\s*(Test Files|Tests)\s', l)],
           'resolve': [l.strip() for l in lines if 'Could not resolve' in l][:3],
           'internet': [l.strip() for l in lines if 'AF_INET' in l or '127.0.0.1' in l][:4],
           'distPresent': bool(glob.glob(os.path.join(root, 'packages/support/dist/index.js')))}
    rows.append(row)
    json.dump(rows, open(out, 'w'), indent=1)
    print(arm, row['exit'], row['summary'], row['resolve'][:1], row['internet'][:2], flush=True)


rows = []
mut = (SHA, MUT_OLD, MUT_NEW)
alias = (TEST, ALIAS_OLD, ALIAS_NEW)
run(clone, 'A-stale-dist-mutant', [mut])
run(clone, 'B-stale-dist-mutant-with-alias', [mut, alias])
run(clone, 'C-dist-present-alias-no-mutant', [alias])
for root in (clone, base):
    for d in glob.glob(os.path.join(root, 'packages/*/dist')) + glob.glob(os.path.join(root, 'apps/*/dist')):
        shutil.rmtree(d)
run(clone, 'D-dist-absent-as-committed', [])
run(clone, 'E-dist-absent-alias', [alias])
run(base, 'F-base-dist-absent-control', [])
