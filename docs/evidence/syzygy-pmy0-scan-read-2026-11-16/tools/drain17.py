"""Instrumented drain of 17 owned sleep children: scans, wall time, PIDs."""
import hashlib, json, os, runpy, subprocess, sys, time
from types import SimpleNamespace
source = sys.argv[1]
g = runpy.run_path(source); ports = g['drain'].__globals__
scan = ports['descendants']; scans = []
def counted():
    t = time.monotonic(); rows = scan(); scans.append(time.monotonic() - t); return rows
kids = [subprocess.Popen(['sleep', '60']) for _ in range(17)]
assert set(scan()) == {k.pid for k in kids}
pids = sum(n.isdigit() for n in os.listdir('/proc'))
ports['descendants'] = counted
t = time.monotonic()
try:
    g['drain'](SimpleNamespace(pid=-1, returncode=None)); result = 'completed'
except RuntimeError as e:
    result = str(e)
elapsed = time.monotonic() - t
ports['descendants'] = scan
left = [k.pid for k in kids if k.poll() is None]
for k in kids:
    if k.poll() is None: k.kill(); k.wait()
print(json.dumps({'sourceSha256': hashlib.sha256(open(source,'rb').read()).hexdigest(), 'pids': pids,
                  'load1': os.getloadavg()[0], 'result': result, 'drainSeconds': round(elapsed, 4),
                  'scans': len(scans), 'scanSeconds': round(sum(scans), 4), 'remainingBeforeRecovery': left}))
