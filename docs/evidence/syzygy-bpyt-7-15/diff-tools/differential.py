"""syzygy-bpyt.7.15: the old-versus-new differential of the host, over two built clones. This is the syzygy-bpyt.7.3 tool
(docs/evidence/syzygy-bpyt-7-3/tools/differential.py), reused now that both commits have @syzygy/http-host. Every comparison
must be equal, the gate's included, and the PR 529 review's N5 is carried: a selftest mutant for `surfaceEqual`, and the
limit it leaves, stated below.

Usage: python3 -I differential.py <base-tree> <head-tree> <tools-dir> <scratch-dir> <out-dir> [--selftest]

Both trees must be clean checkouts of their commits, installed and built (`npm ci && npm run build`). It runs, on each side:
  - surface.mjs: the export surface, types included, of the cap1-daemon barrel, its three shims, and the @syzygy/http-host
    barrel; each name is compared with its value and type flags and the declaration it resolves to, by file and by name;
  - host-diff.mjs: the host's answers to 1,296 requests and its start failures and credential decisions, through the cap1-daemon
    barrel and through @syzygy/http-host, each against the same module at the other commit;
  - e2e-diff.mjs: the built Capability 1 daemon over three fixtures, three shutdown signal sets and three refused invocations;
  - gate-diff.mjs: the POC observer-input gate on every path tracked at either commit, and seven probes.
and writes each record to <out-dir>, then `differential.json`: which comparisons are equal, and for the gate, every path whose
decision differs. Expected: every comparison equal, and no gate decision differs.

--selftest (rule 6): one run per mutant, each with one head file mutated in place (and restored). Six must each make their
comparison report a difference: the refusal status, a credential refusal detail, the daemon's shutdown announcement and the
gate's cap1-daemon prefix (the entry this bead keeps), all in built files; then, for N5, two source edits to the cap1-daemon
server shim that `surfaceEqual` alone must catch: a type re-export dropped, and the PR 529 review's R13 swap (UNKNOWN_ROUTE_STATUS
re-exported as a binding of HANDLER_FAILURE_STATUS). The swap needs the declaration's name in the key: both constants are
declared in the same host file, so (name, value, type, file) was blind to it.

The limit that remains, which a seventh mutant records and which must leave `surfaceEqual` true: the surface is names and
bindings, never values. A changed constant (UNKNOWN_ROUTE_STATUS = 405 in the host source) is the same surface. Values are
host-diff's to compare, through the build and only for the constants it records; cap1-daemon's package.test.ts pins each shared
binding to the host's value (syzygy-bpyt.7.14), and the tests assert the literal statuses.
"""
import hashlib, json, os, shutil, subprocess, sys

base, head, tools, scratch, out_dir = sys.argv[1:6]
SELFTEST = sys.argv[6:] == ['--selftest']
os.makedirs(out_dir, exist_ok=True)
ENTRIES = ['packages/cap1-daemon/src/index.ts', 'packages/cap1-daemon/src/server.ts', 'packages/cap1-daemon/src/credentials.ts', 'packages/cap1-daemon/src/routes-human.ts',
           'packages/http-host/src/index.ts']
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
    node(f'{tools}/surface.mjs', head, o('surface-head.json'), *ENTRIES)
    node(f'{tools}/host-diff.mjs', f'{base}/packages/cap1-daemon/dist/index.js', f'{scratch}/hb', o('host-base-cap1-daemon.json'))
    node(f'{tools}/host-diff.mjs', f'{head}/packages/cap1-daemon/dist/index.js', f'{scratch}/hc', o('host-head-cap1-daemon.json'))
    node(f'{tools}/host-diff.mjs', f'{base}/packages/http-host/dist/index.js', f'{scratch}/hbh', o('host-base-http-host.json'))
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
        return {e: sorted([r['name'], r['value'], r['type'], r['declaredIn'], r['declaredAs']] for r in entries[e]) for e in ENTRIES}

    def host(path):
        record = json.load(open(path))
        return {k: v for k, v in record.items() if k not in ('module', 'exports')}

    gate_base, gate_head = json.load(open(f'{scratch}/gate-base.json')), json.load(open(f'{scratch}/gate-head.json'))
    differing = sorted(p for p in paths if gate_base[p] != gate_head[p])
    result = {
        'surfaceEqual': surface(o('surface-base.json')) == surface(o('surface-head.json')),
        'hostEqualThroughCap1Daemon': host(o('host-base-cap1-daemon.json')) == host(o('host-head-cap1-daemon.json')),
        'hostEqualThroughHttpHost': host(o('host-base-http-host.json')) == host(o('host-head-http-host.json')),
        'e2eEqual': open(o('e2e-base.json'), 'rb').read() == open(o('e2e-head.json'), 'rb').read(),
        'gate': {'paths': len(paths), 'pathsSha256': hashlib.sha256('\0'.join(paths).encode()).hexdigest(),
                 'refusedAtBase': sorted(p for p in paths if gate_base[p] == 'refused'),
                 'refusedAtHead': sorted(p for p in paths if gate_head[p] == 'refused'),
                 'differing': [[p, gate_base[p], gate_head[p]] for p in differing],
                 'gateEqual': not differing},
    }
    result['asExpected'] = all([result['surfaceEqual'], result['hostEqualThroughCap1Daemon'], result['hostEqualThroughHttpHost'],
                                result['e2eEqual'], result['gate']['gateEqual']])
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
        ('gate-cap1-daemon-prefix', 'apps/three-surface-poc/dist/git-observation.js', "'packages/cap1-daemon/',", '', 'gateEqual'),
        ('shim-type-dropped', 'packages/cap1-daemon/src/server.ts', '  type RouteRequest,\n', '', 'surfaceEqual'),
        ('shim-binding-swapped', 'packages/cap1-daemon/src/server.ts', '  UNKNOWN_ROUTE_STATUS,\n', '  HANDLER_FAILURE_STATUS as UNKNOWN_ROUTE_STATUS,\n', 'surfaceEqual'),
        ('source-value-changed', 'packages/http-host/src/server.ts', 'export const UNKNOWN_ROUTE_STATUS = 404;', 'export const UNKNOWN_ROUTE_STATUS = 405;', 'surfaceEqual'),
    ]
    LIMIT = {'source-value-changed'}  # the limit stated above: must be held, not detected
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
        value = mutated['gate'][check] if check == 'gateEqual' else mutated[check]
        outcomes.append({'mutant': name, 'file': file, 'old': old, 'new': new, 'check': check, 'checkHeld': value, 'detected': value is False,
                         'expected': 'held' if name in LIMIT else 'detected'})
    result['selftest'] = outcomes
    result['selftestPassed'] = all(o['detected'] is (o['expected'] == 'detected') for o in outcomes)
    assert git(head, 'status', '--porcelain') == ''
shutil.rmtree(scratch, ignore_errors=True)
json.dump(result, open(os.path.join(out_dir, 'differential.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in result.items() if k not in ('records', 'toolsSha256', 'gate')}, indent=1))
print('gate differing:', len(result['gate']['differing']), 'gate equal:', result['gate']['gateEqual'])
