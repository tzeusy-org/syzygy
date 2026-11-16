"""Uid-guard probe with a directory that really belongs to another user (R-GP-IMPL-FIXTURE-PID-SWEEP-2).

Inside `bwrap --unshare-user` (host PID namespace, so the namespace segment is known in advance)
a root-owned directory is mounted READ-ONLY at a dead-pid fixture name in a private directory;
through the user namespace it lstat's as uid 65534, not the sweeper's 1000. Beside it sits a
dead-pid directory the sweeper owns (positive control). The sweep runs with a preload that logs
every rmSync path. It runs twice: the reviewed module, and a copy with the uid guard dropped.
The read-only mount makes any removal attempt fail with EROFS, so nothing outside is touched.

Usage: python3 foreign_owner_probe.py <built-module.mjs> <private-dir> <foreign-root-owned-dir> <out.json>
"""
import json
import os
import re
import subprocess
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
module, directory, foreign, out = sys.argv[1:5]
assert directory.startswith('/tmp/r509b-') and os.listdir(directory) == []
assert os.stat(foreign).st_uid == 0
ns = re.search(r'\[(\d+)\]', os.readlink('/proc/self/ns/pid')).group(1)
dead = subprocess.Popen(['true'])
dead.wait()
try:
    os.kill(dead.pid, 0)
    raise SystemExit('pid reused')
except ProcessLookupError:
    pass
node = subprocess.run(['which', 'node'], capture_output=True, text=True, check=True).stdout.strip()
source = open(module).read()
guard = 'if (stat.isDirectory() && (user === undefined || stat.uid === user))'
assert source.count(guard) == 1
mutant_path = os.path.join(TOOLS, 'fixture-directories.uid-guard-dropped.mjs')
open(mutant_path, 'w').write(source.replace(guard, 'if (stat.isDirectory())'))
results = {}
for label, mod in (('reviewed', module), ('uid-guard-dropped', mutant_path)):
    theirs = f'syzygy-poc-surface-fixture-p{dead.pid}-n{ns}-ROOT01'
    mine = f'syzygy-poc-surface-fixture-p{dead.pid}-n{ns}-MINE01'
    os.mkdir(os.path.join(directory, theirs))
    os.makedirs(os.path.join(directory, mine, 'repo'))
    log = os.path.join(TOOLS, f'foreign-owner-rm-{label}.log')
    if os.path.exists(log):
        os.remove(log)
    inner = (f"import(process.argv[1]).then((m) => {{ const fs = require('node:fs'); const d = process.argv[2];"
             f" const st = fs.lstatSync(d + '/{theirs}'); const before = fs.readdirSync(d + '/{theirs}').length;"
             f" m.removeFixturesOfDeadProcesses(d);"
             f" console.log(JSON.stringify({{ uidSeen: st.uid, getuid: process.getuid(), entriesInsideBefore: before,"
             f" entriesInsideAfter: fs.readdirSync(d + '/{theirs}').length, left: fs.readdirSync(d).sort() }})); }})")
    cmd = ['bwrap', '--unshare-user', '--die-with-parent', '--dev-bind', '/', '/', '--ro-bind', foreign, os.path.join(directory, theirs),
           '--', node, '--import', os.path.join(TOOLS, 'log_rm.mjs'), '-e', inner, mod, directory]
    run = subprocess.run(cmd, capture_output=True, text=True, timeout=120, env={**os.environ, 'R509B_RM_LOG': log})
    results[label] = {'exit': run.returncode, 'stdout': run.stdout.strip(), 'stderr': run.stderr.strip()[-800:],
                      'rmSyncCalls': open(log).read().split() if os.path.exists(log) else []}
    for name in os.listdir(directory):
        path = os.path.join(directory, name)
        st = os.lstat(path)
        assert st.st_uid == os.getuid() and os.path.isdir(path) and not os.path.islink(path), path
        if name == theirs:
            os.rmdir(path)  # the empty mount point, outside the sandbox's mount namespace; fails if not empty
        else:
            subprocess.run(['rm', '-r', path], check=True)
json.dump({'probe': 'foreign_owner_probe.py', 'namespace': ns, 'deadPid': dead.pid, 'foreign': foreign, 'results': results}, open(out, 'w'), indent=1)
for label, r in results.items():
    print(label, r['exit'], r['stdout'], 'rmSync:', [os.path.basename(p) for p in r['rmSyncCalls']], r['stderr'][:200])
