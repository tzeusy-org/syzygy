"""Round-3 reviewer probe (rev-509c): the F5 reproduction across PID namespaces.

Three live holders each make one fixture copy with the module's own naming function, in one private, initially
empty directory: one in a bwrap PID namespace with a tmpfs over /proc (no readable namespace), one in a bwrap PID
namespace with /proc mounted, one on the host. Each sandboxed holder's inner pid is pushed past 60 by sixty
/bin/true forks first, so no sweeper pid or thread id keeps it alive by coincidence. Then three sweepers run in
turn, each in its own sandbox: no /proc (a second sandbox of the first holder's shape), /proc mounted, host.
Each records what it removed, how often the module listed the directory, and what signal 0 answers for the
holders' pids inside its namespace.

Usage: python3 ns_probe.py <module.mjs> <private-dir> <out.json>
The private directory must already exist, be empty, and sit under /tmp/r509c-.
"""
import hashlib
import json
import os
import subprocess
import sys
import time

TOOLS = os.path.dirname(os.path.abspath(__file__))
module, directory, out = sys.argv[1:4]
directory = os.path.realpath(directory)
assert directory.startswith('/tmp/r509c-'), 'refusing a directory outside this reviewer\'s private TMPDIRs'
assert os.listdir(directory) == [], 'the probe directory must start empty'
node = subprocess.run(['which', 'node'], capture_output=True, text=True, check=True).stdout.strip()
BWRAP = ['bwrap', '--unshare-user', '--unshare-pid', '--die-with-parent', '--dev-bind', '/', '/']
PROC = ['--proc', '/proc']
NO_PROC = ['--tmpfs', '/proc']
tag = os.path.basename(directory)
stop = os.path.join(TOOLS, f'{tag}.stop')
assert not os.path.exists(stop)


def holder(label, prefix):
    record = os.path.join(TOOLS, f'{tag}-holder-{label}.json')
    if os.path.exists(record):
        os.remove(record)
    base = f'{node} {TOOLS}/holder.mjs {module} {directory} {record} {stop}'
    if prefix is None:
        cmd = [node, f'{TOOLS}/holder.mjs', module, directory, record, stop]
    else:
        inner = f'i=0; while [ $i -lt 60 ]; do /bin/true; i=$((i+1)); done; {base}; true'
        cmd = prefix + ['--', '/bin/sh', '-c', inner]
    return record, cmd


holders = {}
for label, prefix in (('no-proc', BWRAP + NO_PROC), ('proc', BWRAP + PROC), ('host', None)):
    record, cmd = holder(label, prefix)
    holders[label] = {'record': record, 'cmd': cmd, 'proc': subprocess.Popen(cmd)}
deadline = time.time() + 60
while time.time() < deadline and not all(os.path.exists(h['record']) for h in holders.values()):
    time.sleep(0.2)
time.sleep(0.5)
state = {label: json.load(open(h['record'])) for label, h in holders.items()}
probe_pids = ','.join(sorted({str(s['pid']) for s in state.values()}))

sweeps = {}
for label, prefix in (('no-proc', BWRAP + NO_PROC), ('proc', BWRAP + PROC), ('host', None)):
    record = os.path.join(TOOLS, f'{tag}-sweeper-{label}.json')
    if os.path.exists(record):
        os.remove(record)
    base = [node, f'{TOOLS}/sweeper.mjs', module, directory, record, probe_pids]
    cmd = (prefix + ['--'] + base) if prefix else base
    run = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    sweeps[label] = {'cmd': cmd, 'exit': run.returncode, 'stderr': run.stderr[-2000:], **json.load(open(record))}
    time.sleep(1.0)

open(stop, 'w').close()
exits = {}
for label, h in holders.items():
    try:
        exits[label] = h['proc'].wait(timeout=30)
    except subprocess.TimeoutExpired:
        h['proc'].kill()
        exits[label] = f"killed by own pid {h['proc'].pid}"
os.remove(stop)
final = {label: json.load(open(h['record'])) for label, h in holders.items()}
left = sorted(os.listdir(directory))

result = {
    'probe': 'rev-509c ns_probe.py',
    'probeSha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
    'holderSha256': hashlib.sha256(open(os.path.join(TOOLS, 'holder.mjs'), 'rb').read()).hexdigest(),
    'sweeperSha256': hashlib.sha256(open(os.path.join(TOOLS, 'sweeper.mjs'), 'rb').read()).hexdigest(),
    'module': module,
    'moduleSha256': hashlib.sha256(open(module, 'rb').read()).hexdigest(),
    'directory': directory,
    'holders': {label: {'cmd': h['cmd'], 'hostPid': h['proc'].pid, 'exit': exits[label], **final[label]} for label, h in holders.items()},
    'sweeps': sweeps,
    'leftAfterAll': left,
}
json.dump(result, open(out, 'w'), indent=1)
for label, s in final.items():
    print('holder', label, s['name'], 'innerPid', s['pid'], s['nsReading'], 'goneWhileAlive', s['goneWhileAlive'], 'goneAfterMs', s.get('goneAfterMs'), 'existsAtStop', s.get('existsAtStop'))
for label, s in sweeps.items():
    print('sweeper', label, 'exit', s['exit'], s['nsReading'], 'signal0', s['signal0'], 'listings', len(s['moduleListings']), 'removed', s['removed'])
print('left', left)
