#!/usr/bin/env python3
"""The fresh measurements of syzygy-bpyt.4.31, run one after another in one clean checkout. Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/measure_batch.py TREE OUTDIR [--runs N] [--only NAME ...] [--kind tests|hooks]

For each file in BATCH: test durations with scripts/measure_vitest_test_durations.py --mode alone (TREE's own copy), hook
durations with measure_vitest_hook_durations.py (this directory), or both, N runs each (default 5). The system tier, which the
first script cannot select, is measured with the second, with SYZYGY_FRESH_CLONE=1 so its fresh-clone test runs as in CI.
Records are written to OUTDIR as <name>.tests.json and <name>.hooks.json; a record already present is skipped, so a stopped
batch resumes; a job that exits nonzero leaves only its .part file. `--only` keeps the named files and `--kind` one kind of job, as
when the removals are re-measured at the head. The files are the ones whose explicit timeouts no introducing commit or retained record measures."""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP, CORE, DOSSIER, CONSENT = '@syzygy/three-surface-poc-app', '@syzygy/three-surface-poc-core', '@syzygy/polaris-dossier', '@syzygy/polaris-generation-consent'
A = 'apps/three-surface-poc/src/'
BATCH = [  # (file, project, what)
    (A + 'cdp-browser.test.ts', APP, 'tests'),
    (A + 'cdp-browser.browser.test.ts', APP, 'tests'),
    (A + 'fixture-directories.test.ts', APP, 'tests'),
    (A + 'test-model-fixture.test.ts', APP, 'tests'),
    (A + 'keyboard-sweep-record.test.ts', APP, 'tests'),
    (A + 'git-blob-batch.test.ts', APP, 'tests'),
    (A + 'proposal-disclosure.test.ts', APP, 'tests'),
    (A + 'tuple-encoding.test.ts', APP, 'tests'),
    (A + 'polaris-generation/self-corpus.test.ts', APP, 'tests'),
    (A + 'polaris-generation/durable-lifecycle-generate.test.ts', APP, 'tests'),
    (A + 'polaris-generation/draft-preview.browser.test.ts', APP, 'tests'),
    (A + 'governing-intent-sweep.test.ts', APP, 'both'),
    (A + 'surface-routes.test.ts', APP, 'both'),
    (A + 'polaris-accessibility.browser.test.ts', APP, 'both'),
    (A + 'polaris-accessible-names.browser.test.ts', APP, 'both'),
    (A + 'polaris-opening-index.browser.test.ts', APP, 'both'),
    (A + 'restart.test.ts', APP, 'hooks'),
    (A + 'orrery.browser.test.ts', APP, 'hooks'),
    (A + 'trajectory-narrowing.browser.test.ts', APP, 'hooks'),
    (A + 'unknown-route-sweep.test.ts', APP, 'hooks'),
    (A + 'polaris-copy.test.ts', APP, 'hooks'),
    (A + 'polaris-reconciliation.test.ts', APP, 'hooks'),
    (A + 'polaris-generation/dossier-cap-measure.test.ts', APP, 'hooks'),
    ('packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts', CORE, 'tests'),
    ('packages/polaris-dossier/src/no-egress.test.ts', DOSSIER, 'both'),
    ('packages/polaris-generation-consent/src/real-tree.test.ts', CONSENT, 'tests'),
    ('packages/cap1-system/src', None, 'system'),
]

args = sys.argv[1:]
if len(args) < 2: sys.exit(__doc__.split('\n\n')[1])
tree, outdir = os.path.abspath(args[0]), os.path.abspath(args[1])
runs = args[args.index('--runs') + 1] if '--runs' in args else '5'
only = {args[i + 1] for i, a in enumerate(args) if a == '--only'}
kind_only = args[args.index('--kind') + 1] if '--kind' in args else None
os.makedirs(outdir, exist_ok=True)
for file, project, what in BATCH:
    name = os.path.basename(file).removesuffix('.ts') if what != 'system' else 'cap1-system'
    if only and name not in only: continue
    jobs = []
    if what in ('tests', 'both'):
        jobs.append(('tests', ['python3', '-I', os.path.join(tree, 'scripts/measure_vitest_test_durations.py'), tree, '--file', file, '--project', project, '--mode', 'alone', '--runs', runs]))
    if what in ('hooks', 'both'):
        jobs.append(('hooks', ['python3', '-I', os.path.join(HERE, 'measure_vitest_hook_durations.py'), tree, '--file', file, '--project', project, '--runs', runs]))
    if what == 'system':
        jobs.append(('hooks', ['python3', '-I', os.path.join(HERE, 'measure_vitest_hook_durations.py'), tree, '--file', file, '--config', 'packages/cap1-system/vitest.config.ts',
                               '--env', 'SYZYGY_FRESH_CLONE=1', '--runs', runs]))
    for kind, command in jobs:
        if kind_only and kind != kind_only: continue
        out = os.path.join(outdir, f'{name}.{kind}.json')
        if os.path.exists(out): print(f'skip {out}: present', flush=True); continue
        print(f'== {name} {kind}', flush=True)
        done = subprocess.run([*command, '--out', out + '.part'], cwd=tree)
        # A job that failed is re-run, never scored: its partial record stays a .part file, which the next batch overwrites.
        if done.returncode != 0: print(f'!! {name} {kind}: exit {done.returncode}', flush=True)
        elif os.path.exists(out + '.part'): os.replace(out + '.part', out)
