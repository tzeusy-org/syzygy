#!/usr/bin/env python3
"""rev-520b mutants of scripts/size_vitest_test_timeouts.py --check (PR 520 round 2, N1). usage: python3 -I my_mutants.py TREE OUT.json
Each mutant rewrites one fragment (which must occur exactly once), runs --check with the head's script and with 3e563ec4's script
(copied to rev-520b/tools/), and writes the original bytes back. Expected: the head's check exits 1 on every mutant here.
  R5  the lane's: consent project testTimeout 60_000 in vitest.config.ts (re-run here against both scripts).
  R6  mine: consent project testTimeout 2_000 (the default lowered: the direction R5 does not test).
  R7  mine: vi.setConfig({ testTimeout: 60_000 }) at the top of the test file (the default raised by the file, not the config)."""
import hashlib, json, os, subprocess, sys, tempfile

tree, out_path = os.path.realpath(sys.argv[1]), sys.argv[2]
HERE = os.path.dirname(os.path.realpath(__file__))
F = 'packages/polaris-generation-consent/src/package-reader.test.ts'
E = 'docs/evidence/syzygy-bpyt-4-13'
CONSENT = "          name: '@syzygy/polaris-generation-consent',\n          include: ['packages/polaris-generation-consent/src/**/*.test.ts'],\n"
IMPORT = "import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';\n"
MUTANTS = [
    ('R5', 'vitest.config.ts', CONSENT, CONSENT + '          testTimeout: 60_000,\n'),
    ('R6', 'vitest.config.ts', CONSENT, CONSENT + '          testTimeout: 2_000,\n'),
    ('R7', F, IMPORT, IMPORT + 'vi.setConfig({ testTimeout: 60_000 });\n'),
]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tracked files not clean')
old = os.path.join(HERE, 'old_size_vitest_test_timeouts.py')
if not os.path.exists(old): open(old, 'wb').write(subprocess.run(['git', 'show', '3e563ec4:scripts/size_vitest_test_timeouts.py'], cwd=tree, capture_output=True, check=True).stdout)
scripts = {'head': os.path.join(tree, 'scripts/size_vitest_test_timeouts.py'), 'old-3e563ec4': old}
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()

def check(script, tmp, label):
    cmd = ['python3', '-I', script, '.', '--file', F, '--project', '@syzygy/polaris-generation-consent',
           '--record', f'{E}/before-alone.json', '--record', f'{E}/before-full-1.json', '--record', f'{E}/before-full-2.json',
           '--report', f'{E}/load-127-report-extract.json', '8b143272113f216c797684d7c28cd3204831248f', '127.56', '83.31', '--out', os.path.join(tmp, f'{label}.json'), '--check']
    done = subprocess.run(cmd, cwd=tree, capture_output=True, text=True)
    lines = [l.strip() for l in done.stdout.split('\n') if 'collected,' in l or l.strip().startswith('problem:')]
    return done.returncode, lines, (done.stderr[-600:] if done.returncode not in (0, 1) else '')

results = []
with tempfile.TemporaryDirectory() as tmp:
    for name, path in scripts.items():
        rc, lines, err = check(path, tmp, f'control-{name}')
        results.append({'id': 'control', 'script': name, 'exitCode': rc, 'output': lines, 'stderr': err})
        print('control', name, rc, lines[:1], flush=True)
    for mid, path, frag_old, frag_new in MUTANTS:
        full = os.path.join(tree, path)
        original = open(full, encoding='utf8').read()
        if original.count(frag_old) != 1: sys.exit(f'{mid}: fragment occurs {original.count(frag_old)} times')
        for name, script in scripts.items():
            open(full, 'w', encoding='utf8').write(original.replace(frag_old, frag_new))
            try: rc, lines, err = check(script, tmp, f'{mid}-{name}')
            finally: open(full, 'w', encoding='utf8').write(original)
            results.append({'id': mid, 'script': name, 'file': path, 'old': frag_old, 'new': frag_new, 'exitCode': rc, 'output': lines, 'stderr': err})
            print(mid, name, rc, ' | '.join(lines[:3])[:300], flush=True)
out = {'tool': {'path': os.path.relpath(__file__, os.path.dirname(HERE)), 'sha256': sha(__file__)}, 'commit': git('rev-parse', 'HEAD').strip(),
       'scripts': {k: sha(v) for k, v in scripts.items()}, 'results': results}
json.dump(out, open(out_path, 'w'), indent=1)
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tree not restored')
