"""syzygy-bpyt.7.15: does the POC still need @syzygy/cap1-daemon? Build the POC project alone from a fresh clone, where no
`dist` exists, and see which projects `tsc -b` builds. `tsc -b` builds a project's references first, so cap1-daemon's dist
appears only if the POC still references it, and any POC file (tests included, since tsconfig includes all of `src`) that
imports it fails to resolve once it has no dist.

Two builds per commit, each from no dist at all:
  plain:  `npx tsc -b apps/three-surface-poc` as committed;
  mutant: the same after one POC test file re-imports the host through `@syzygy/cap1-daemon` (rule 6: at a commit without the
          reference, this build must fail).
The clone is deleted afterwards.
Usage: python3 -I poc_alone.py <repo> <commit> <tmpdir> <out.json>
"""
import glob, json, os, shutil, subprocess, sys

repo, commit, tmpdir, out_file = sys.argv[1:5]
clone = os.path.join(tmpdir, 'clone')
MUTANT_FILE = 'apps/three-surface-poc/src/routes.test.ts'
MUTANT_OLD = "import { afterEach, describe, expect, it, vi } from 'vitest';\n"
MUTANT_NEW = MUTANT_OLD + "import type { RouteContext as Cap1RouteContext } from '@syzygy/cap1-daemon';\nexport type Cap1Context = Cap1RouteContext;\n"
env = {**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}


def run(*args, check=True):
    return subprocess.run(list(args), cwd=clone, capture_output=True, text=True, env=env, check=check, timeout=900)


def dists():
    return sorted(os.path.relpath(p, clone) for top in ('apps', 'packages') for p in glob.glob(os.path.join(clone, top, '*', 'dist')))


def build(label):
    for d in dists():
        shutil.rmtree(os.path.join(clone, d))
    before = dists()
    r = run('npx', 'tsc', '-b', 'apps/three-surface-poc', check=False)
    lines = [line for line in (r.stdout + r.stderr).splitlines() if line.strip()]
    return {'label': label, 'distBefore': before, 'exit': r.returncode, 'distAfter': dists(),
            'errors': [line for line in lines if 'error TS' in line][:5], 'outputLines': len(lines)}


os.makedirs(tmpdir, exist_ok=True)
shutil.rmtree(clone, ignore_errors=True)
subprocess.run(['git', 'clone', '-q', '--no-checkout', repo, clone], check=True)
run('git', 'checkout', '-q', commit)
head = run('git', 'rev-parse', 'HEAD').stdout.strip()
run('npm', 'ci', '--no-audit', '--no-fund', '--ignore-scripts')
references = [r['path'] for r in json.load(open(os.path.join(clone, 'apps/three-surface-poc/tsconfig.json')))['references']]
builds = [build('plain')]
text = open(os.path.join(clone, MUTANT_FILE)).read()
assert text.count(MUTANT_OLD) == 1
open(os.path.join(clone, MUTANT_FILE), 'w').write(text.replace(MUTANT_OLD, MUTANT_NEW))
builds.append({**build('mutant'), 'mutant': {'file': MUTANT_FILE, 'old': MUTANT_OLD, 'new': MUTANT_NEW}})
run('git', 'checkout', '-q', '--', MUTANT_FILE)
clean = run('git', 'status', '--porcelain').stdout == ''
shutil.rmtree(clone)
json.dump({'commit': head, 'command': 'npx tsc -b apps/three-surface-poc', 'references': references, 'builds': builds,
           'cleanAfter': clean}, open(out_file, 'w'), indent=1)
for b in builds:
    print(b['label'], 'exit', b['exit'], 'cap1-daemon dist', 'packages/cap1-daemon/dist' in b['distAfter'], b['errors'][:1])
