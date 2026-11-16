#!/usr/bin/env python3
"""rev-532c (round 3): what PR 532's tools/emit_equal.mjs accepts. Reviewer tool, not authority.

usage: python3 -I emit_equal_probe_r3.py TREE EV OUT.json

TREE is a clone at d0467aeb with node_modules installed; EV is the evidence commit build_record checks against (2b56a253).
Each probe is a scratch commit made from EV with git plumbing only (hash-object, a private index, write-tree, commit-tree;
the working tree and HEAD are never touched, and nothing is pushed), with one file edited by an exact (old, new) pair.
Then it runs the tree's own `node docs/evidence/syzygy-bpyt-4-5/tools/emit_equal.mjs TREE <scratch> EV <the three timed
test files>` and records the JSON it prints. Also records the lane's three pairs and the pairs build_record runs, and the
modules under the timed regions that differ between each separation's tree and EV.
"""
import json, os, subprocess, sys, tempfile

tree, ev, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
FILES = ['packages/polaris-generation-core/src/dossier-profile.test.ts', 'packages/polaris-generation-core/src/excerpt.test.ts',
         'packages/three-surface-poc-core/src/test-artifact-verification.test.ts']
TOOL = os.path.join(tree, 'docs/evidence/syzygy-bpyt-4-5/tools/emit_equal.mjs')
git = lambda *a, **k: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True, **k).stdout
ev = git('rev-parse', ev).strip()

def scratch(path, old, new):
    text = git('show', f'{ev}:{path}')
    if text.count(old) != 1: raise SystemExit(f'{path}: old occurs {text.count(old)} times')
    blob = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=tree, input=text.replace(old, new), capture_output=True, text=True, check=True).stdout.strip()
    index = tempfile.mktemp(prefix='idx-', dir=os.environ.get('TMPDIR', '/tmp'))
    env = {**os.environ, 'GIT_INDEX_FILE': index}
    subprocess.run(['git', 'read-tree', ev], cwd=tree, env=env, check=True)
    subprocess.run(['git', 'update-index', '--cacheinfo', f'100644,{blob},{path}'], cwd=tree, env=env, check=True)
    t = subprocess.run(['git', 'write-tree'], cwd=tree, env=env, capture_output=True, text=True, check=True).stdout.strip()
    os.remove(index)
    return subprocess.run(['git', 'commit-tree', t, '-p', ev, '-m', f'rev-532c scratch: {path}'], cwd=tree, capture_output=True, text=True, check=True,
                          env={**os.environ, 'GIT_AUTHOR_NAME': 'rev-532c', 'GIT_AUTHOR_EMAIL': 'scratch@invalid', 'GIT_COMMITTER_NAME': 'rev-532c',
                               'GIT_COMMITTER_EMAIL': 'scratch@invalid'}).stdout.strip()

def emit_equal(a, b):
    return json.loads(subprocess.run(['node', TOOL, tree, a, b, *FILES], capture_output=True, text=True, check=True).stdout)

EX, EP, TA = FILES[1], FILES[0], FILES[2]
PROBES = [
    ('P1-type-annotation-only', EX, 'const BUDGET = 1500;\n', 'const BUDGET: number = 1500;\n',
     'a type annotation: erased; runtime-equal'),
    ('P2-vitest-environment-docblock', EX, "import { describe, expect, it } from 'vitest';\n",
     "// @vitest-environment jsdom\nimport { describe, expect, it } from 'vitest';\n",
     'a comment that vitest reads: the file runs in another environment (jsdom, not installed here)'),
    ('P3-bound-value', TA, 'const TAG_SCAN_CPU_MS = 1_500;', 'const TAG_SCAN_CPU_MS = 150_000;',
     "a bound's value: masked by design; what the region runs is unchanged, what the test accepts is not"),
    ('P4-module-under-test-slowed', 'packages/polaris-generation-core/src/excerpt.ts', None, None,
     'excerpt.ts (the module the HOSTILE_LINE region runs) gains a busy loop: no timed test file changes'),
]
results = []
for pid, path, old, new, note in PROBES:
    if pid == 'P4-module-under-test-slowed':
        text = git('show', f'{ev}:{path}')
        marker = 'export function buildExcerpt('
        if text.count(marker) != 1: raise SystemExit('buildExcerpt marker')
        line_end = text.index('{', text.index(marker)) + 1
        old, new = text[:line_end], text[:line_end] + '\n  for (let i = 0; i < 5e7; i++) void i; // rev-532c scratch: a slower region\n'
        old = text[text.index(marker):line_end]
        new = old + '\n  for (let i = 0; i < 5e7; i++) void i; // rev-532c scratch: a slower region\n'
    c = scratch(path, old, new)
    results.append({'id': pid, 'file': path, 'old': old, 'new': new, 'note': note, 'scratchCommit': c, 'emitEqual': emit_equal(c, ev)})
    print(json.dumps({k: results[-1][k] for k in ('id', 'emitEqual')}), flush=True)
pairs = {f'{a[:8]}~{ev[:8]}': emit_equal(a, ev) for a in ('722231fe', 'bb5df680', 'c104771f')}
print(json.dumps(pairs), flush=True)
MODULES = ['packages/polaris-generation-core/src', 'packages/three-surface-poc-core/src', 'packages/support/src']
drift = {a: [l for l in git('diff', '--name-status', a, ev, '--', *MODULES).splitlines() if not l.endswith('.test.ts')] for a in ('722231fe', 'bb5df680')}
json.dump({'tool': os.path.basename(__file__), 'ev': ev, 'files': FILES, 'probes': results, 'lanePairs': pairs,
           'nonTestModuleDriftSinceSeparation': drift}, open(out_path, 'w', encoding='utf8'), indent=1)
print(json.dumps({a: len(v) for a, v in drift.items()}))
