#!/usr/bin/env python3
"""SEC-3 live-verification closure at two commits: same file set, and every closure file's blob equal.

Usage: closure-equal.py <clone> <rev-a> <rev-b>
Uses guard-coverage.py's walk (seed test-artifact-verification.live.test.ts; relative specifiers plus @syzygy/cap1-core and
@syzygy/support into src/index.ts). Prints sizes, files only on one side, files whose blob differs, and importers of
@syzygy/support on each side.
"""
import importlib.util
import os
import re
import subprocess
import sys

clone, a, b = sys.argv[1:4]
sys.argv = [sys.argv[0], clone]
spec = importlib.util.spec_from_file_location('gc', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'guard-coverage.py'))
gc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gc)
SEED = 'packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts'
ca, cb = gc.closure(a, SEED), gc.closure(b, SEED)
blob = lambda rev, p: subprocess.run(['git', '-C', clone, 'rev-parse', f'{rev}:{p}'], capture_output=True, text=True).stdout.strip()
differ = sorted(p for p in ca & cb if blob(a, p) != blob(b, p))
imp = lambda rev, files: sorted(p for p in files if re.search(r"""from\s+['"]@syzygy/support['"]""", gc.show(rev, p) or ''))
print(f'{a}: {len(ca)} files; {b}: {len(cb)} files; only {a}: {sorted(ca - cb)}; only {b}: {sorted(cb - ca)}; blobs differ: {differ}')
print(f'importers of @syzygy/support: {a} {len(imp(a, ca))}, {b} {len(imp(b, cb))}')
