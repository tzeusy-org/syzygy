"""syzygy-bpyt.7.3: the old-versus-new differential of the HTTP host extraction, over two built clones.

Usage: python3 -I differential.py <base-tree> <head-tree> <tools-dir> <scratch-dir> <out-dir> [--selftest]

Both trees must be clean checkouts of their commits, installed and built (`npm ci && npm run build`). It runs, on each side:
  - surface.mjs: the export surface, types included, of the cap1-daemon barrel and the two shims governed files cite;
  - host-diff.mjs: the host's answers to 1,296 requests and its start failures and credential decisions, through the cap1-daemon
    barrel on both sides and through @syzygy/http-host at the head (the module the POC now imports);
  - e2e-diff.mjs: the built Capability 1 daemon over three fixtures, three shutdown signal sets and three refused invocations;
  - gate-diff.mjs: the POC observer-input gate on every path tracked at either commit, and seven probes.
and writes each record to <out-dir>, then `differential.json`: which comparisons are equal, and for the gate, every path whose
decision differs. Expected: every comparison equal except the gate, whose only differing paths lie under packages/http-host/.

--selftest (rule 6): four runs, each with one head build file mutated in place (and restored): the refusal status, a credential
refusal detail, the daemon's shutdown announcement, and the gate's host prefix. Each must make its comparison report a difference.
"""
import hashlib, json, os, shutil, subprocess, sys

base, head, tools, scratch, out_dir = sys.argv[1:6]
SELFTEST = sys.argv[6:] == ['--selftest']
os.makedirs(out_dir, exist_ok=True)
ENTRIES = ['packages/cap1-daemon/src/index.ts', 'packages/cap1-daemon/src/server.ts', 'packages/cap1-daemon/src/credentials.ts', 'packages/cap1-daemon/src/routes-human.ts']
PROBES = ['packages/http-host/src/new.ts', 'packages/http-host/package.json', 'packages/http-hostile/x.ts', 'packages/cap1-daemon/src/new.ts',
          'packages/http-host', 'apps/three-surface-poc-other/x', 'packages/polaris-generation-core/src/index.ts']


def git(tree, *args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, check=True).stdout.decode()


def node(*args):
    run = subprocess.run(['node', *args], capture_output=True, text=True, timeout=900)
    if run.returncode != 0:
        raise RuntimeError(f'{args[0]} failed: {run.stderr[-2000:]}')
    return run.stdout


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def run_all(tag):
    """Every recorder on both sides; returns the comparison and the record paths."""
    shutil.rmtree(scratch, ignore_errors=True)
    os.makedirs(scratch)
    o = lambda name: os.path.join(out_dir if tag == 'run' else scratch, name)
    node(f'{tools}/surface.mjs', base, o('surface-base.json'), *ENTRIES)
    node(f'{tools}/surface.mjs', head, o('surface-head.json'), *ENTRIES, 'packages/http-host/src/index.ts')
    node(f'{tools}/host-diff.mjs', f'{base}/packages/cap1-daemon/dist/index.js', f'{scratch}/hb', o('host-base.json'))
    node(f'{tools}/host-diff.mjs', f'{head}/packages/cap1-daemon/dist/index.js', f'{scratch}/hc', o('host-head-cap1-daemon.json'))
    node(f'{tools}/host-diff.mjs', f'{head}/packages/http-host/dist/index.js', f'{scratch}/hh', o('host-head-http-host.json'))
    harness = f'{base}/packages/cap1-system/dist/harness.js'
    node(f'{tools}/e2e-diff.mjs', base, harness, f'{scratch}/eb', o('e2e-base.json'))
    node(f'{tools}/e2e-diff.mjs', head, harness, f'{scratch}/eh', o('e2e-head.json'))
    tracked = lambda tree: {p for p in git(tree, 'ls-tree', '-r', '--name-only', '-z', 'HEAD').split('\0') if p}
    paths = sorted(tracked(base) | tracked(head) | set(PROBES))
    with open(f'{scratch}/gate-paths.json', 'w') as fh:
        json.dump(paths, fh)
    node(f'{tools}/gate-diff.mjs', base, f'{scratch}/gate-paths.json', f'{scratch}/gate-base.json')
    node(f'{tools}/gate-diff.mjs', head, f'{scratch}/gate-paths.json', f'{scratch}/gate-head.json')

    def surface(path):
        entries = json.load(open(path))['entries']
        return {e: sorted([r['name'], r['value'], r['type']] for r in entries[e]) for e in ENTRIES}

    def host(path):
        record = json.load(open(path))
        return {k: v for k, v in record.items() if k not in ('module', 'exports')}

    gate_base, gate_head = json.load(open(f'{scratch}/gate-base.json')), json.load(open(f'{scratch}/gate-head.json'))
    differing = sorted(p for p in paths if gate_base[p] != gate_head[p])
    result = {
        'surfaceEqual': surface(o('surface-base.json')) == surface(o('surface-head.json')),
        'hostEqualThroughCap1Daemon': host(o('host-base.json')) == host(o('host-head-cap1-daemon.json')),
        'hostEqualThroughHttpHost': host(o('host-base.json')) == host(o('host-head-http-host.json')),
        'e2eEqual': open(o('e2e-base.json'), 'rb').read() == open(o('e2e-head.json'), 'rb').read(),
        'gate': {'paths': len(paths), 'pathsSha256': hashlib.sha256('\0'.join(paths).encode()).hexdigest(),
                 'refusedAtBase': sorted(p for p in paths if gate_base[p] == 'refused'),
                 'refusedAtHead': sorted(p for p in paths if gate_head[p] == 'refused'),
                 'differing': [[p, gate_base[p], gate_head[p]] for p in differing],
                 'onlyHostPathsDiffer': bool(differing) and all(p.startswith('packages/http-host/') and gate_head[p] == 'refused' for p in differing)},
    }
    result['asExpected'] = all([result['surfaceEqual'], result['hostEqualThroughCap1Daemon'], result['hostEqualThroughHttpHost'],
                                result['e2eEqual'], result['gate']['onlyHostPathsDiffer']])
    return result


for tree in (base, head):
    assert git(tree, 'status', '--porcelain') == '', f'{tree} is not clean'
result = {'base': git(base, 'rev-parse', 'HEAD').strip(), 'head': git(head, 'rev-parse', 'HEAD').strip(), **run_all('run')}
result['records'] = {name: sha(os.path.join(out_dir, name)) for name in sorted(os.listdir(out_dir)) if name.endswith('.json') and name != 'differential.json'}
result['toolsSha256'] = {name: sha(os.path.join(tools, name)) for name in sorted(os.listdir(tools))}

if SELFTEST:
    MUTANTS = [
        ('refusal-status', 'packages/http-host/dist/server.js', 'export const REFUSAL_STATUS = 401;', 'export const REFUSAL_STATUS = 403;', 'hostEqualThroughHttpHost'),
        ('credential-detail', 'packages/http-host/dist/credentials.js', 'grants group or other access', 'grants access to others', 'hostEqualThroughCap1Daemon'),
        ('shutdown-announcement', 'apps/syzygy/dist/main.js', 'received, shutting down', 'received; shutting down', 'e2eEqual'),
        ('gate-host-prefix', 'apps/three-surface-poc/dist/git-observation.js', "'packages/http-host/',", '', 'onlyHostPathsDiffer'),
    ]
    outcomes = []
    for name, file, old, new, check in MUTANTS:
        path = os.path.join(head, file)
        original = open(path, 'rb').read()
        text = original.decode()
        assert text.count(old) == 1, (name, text.count(old))
        try:
            open(path, 'w').write(text.replace(old, new))
            mutated = run_all('selftest')
        finally:
            open(path, 'wb').write(original)
        value = mutated['gate'][check] if check == 'onlyHostPathsDiffer' else mutated[check]
        outcomes.append({'mutant': name, 'file': file, 'old': old, 'new': new, 'check': check, 'checkHeld': value, 'detected': value is False})
    result['selftest'] = outcomes
    result['selftestPassed'] = all(o['detected'] for o in outcomes)
    assert git(head, 'status', '--porcelain') == ''
shutil.rmtree(scratch, ignore_errors=True)
json.dump(result, open(os.path.join(out_dir, 'differential.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in result.items() if k not in ('records', 'toolsSha256', 'gate')}, indent=1))
print('gate differing:', len(result['gate']['differing']), 'only host paths:', result['gate']['onlyHostPathsDiffer'])
