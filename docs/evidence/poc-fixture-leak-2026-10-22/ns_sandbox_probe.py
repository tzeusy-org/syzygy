#!/usr/bin/env python3
"""Does a sweep in one PID namespace remove a live run's directory in another (review round 2, F5)?

Usage: ns_sandbox_probe.py <worktree> <tree-commit> <out.json> <private-parent> <mode>

<mode> is `head` (the tree as committed) or `mutant` (`unreadable-namespace-reads-as-0` of mutate_sweep.py: the module
as it was before review round 2, where a namespace that cannot be read is namespace 0), built and restored and rebuilt.

Three live holders each make one fixture copy with the module's own naming function, in one private directory: one in
the host PID namespace, one in a bwrap PID namespace with /proc mounted, one in a bwrap PID namespace with /proc hidden
by a tmpfs (so /proc/self/ns/pid cannot be read). Each sandboxed holder's inner pid is pushed past 60 by sixty
/bin/true forks, so that no pid or thread id of a sweeper can keep it alive by coincidence. Then three sweepers run in
turn (bwrap with /proc, the host, bwrap with /proc hidden). Each makes a positive control (a directory of a pid it has
just reaped, in the namespace it reads, `n0` where it reads none) and records what it removed and what signal 0 answers
for the holders' pids inside its namespace.

`holds` is true when, in `head` mode, no holder's directory is ever gone while it is alive and the sweeper without a
/proc removed nothing at all (its own `n0` control stays: no reading is no evidence); in `mutant` mode, the holder
without a /proc loses its directory while it is alive. The module is copied to a file of its own before the run, so the
rebuild that restores the tree cannot change what is running. <private-parent> must not exist or be empty.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

WT, COMMIT, OUT, PARENT, MODE = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]
assert MODE in ('head', 'mutant'), MODE
TOOLS = pathlib.Path(__file__).resolve().parent
SRC = 'apps/three-surface-poc/src/fixture-directories.ts'
OLD = "  } catch {\n    return undefined;\n  }\n"
NEW = "  } catch {\n    return '0';\n  }\n"
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('rev-parse', 'HEAD') == git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
assert git('status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts') == '', 'the tree must be committed'
assert not PARENT.exists() or not any(PARENT.iterdir()), f'{PARENT} must not exist or be empty'
shared = [pathlib.Path('/'), pathlib.Path(tempfile.gettempdir()), pathlib.Path(os.environ.get('TMPDIR') or '/tmp'), pathlib.Path.home()]
assert all(PARENT != d.resolve() and PARENT not in d.resolve().parents for d in shared), 'the parent must not be, or contain, a shared directory'
build = lambda: subprocess.run(['npx', 'tsc', '-b', 'apps/three-surface-poc'], cwd=WT, capture_output=True, text=True)
node = shutil.which('node')
BWRAP = ['bwrap', '--unshare-user', '--unshare-pid', '--die-with-parent', '--dev-bind', '/', '/']
PROC, HIDDEN = ['--proc', '/proc'], ['--tmpfs', '/proc']
available = subprocess.run(BWRAP + HIDDEN + ['--', '/bin/true'], capture_output=True, text=True)
assert available.returncode == 0, f'bwrap cannot make a PID namespace here: {available.stderr.strip()}'

PARENT.mkdir(parents=True, exist_ok=True)
fixtures, scratch = PARENT / 'fixtures', PARENT / 'scratch'
fixtures.mkdir()
scratch.mkdir()
original = (WT / SRC).read_text()
digest = hashlib.sha256(original.encode()).hexdigest()
record: dict = {'tool': 'ns_sandbox_probe.py', 'treeCommit': git('rev-parse', 'HEAD'), 'mode': MODE, 'file': SRC, 'sha256AtCommit': digest}
try:
    if MODE == 'mutant':
        assert original.count(OLD) == 1, 'the catch of pidNamespace must occur once'
        (WT / SRC).write_text(original.replace(OLD, NEW, 1))
        record['mutant'] = {'id': 'unreadable-namespace-reads-as-0', 'file': SRC, 'old': OLD, 'new': NEW}
    built = build()
    assert built.returncode == 0, built.stdout + built.stderr
    module = scratch / 'fixture-directories.mjs'
    shutil.copyfile(WT / 'apps/three-surface-poc/dist/fixture-directories.js', module)
finally:
    (WT / SRC).write_text(original)
    rebuilt = build()
    assert rebuilt.returncode == 0, rebuilt.stdout + rebuilt.stderr
assert hashlib.sha256((WT / SRC).read_bytes()).hexdigest() == digest, 'source not restored'
record['moduleSha256'] = hashlib.sha256(module.read_bytes()).hexdigest()
stop = scratch / 'stop'

holders = {}
for label, prefix in (('host', None), ('bwrap-proc', BWRAP + PROC), ('bwrap-no-proc', BWRAP + HIDDEN)):
    out = scratch / f'holder-{label}.json'
    holder = [node, str(TOOLS / 'ns_holder.mjs'), str(module), str(fixtures), str(out), str(stop)]
    if prefix is None:
        cmd = holder
    else:
        inner = 'i=0; while [ $i -lt 60 ]; do /bin/true; i=$((i+1)); done; ' + ' '.join(holder) + '; true'
        cmd = prefix + ['--', '/bin/sh', '-c', inner]
    holders[label] = {'out': out, 'cmd': cmd, 'proc': subprocess.Popen(cmd)}
deadline = time.time() + 60
while time.time() < deadline and not all(h['out'].exists() for h in holders.values()):
    time.sleep(0.2)
time.sleep(0.5)
state = {label: json.loads(h['out'].read_text()) for label, h in holders.items()}
probe_pids = ','.join(str(s['pid']) for s in state.values())

sweeps = {}
for label, prefix in (('bwrap-proc', BWRAP + PROC), ('host', None), ('bwrap-no-proc', BWRAP + HIDDEN)):
    out = scratch / f'sweeper-{label}.json'
    sweeper = [node, str(TOOLS / 'ns_sweeper.mjs'), str(module), str(fixtures), str(out), probe_pids]
    ran = subprocess.run((prefix + ['--'] + sweeper) if prefix else sweeper, capture_output=True, text=True, timeout=120)
    sweeps[label] = {'exit': ran.returncode, 'stderr': ran.stderr[-1000:], **json.loads(out.read_text())}
    time.sleep(0.5)

stop.write_text('')
exits = {}
for label, h in holders.items():
    try:
        exits[label] = h['proc'].wait(timeout=30)
    except subprocess.TimeoutExpired:
        h['proc'].kill()  # the process this script started, by its own handle
        exits[label] = f"killed by its own handle (host pid {h['proc'].pid})"
final = {label: json.loads(h['out'].read_text()) for label, h in holders.items()}
left = sorted(p.name for p in fixtures.iterdir())
if MODE == 'head':
    holds = (not any(s['goneWhileAlive'] for s in final.values()) and sweeps['bwrap-no-proc']['removed'] == []
             and sweeps['bwrap-no-proc']['nsReading'].startswith('unreadable') and all(s['name'] in left for s in final.values()))
else:
    holds = final['bwrap-no-proc']['goneWhileAlive'] and sweeps['bwrap-no-proc']['nsReading'].startswith('unreadable')
record |= {'holders': {label: {'cmd': h['cmd'], 'hostPid': h['proc'].pid, 'exit': exits[label], **final[label]} for label, h in holders.items()},
           'sweeps': sweeps, 'leftAfterAll': left, 'holds': holds}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({'mode': MODE, 'holders': {label: {'name': s['name'], 'innerPid': s['pid'], 'nsReading': s['nsReading'], 'goneWhileAlive': s['goneWhileAlive']} for label, s in final.items()},
                  'sweepers': {label: {'nsReading': s['nsReading'], 'signal0': s['signal0'], 'removed': s['removed']} for label, s in sweeps.items()}, 'holds': holds}, indent=1))
shutil.rmtree(PARENT, ignore_errors=True)
