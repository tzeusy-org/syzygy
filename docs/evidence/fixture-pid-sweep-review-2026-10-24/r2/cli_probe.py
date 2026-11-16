"""What the accessibility CLI deletes (R-GP-IMPL-FIXTURE-PID-SWEEP-2).

Seeds a private TMPDIR with every shape the sweep must judge, runs the built CLI
(`apps/three-surface-poc/dist/polaris-accessibility-main.js`) with that TMPDIR and a PATH holding
only node (so `which` is absent, no browser is found, and the CLI exits 2 before measuring or
writing anything), and records what is left.

Usage: python3 cli_probe.py <clone> <private-tmpdir> <out.json>
"""
import hashlib
import json
import os
import re
import subprocess
import sys

clone, tmp, out = sys.argv[1:4]
assert tmp.startswith('/tmp/r509b-') and os.listdir(tmp) == []
ns = re.search(r'\[(\d+)\]', os.readlink('/proc/self/ns/pid')).group(1)
dead = subprocess.Popen(['true'])
dead.wait()
try:
    os.kill(dead.pid, 0)
    raise SystemExit('pid reused')
except ProcessLookupError:
    pass
P = 'syzygy-poc-surface-fixture-'
canary = os.path.join(tmp, 'canary-target')
os.makedirs(os.path.join(canary, 'inner'))
open(os.path.join(canary, 'inner', 'keep.txt'), 'w').write('keep\n')
dirs = {
    'deadCopy': f'{P}p{dead.pid}-n{ns}-DEAD01',
    'deadTemplate': f'{P}template-p{dead.pid}-n{ns}-DEAD02',
    'liveCopy': f'{P}p{os.getpid()}-n{ns}-LIVE01',
    'foreignNamespace': f'{P}p{dead.pid}-n{int(ns) + 1}-FRGN01',
    'noNamespace': f'{P}p{dead.pid}-OLDNS1',
    'legacy': f'{P}LEGACY',
    'legacyTemplate': f'{P}template-LEGACY',
    'zeroNamespace': f'{P}p{dead.pid}-n0-ZERO01',
}
for name in dirs.values():
    os.makedirs(os.path.join(tmp, name, 'repo'))
    open(os.path.join(tmp, name, 'repo', 'README.md'), 'w').write('# seeded\n')
file_name = f'{P}p{dead.pid}-n{ns}-AFILE1'
open(os.path.join(tmp, file_name), 'w').write('a file\n')
link_name = f'{P}p{dead.pid}-n{ns}-ALINK1'
os.symlink(canary, os.path.join(tmp, link_name))
before = sorted(os.listdir(tmp))
main = os.path.join(clone, 'apps/three-surface-poc/dist/polaris-accessibility-main.js')
node_dir = os.path.dirname(subprocess.run(['which', 'node'], capture_output=True, text=True, check=True).stdout.strip())
env = {'PATH': node_dir, 'TMPDIR': tmp, 'HOME': tmp}
run = subprocess.run([os.path.join(node_dir, 'node'), main], cwd=clone, env=env, capture_output=True, text=True, timeout=300)
after = sorted(os.listdir(tmp))
result = {
    'probe': 'cli_probe.py', 'namespace': ns, 'deadPid': dead.pid,
    'distSha256': hashlib.sha256(open(main, 'rb').read()).hexdigest(),
    'distFixtureDirectoriesSha256': hashlib.sha256(open(os.path.join(clone, 'apps/three-surface-poc/dist/fixture-directories.js'), 'rb').read()).hexdigest(),
    'exit': run.returncode, 'stdout': run.stdout[-500:], 'stderr': run.stderr[-500:],
    'removed': [n for n in before if n not in after],
    'kept': {label: name in after for label, name in dirs.items()} | {'regularFile': file_name in after, 'symlink': link_name in after, 'symlinkTargetIntact': os.path.exists(os.path.join(canary, 'inner', 'keep.txt'))},
    'evidenceWritten': [n for n in os.listdir(os.path.join(clone, 'docs', 'evidence')) if n.startswith('pwb-p4-4-accessibility-browser-run-2026-10-22')],
}
json.dump(result, open(out, 'w'), indent=1)
print(json.dumps({k: result[k] for k in ('exit', 'stderr', 'removed', 'kept', 'evidenceWritten')}, indent=1))
