#!/usr/bin/env python3
"""rev-532b (round 2): show that a surviving daemon-entry mutant really loads the POC app on the daemon path. Reviewer tool, not authority.

usage: python3 -I de_r2_demonstrate.py TREE MUTANTS_TOOL MUTANT_ID OUT.json

Adapted from rev-532's de_rev_demonstrate.py: MUTANTS_TOOL is de_r2_mutants.py (its constants and MUTANTS only).

Applies MUTANT_ID's fragment (taken from MUTANTS_TOOL's MUTANTS list), rebuilds apps/syzygy, then runs the built entry
`--help` three ways and records what each saw:
  hook:   with the PR's own load hook (the test's hook text, NODE_OPTIONS=--import) and SYZYGY_PRELOAD_RENDERER unset, then set;
  strace: under `strace -f -e trace=openat` with the flag set and with it unset, recording every opened path under
          apps/three-surface-poc/dist (an observer independent of Node's module hooks).
Restores and rebuilds; checks the tree clean.
"""
import json, os, subprocess, sys, tempfile
from pathlib import Path

tree, tool, mid, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
sys.argv = [tool, tree, 'x', 'y', '/dev/null']  # the tool's argv parse at import; its main loop is never reached (see below)
src = open(tool, encoding='utf8').read()
mutants_src = src[: src.index("def build():")]  # constants and MUTANTS only
ns = {}
exec(compile(mutants_src, tool, 'exec'), ns)
m = next(x for x in ns['MUTANTS'] if x and x['id'] == mid)
entry = os.path.join(tree, 'apps/syzygy/dist/main.js')
app = Path(os.path.realpath(os.path.join(tree, 'apps/three-surface-poc'))).as_uri() + '/'
work = tempfile.mkdtemp()
hook, log = os.path.join(work, 'hook.mjs'), os.path.join(work, 'loads.txt')
open(hook, 'w').write("\n".join([
    "import { appendFileSync } from 'node:fs';",
    "import { registerHooks } from 'node:module';",
    "registerHooks({ load(url, context, nextLoad) {",
    "  if (url.startsWith(process.env.POC_APP_URL)) appendFileSync(process.env.POC_LOAD_LOG, `${url}\\n`);",
    "  return nextLoad(url, context);",
    "} });"]))
base_env = {k: v for k, v in os.environ.items() if not k.startswith('SYZYGY_')}
def build():
    d = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    if d.returncode: sys.exit(d.stdout[-1500:])
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree is not clean')
text = open(os.path.join(tree, m['file']), encoding='utf8').read()
assert text.count(m['old']) == 1
out = {'mutant': m, 'runs': []}
try:
    open(os.path.join(tree, m['file']), 'w', encoding='utf8').write(text.replace(m['old'], m['new']))
    build()
    for flag in (None, '1'):
        env = {**base_env, 'SYZYGY_PORT': '0', 'NODE_OPTIONS': f'--import={Path(hook).as_uri()}', 'POC_APP_URL': app, 'POC_LOAD_LOG': log}
        if flag: env['SYZYGY_PRELOAD_RENDERER'] = flag
        open(log, 'w').close()
        d = subprocess.run(["node", entry, '--help'], cwd=work, env=env, capture_output=True, text=True, timeout=60)
        loads = [l for l in open(log).read().splitlines() if l]
        senv = {**base_env, 'SYZYGY_PORT': '0'}
        if flag: senv['SYZYGY_PRELOAD_RENDERER'] = flag
        s = subprocess.run(['strace', '-f', '-qq', '-e', 'trace=openat', '-o', os.path.join(work, 'strace.txt'), 'node', entry, '--help'], cwd=work, env=senv,
                           capture_output=True, text=True, timeout=120)
        opened = sorted({l.split('"')[1] for l in open(os.path.join(work, 'strace.txt')).read().splitlines()
                         if '"' in l and '/apps/three-surface-poc/dist/' in l.split('"')[1] and 'ENOENT' not in l})
        out['runs'].append({'flag': flag, 'exit': d.returncode, 'stderr': d.stderr[-300:], 'hookLoggedPocUrls': len(loads), 'hookFirst': loads[:3],
                            'straceExit': s.returncode, 'straceOpenedPocDistFiles': len(opened), 'straceFirst': opened[:3]})
        print(json.dumps(out['runs'][-1]), flush=True)
finally:
    open(os.path.join(tree, m['file']), 'w', encoding='utf8').write(text)
    build()
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree not restored')
json.dump(out, open(out_path, 'w'), indent=1)
