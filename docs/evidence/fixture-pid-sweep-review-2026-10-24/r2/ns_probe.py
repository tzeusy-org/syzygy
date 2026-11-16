"""Cross-PID-namespace probe of the reviewed sweep (round 2 of R-GP-IMPL-FIXTURE-PID-SWEEP).

Three live holders make one fixture copy each with the reviewed naming function, in one private
directory: one in the host namespace, one in a bwrap PID namespace with /proc mounted, one in a
bwrap PID namespace with /proc hidden (a tmpfs over it). Each holder's inner pid is pushed past 60
by sixty /bin/true forks, so no pid or thread id of a sweeper (its node takes about seven) can keep it
alive by coincidence. Then three
sweepers run in turn: bwrap with /proc, the host, bwrap with /proc hidden. Each records what it
removed and what signal 0 answers for the holders' pids inside its namespace.

Usage: python3 ns_probe.py <built-module.mjs> <private-dir> <out.json>
"""
import hashlib
import json
import os
import subprocess
import sys
import time

TOOLS = os.path.dirname(os.path.abspath(__file__))
module, directory, out = sys.argv[1:4]
assert os.listdir(directory) == [], 'the probe directory must start empty'
node = subprocess.run(['which', 'node'], capture_output=True, text=True, check=True).stdout.strip()
BWRAP = ['bwrap', '--unshare-user', '--unshare-pid', '--die-with-parent', '--dev-bind', '/', '/']
PROC = ['--proc', '/proc']
HIDDEN = ['--tmpfs', '/proc']
stop = os.path.join(TOOLS, 'ns-probe.stop')
assert not os.path.exists(stop)


def holder_cmd(label, prefix):
    record = os.path.join(TOOLS, f'ns-holder-{label}.json')
    if os.path.exists(record):
        os.remove(record)
    inner = f"i=0; while [ $i -lt 60 ]; do /bin/true; i=$((i+1)); done; {node} {TOOLS}/holder.mjs {module} {directory} {record} {stop}; true"
    return record, (prefix + ['--', '/bin/sh', '-c', inner]) if prefix else [node, f'{TOOLS}/holder.mjs', module, directory, record, stop]


holders = {}
for label, prefix in (('host', None), ('bwrap-proc', BWRAP + PROC), ('bwrap-no-proc', BWRAP + HIDDEN)):
    record, cmd = holder_cmd(label, prefix)
    holders[label] = {'record': record, 'cmd': cmd, 'proc': subprocess.Popen(cmd)}
deadline = time.time() + 60
while time.time() < deadline and not all(os.path.exists(h['record']) for h in holders.values()):
    time.sleep(0.2)
time.sleep(0.5)
state = {label: json.load(open(h['record'])) for label, h in holders.items()}
probe_pids = ','.join(str(s['pid']) for s in state.values())

sweeps = {}
for label, prefix in (('bwrap-proc', BWRAP + PROC), ('host', None), ('bwrap-no-proc', BWRAP + HIDDEN)):
    record = os.path.join(TOOLS, f'ns-sweeper-{label}.json')
    if os.path.exists(record):
        os.remove(record)
    base = [node, f'{TOOLS}/sweeper.mjs', module, directory, record, probe_pids]
    cmd = (prefix + ['--'] + base) if prefix else base
    run = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    sweeps[label] = {'exit': run.returncode, 'stderr': run.stderr[-2000:], **json.load(open(record))}
    time.sleep(0.5)

open(stop, 'w').close()
exits = {}
for label, h in holders.items():
    try:
        exits[label] = h['proc'].wait(timeout=30)
    except subprocess.TimeoutExpired:
        h['proc'].kill()
        exits[label] = f"killed by own pid {h['proc'].pid}"
os.remove(stop)
final_state = {label: json.load(open(h['record'])) for label, h in holders.items()}
left = sorted(os.listdir(directory))

result = {
    'probe': 'ns_probe.py',
    'moduleSha256': hashlib.sha256(open(module, 'rb').read()).hexdigest(),
    'directory': directory,
    'holders': {label: {'cmd': h['cmd'], 'hostPid': h['proc'].pid, 'exit': exits[label], **final_state[label]} for label, h in holders.items()},
    'sweeps': sweeps,
    'leftAfterAll': left,
}
json.dump(result, open(out, 'w'), indent=1)
print(json.dumps({label: {'name': s['name'], 'innerPid': s['pid'], 'nsReading': s['nsReading'], 'goneWhileAlive': s['goneWhileAlive']} for label, s in final_state.items()}, indent=1))
for label, s in sweeps.items():
    print(label, 'ns', s['nsReading'], 'signal0', s['signal0'], 'removed', s['removed'])
