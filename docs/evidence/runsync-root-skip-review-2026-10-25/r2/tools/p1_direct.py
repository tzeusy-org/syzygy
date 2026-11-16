#!/usr/bin/env python3
"""rev-525b: what the governed-plane row's argv prints, faithful and under P1, run directly against the built entry.

usage: python3 -I p1_direct.py TREE

Runs `node apps/syzygy/dist/main.js --root <b>/root --state-dir <b>/root/.syzygy/x` in a fresh temp base, with every SYZYGY_
variable removed from the environment (as the test's ENV does) and a 20 s timeout, first faithful, then with P1 applied and
built. Restores main.ts and rebuilds. Refuses to start while anything listens on 7477. Neither run can start a daemon: the
faithful one is refused at the governed-plane check, P1 at the port check."""
import os, re, shutil, subprocess, sys, tempfile

tree = os.path.realpath(sys.argv[1])
MAIN = os.path.join(tree, 'apps/syzygy/src/main.ts')
OLD = "const portText = flags.get('--port') ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);"
NEW = "const portText = flags.get('--port') ?? env['SYZYGY_PORT'];"
if any(l.split()[3].rsplit(':', 1)[1] == '7477' for l in subprocess.run(['ss', '-ltnH'], capture_output=True, text=True).stdout.split('\n') if len(l.split()) >= 4):
    sys.exit('7477 busy')
env = {k: v for k, v in os.environ.items() if not k.startswith('SYZYGY_')}


def run(label):
    base = tempfile.mkdtemp(prefix='r525b-p1d-', dir='/tmp')
    root = os.path.join(base, 'root')
    for d in ('.syzygy/governance/decisions', '.syzygy/intent', 'openspec'): os.makedirs(os.path.join(root, d))
    done = subprocess.run(['node', os.path.join(tree, 'apps/syzygy/dist/main.js'), '--root', root, '--state-dir',
                           os.path.join(root, '.syzygy', 'x')], cwd=base, env={**env, 'TMPDIR': base}, capture_output=True,
                          text=True, timeout=20)
    first = done.stderr.split('\n')[0].replace(base, '<BASE>')
    shutil.rmtree(base)
    print(f'{label}: exit {done.returncode}, stdout {len(done.stdout)} bytes, stderr line 1: {first}')


run('faithful')
original = open(MAIN, encoding='utf8').read()
assert original.count(OLD) == 1, original.count(OLD)
try:
    open(MAIN, 'w', encoding='utf8').write(original.replace(OLD, NEW))
    built = subprocess.run(['npm', 'run', 'build'], cwd=tree, capture_output=True, text=True)
    dist = open(os.path.join(tree, 'apps/syzygy/dist/main.js'), encoding='utf8').read()
    squash = lambda text: re.sub(r'\s+', ' ', text)
    print(f'P1 build exit {built.returncode}; dist carries P1: {squash(NEW) in squash(dist)}')
    run('P1')
finally:
    open(MAIN, 'w', encoding='utf8').write(original)
    print('rebuild exit', subprocess.run(['npm', 'run', 'build'], cwd=tree, capture_output=True).returncode)
print('tree clean:', not subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=tree, capture_output=True, text=True).stdout)
