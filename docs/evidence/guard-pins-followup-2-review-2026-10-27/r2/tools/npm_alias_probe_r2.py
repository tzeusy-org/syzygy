"""rev-541b: my own offline npm probe for the 8.39 `npm:` clause and the N2 residual sentence.

Independent of the lane's npm_alias_probe.py. Each case is a fresh project whose root lists workspaces `w` (wlib 1.0.0),
`s` (@syzygy/slib 1.0.0), `p` (plib 1.0.0-beta.1) and `app`. A case puts one dependency in `app`'s manifest or in the root's.
Every npm call (including the version calls) runs with HOME set to an empty scratch home, empty user and global configs,
a private empty cache, offline, and a registry of http://127.0.0.1:9/. A registry request shows as ENOTCACHED.
Usage: python3 -I npm_alias_probe_r2.py <empty scratch dir> <out.json> [main|root|fix]
"""
import json, os, re, subprocess, sys

scratch, out = (os.path.realpath(a) for a in sys.argv[1:3])
CASESET = sys.argv[3] if len(sys.argv) > 3 else 'main'
if os.listdir(scratch):
    sys.exit(f'{scratch} is not empty')
home = os.path.join(scratch, 'home')
os.makedirs(home)
os.makedirs(os.path.join(scratch, 'tmp'))
user, globalrc = os.path.join(scratch, 'user-npmrc'), os.path.join(scratch, 'global-npmrc')
open(user, 'w').close()
open(globalrc, 'w').close()
ENV = {'PATH': os.environ['PATH'], 'HOME': home, 'TMPDIR': os.path.join(scratch, 'tmp'), 'npm_config_userconfig': user,
       'npm_config_globalconfig': globalrc, 'npm_config_cache': os.path.join(scratch, 'cache'), 'npm_config_offline': 'true',
       'npm_config_registry': 'http://127.0.0.1:9/', 'npm_config_audit': 'false', 'npm_config_fund': 'false',
       'npm_config_update_notifier': 'false'}
WS = {'w': ('wlib', '1.0.0'), 's': ('@syzygy/slib', '1.0.0'), 'p': ('plib', '1.0.0-beta.1')}
# (id, what it shows, where declared: 'app' | 'root' | 'root:<field>' | None, name, spec)
MAIN = [
    ('A1', "alias under a workspace's name; target also the workspace's name; range the workspace does not satisfy", 'app', 'wlib', 'npm:wlib@^2.0.0'),
    ('A2', "alias under a scoped workspace's name; range the workspace does not satisfy", 'app', '@syzygy/slib', 'npm:typescript@^5.5.0'),
    ('A3', "alias under a workspace's name in the ROOT manifest; range not satisfied", 'root', 'wlib', 'npm:typescript@^5.5.0'),
    ('A4', "alias under a workspace's name in the ROOT manifest; range satisfied", 'root', 'wlib', 'npm:typescript@*'),
    ('B1', "alias under a non-workspace name; target a workspace's name at the workspace's exact version", 'app', 'dossier', 'npm:wlib@1.0.0'),
    ('B2', "alias under a non-workspace name; target a scoped workspace's name, no version", 'app', 'dossier', 'npm:@syzygy/slib'),
    ('C1', "alias under a workspace's name; a dist-tag", 'app', 'wlib', 'npm:typescript@latest'),
    ('C2', "alias under a workspace's name; the workspace's exact version", 'app', 'wlib', 'npm:typescript@1.0.0'),
    ('C3', "alias under a prerelease workspace's name; `*`", 'app', 'plib', 'npm:typescript@*'),
    ('C4', "alias under a prerelease workspace's name; `>=0.0.0`", 'app', 'plib', 'npm:typescript@>=0.0.0'),
    ('D1', 'control for N2: nothing declared; does app load each workspace by its own name?', None, None, None),
]
ROOT = [
    ('R1', "ROOT dependencies: alias under a scoped workspace's name; range not satisfied", 'root', '@syzygy/slib', 'npm:typescript@^5.5.0'),
    ('R2', "ROOT dependencies: plain range under a workspace's name; not satisfied (control)", 'root', 'wlib', '^5.5.0'),
    ('R3', 'ROOT dependencies: alias under a name no workspace has (control)', 'root', 'dossier', 'npm:typescript@^5.5.0'),
    ('R4', "ROOT devDependencies: alias under a workspace's name; range not satisfied", 'root:devDependencies', 'wlib', 'npm:typescript@^5.5.0'),
    ('R5', "ROOT optionalDependencies: alias under a workspace's name; range not satisfied", 'root:optionalDependencies', 'wlib', 'npm:typescript@^5.5.0'),
    ('R6', "ROOT peerDependencies: alias under a workspace's name; range not satisfied", 'root:peerDependencies', 'wlib', 'npm:typescript@^5.5.0'),
    ('R7', "ROOT dependencies: a git spec under a workspace's name", 'root', 'wlib', 'github:someone/wlib#v1.tar'),
    ('R8', "ROOT dependencies: alias under a name no workspace has; target a workspace's name", 'root', 'dossier', 'npm:wlib@*'),
    ('R9', "a WORKSPACE (w) declares an alias under its own name; range not satisfied", 'w', 'wlib', 'npm:typescript@^5.5.0'),
]
FIX = [
    ('F1', "alias under a workspace's name, no version", 'app', 'wlib', 'npm:typescript'),
    ('F2', "alias under a prerelease workspace's name, no version", 'app', 'plib', 'npm:typescript'),
    ('F3', "ROOT dependencies: alias under a workspace's name; a dist-tag", 'root', 'wlib', 'npm:typescript@latest'),
    ('F4', "alias under a workspace's name; a range below its version", 'app', 'wlib', 'npm:typescript@<1.0.0'),
    ('F5', "another WORKSPACE (s) declares an alias under wlib's name; range satisfied", 's', 'wlib', 'npm:typescript@*'),
    ('F6', "another WORKSPACE (s) declares an alias under wlib's name; range not satisfied", 's', 'wlib', 'npm:typescript@^5.5.0'),
]
CASES = {'main': MAIN, 'root': ROOT, 'fix': FIX}[CASESET]


def npm(root, *args):
    return subprocess.run(['npm', *args, '--ignore-scripts'], cwd=root, capture_output=True, text=True, env=ENV, timeout=300)


def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as fh:
        json.dump(data, fh)


def loads_from(cwd, name):
    script = ('try { const p = require.resolve(process.argv[1] + "/package.json"); const m = require(p);'
              ' console.log(JSON.stringify({path: require("node:fs").realpathSync(p), name: m.name, version: m.version})) }'
              ' catch (e) { console.log(JSON.stringify({error: e.code})) }')
    r = subprocess.run(['node', '-e', script, name], cwd=cwd, capture_output=True, text=True, env=ENV)
    return json.loads(r.stdout)


results = []
for cid, shows, where, name, spec in CASES:
    root = os.path.join(scratch, cid)
    rootpkg = {'name': 'probe-root', 'version': '0.0.0', 'private': True, 'workspaces': [*WS, 'app']}
    apppkg = {'name': 'app', 'version': '0.0.0'}
    wspkgs = {d: {'name': n, 'version': v} for d, (n, v) in WS.items()}
    if where is not None and where.startswith('root'):
        rootpkg[where.partition(':')[2] or 'dependencies'] = {name: spec}
    elif where == 'app':
        apppkg['dependencies'] = {name: spec}
    elif where is not None:
        wspkgs[where]['dependencies'] = {name: spec}
    write(os.path.join(root, 'package.json'), rootpkg)
    for d, pkg in wspkgs.items():
        write(os.path.join(root, d, 'package.json'), pkg)
    write(os.path.join(root, 'app', 'package.json'), apppkg)
    lock = npm(root, 'install', '--package-lock-only')
    err = [l for l in lock.stderr.splitlines() if l.startswith('npm error')]
    code = next((m.group(1) for m in (re.match(r'npm error code (\S+)', l) for l in err) if m), None)
    req = next((m.group(1) for m in (re.match(r'npm error .*request to (\S+) failed', l) for l in err) if m), None)
    rec = {'id': cid, 'shows': shows, 'declaredIn': where, 'declared': None if name is None else {name: spec},
           'lockExit': lock.returncode, 'errorCode': code, 'wouldRequest': req}
    if lock.returncode == 0:
        pk = json.load(open(os.path.join(root, 'package-lock.json')))['packages']
        rec['lockEntries'] = {k: {f: v[f] for f in ('resolved', 'link', 'version', 'name') if f in v}
                              for k, v in pk.items() if k.startswith('node_modules/') or k.startswith('app/node_modules/')}
        inst = npm(root, 'install')
        rec['installExit'] = inst.returncode
        ls = npm(root, 'ls', '--all')
        rec['lsExit'] = ls.returncode
        rec['lockWarnings'] = [l for l in lock.stderr.splitlines() if l.startswith('npm warn')]
        names = [n for n, _ in WS.values()] if name is None else [name]
        rec['links'] = {}
        for n in names:
            for base in ('', 'app', 'w', 's'):
                p = os.path.join(root, base, 'node_modules', n)
                if os.path.lexists(p):
                    rec['links'][os.path.join(base, 'node_modules', n)] = os.readlink(p) if os.path.islink(p) else 'not a link'
        rec['appLoads'] = {n: loads_from(os.path.join(root, 'app'), n) for n in names}
        rec['rootLoads'] = {n: loads_from(root, n) for n in names}
    results.append(rec)
    print(cid, '|', lock.returncode, code, req, rec.get('links'), rec.get('appLoads'), flush=True)

ver = lambda *a: subprocess.run(a, capture_output=True, text=True, env=ENV).stdout.strip()
npm_dir = os.path.dirname(os.path.dirname(os.path.realpath(subprocess.run(['which', 'npm'], capture_output=True, text=True).stdout.strip())))
meta = {'npm': ver('npm', '--version'), 'node': ver('node', '--version'),
        'arborist': json.load(open(os.path.join(npm_dir, 'node_modules', '@npmcli', 'arborist', 'package.json')))['version'],
        'npa': json.load(open(os.path.join(npm_dir, 'node_modules', 'npm-package-arg', 'package.json')))['version'],
        'caseSet': CASESET, 'registry': ENV['npm_config_registry'], 'offline': True, 'workspaces': WS,
        'cacheAfter': sorted(os.listdir(os.path.join(scratch, 'cache'))) if os.path.isdir(os.path.join(scratch, 'cache')) else []}
with open(out, 'w') as fh:
    fh.write(json.dumps({**meta, 'results': results}, indent=1).replace(scratch, '<scratch>') + '\n')
print('wrote', out)
