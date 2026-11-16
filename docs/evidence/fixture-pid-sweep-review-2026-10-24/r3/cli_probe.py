"""Round-3 reviewer probe (rev-509c): what the accessibility CLI removes at its start, on the host and without /proc.

For each mode a fresh private TMPDIR is seeded with: a copy and a template of a reaped pid in the host namespace,
the same names for a live pid (this probe's own), two legacy names, a dead pid of another namespace, a dead pid with
`n0`, and a regular file and a symlink (to a directory outside) at dead-pid host-namespace names. The built CLI then
runs with TMPDIR set, SYZYGY_POC_BROWSER unset and PATH holding only node's directory, so it stops at the browser
lookup (exit 2) after its sweep. Mode `host` runs it directly; mode `no-proc` runs it in
`bwrap --unshare-user --unshare-pid --tmpfs /proc`, where the PID namespace cannot be read.

Usage: python3 cli_probe.py <clone> <out.json> <private-tmpdir-host> <private-tmpdir-no-proc>
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

clone, out = sys.argv[1], sys.argv[2]
CLI = os.path.join(clone, 'apps/three-surface-poc/dist/polaris-accessibility-main.js')
MODULE = os.path.join(clone, 'apps/three-surface-poc/dist/fixture-directories.js')
node = shutil.which('node')
PREFIX = 'syzygy-poc-surface-fixture-'
NS = os.readlink('/proc/self/ns/pid').split('[')[1].rstrip(']')
child = subprocess.Popen(['/bin/true'])
child.wait()
dead = child.pid
try:
    os.kill(dead, 0)
    raise SystemExit('reaped pid answered; rerun')
except ProcessLookupError:
    pass
live = os.getpid()


def seed(tmp):
    assert tmp.startswith('/tmp/r509c-') and not os.path.exists(tmp)
    os.makedirs(tmp)
    outside = tmp + '-outside'
    assert not os.path.exists(outside)
    os.makedirs(os.path.join(outside, 'precious'))
    open(os.path.join(outside, 'precious', 'keep.txt'), 'w').write('not a fixture\n')
    dirs = [f'{PREFIX}p{dead}-n{NS}-DEAD01', f'{PREFIX}template-p{dead}-n{NS}-DEAD02',
            f'{PREFIX}p{live}-n{NS}-LIVE01', f'{PREFIX}template-p{live}-n{NS}-LIVE02',
            f'{PREFIX}LEGACY', f'{PREFIX}template-p{dead}-LEGACY',
            f'{PREFIX}p{dead}-n{int(NS) + 1}-FOREIGN', f'{PREFIX}p{dead}-n0-NOPROC']
    for name in dirs:
        os.makedirs(os.path.join(tmp, name, 'repo'))
        open(os.path.join(tmp, name, 'repo', 'README.md'), 'w').write('# seeded\n')
    open(os.path.join(tmp, f'{PREFIX}p{dead}-n{NS}-AFILE1'), 'w').write('a file\n')
    os.symlink(outside, os.path.join(tmp, f'{PREFIX}p{dead}-n{NS}-LINK01'))
    return outside


modes = {'host': sys.argv[3], 'no-proc': sys.argv[4]}
result = {'probe': 'rev-509c cli_probe.py', 'probeSha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
          'cliSha256': hashlib.sha256(open(CLI, 'rb').read()).hexdigest(), 'moduleSha256': hashlib.sha256(open(MODULE, 'rb').read()).hexdigest(),
          'hostNamespace': NS, 'deadPid': dead, 'livePid': live, 'modes': {}}
for mode, tmp in modes.items():
    tmp = os.path.realpath(tmp)
    outside = seed(tmp)
    before = sorted(os.listdir(tmp))
    env = {'TMPDIR': tmp, 'PATH': os.path.dirname(node), 'HOME': os.environ['HOME']}
    base = [node, CLI]
    cmd = base if mode == 'host' else ['/usr/bin/bwrap', '--unshare-user', '--unshare-pid', '--die-with-parent', '--dev-bind', '/', '/', '--tmpfs', '/proc', '--'] + base
    run = subprocess.run(cmd, cwd=clone, env=env, capture_output=True, text=True, timeout=300)
    after = sorted(os.listdir(tmp))
    result['modes'][mode] = {'cmd': cmd, 'exit': run.returncode, 'stdout': run.stdout[-500:], 'stderr': run.stderr[-500:],
                             'removed': [n for n in before if n not in after], 'kept': after,
                             'outsideIntact': os.path.exists(os.path.join(outside, 'precious', 'keep.txt'))}
    shutil.rmtree(tmp)
    shutil.rmtree(outside)
json.dump(result, open(out, 'w'), indent=1)
for mode, r in result['modes'].items():
    print(mode, 'exit', r['exit'], 'stderr', repr(r['stderr'].strip()), 'removed', r['removed'], 'kept', len(r['kept']), 'outsideIntact', r['outsideIntact'])
