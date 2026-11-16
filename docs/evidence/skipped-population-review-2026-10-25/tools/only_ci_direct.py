#!/usr/bin/env python3
"""rev-527: runs the check's COLLECT script directly, under CI=true, with an it.only on a credentials row, and prints the exit
code, the census's errors and state counts, the non-pending rows and the child's non-census output.

usage: python3 -I only_ci_direct.py CLONE
"""
import collections, json, os, subprocess, sys, tempfile

clone = os.path.realpath(sys.argv[1])
check = os.path.join(clone, 'packages/cap1-system/src/skipped-population.system.test.ts')
cred = os.path.join(clone, 'packages/cap1-system/src/credentials.system.test.ts')
src = open(check).read()
a = src.index('const COLLECT = `') + len('const COLLECT = `')
collect = src[a:src.index('`;', a)]
old, new = "  it('the token file is owner-only (mode 0600)'", "  it.only('the token file is owner-only (mode 0600)'"
orig = open(cred, 'rb').read()
assert orig.count(old.encode()) == 1
with tempfile.TemporaryDirectory(prefix='r527-onlyci-', dir='/tmp') as tmp:
    try:
        open(cred, 'wb').write(orig.replace(old.encode(), new.encode()))
        env = {k: v for k, v in os.environ.items() if not k.startswith('VITEST') and k not in ('SYZYGY_FRESH_CLONE', 'NODE_OPTIONS')}
        env.update({'CI': 'true', 'TMPDIR': tmp})
        p = subprocess.run(['node', '--input-type=module', '-e', collect], cwd=clone, env=env, capture_output=True, text=True, timeout=120)
    finally:
        open(cred, 'wb').write(orig)
line = [l for l in p.stdout.split('\n') if l.startswith('CENSUS ')]
census = json.loads(line[0][7:]) if line else None
print('exit', p.returncode, '| census lines', len(line))
if census:
    print('errors', census['errors'])
    print('states', dict(collections.Counter(t['state'] for t in census['tests'])), 'tests', len(census['tests']))
    for t in census['tests']:
        if t['state'] not in ('pending',):
            print('  ', t['state'], os.path.basename(t['file']), '>', t['name'][:110])
print('non-census stdout:', repr('\n'.join(l for l in p.stdout.split('\n') if not l.startswith('CENSUS '))[:400]))
print('stderr:', repr(p.stderr[:400]))
