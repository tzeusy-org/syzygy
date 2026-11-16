"""rev-541c: my own offline npm probe for the round-3 `npm:` clause of syzygy-bpyt.8.39 (workspace-reach.testkit.ts:64-69).

Independent of the lane's npm_alias_probe.py and of round 2's probe. Each case is a fresh project whose root lists workspaces
`w` (wlib 1.0.0), `s` (@syzygy/slib 1.0.0) and `app` (app 0.0.0). Unlike both earlier probes, a case may declare in more than one
manifest, and in any field. Every npm and node call runs with an environment built from PATH alone: HOME an empty scratch home,
empty user and global configs, a private empty cache, offline, and a registry of http://127.0.0.1:9/, so a registry fetch shows
as ENOTCACHED with the URL npm would have requested.
Usage: python3 -I npm_alias_probe_r3.py <empty scratch dir> <out.json>
"""
import json, os, re, shutil, subprocess, sys

scratch, out = (os.path.realpath(a) for a in sys.argv[1:3])
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
WS = {'w': ('wlib', '1.0.0'), 's': ('@syzygy/slib', '1.0.0')}
D = 'dependencies'
# (id, what it shows, {manifest dir ('' is the root): {field: {name: spec}}}, the name to inspect)
CASES = [
    ('Q1', "root AND app declare the same alias under a workspace's name, a range the workspace does not satisfy",
     {'': {D: {'wlib': 'npm:typescript@^5.5.0'}}, 'app': {D: {'wlib': 'npm:typescript@^5.5.0'}}}, 'wlib'),
    ('Q2', "root declares an unsatisfied alias, app a satisfied one, both under a workspace's name",
     {'': {D: {'wlib': 'npm:typescript@^5.5.0'}}, 'app': {D: {'wlib': 'npm:typescript@^1.0.0'}}}, 'wlib'),
    ('Q3', "app declares an alias under a scoped workspace's name, a range the workspace satisfies",
     {'app': {D: {'@syzygy/slib': 'npm:typescript@^1.0.0'}}}, '@syzygy/slib'),
    ('Q4', "root declares an alias under a scoped workspace's name, a dist-tag",
     {'': {D: {'@syzygy/slib': 'npm:typescript@next'}}}, '@syzygy/slib'),
    ('Q5', "root declares a non-registry alias under a workspace's name (npa throws for it)",
     {'': {D: {'wlib': 'npm:./w'}}}, 'wlib'),
    ('Q6', "root declares `workspace:*` under a workspace's name (npa throws EUNSUPPORTEDPROTOCOL for it)",
     {'': {D: {'wlib': 'workspace:*'}}}, 'wlib'),
    ('Q7', "root declares `link:` to a missing directory under a workspace's name",
     {'': {D: {'wlib': 'link:../nowhere'}}}, 'wlib'),
    ('Q8', 'a workspace (w) declares an alias under its own name, a range it satisfies',
     {'w': {D: {'wlib': 'npm:typescript@^1.0.0'}}}, 'wlib'),
    ('Q9', "app declares an alias under a workspace's name in peerDependencies, a range not satisfied",
     {'app': {'peerDependencies': {'wlib': 'npm:typescript@^5.5.0'}}}, 'wlib'),
    ('Q10', "app declares an alias under a workspace's name, the x-range `x`",
     {'app': {D: {'wlib': 'npm:typescript@x'}}}, 'wlib'),
    ('Q11', "app declares an alias under a workspace's name, an empty range after `@`",
     {'app': {D: {'wlib': 'npm:typescript@'}}}, 'wlib'),
    ('Q12', "control for Q1: app alone declares the alias under a workspace's name, a range not satisfied",
     {'app': {D: {'wlib': 'npm:typescript@^5.5.0'}}}, 'wlib'),
]


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
for cid, shows, decls, name in CASES:
    root = os.path.join(scratch, cid)
    write(os.path.join(root, 'package.json'), {'name': 'probe-root', 'version': '0.0.0', 'private': True,
                                               'workspaces': [*WS, 'app'], **decls.get('', {})})
    for d, (n, v) in WS.items():
        write(os.path.join(root, d, 'package.json'), {'name': n, 'version': v, **decls.get(d, {})})
    write(os.path.join(root, 'app', 'package.json'), {'name': 'app', 'version': '0.0.0', **decls.get('app', {})})
    lock = npm(root, 'install', '--package-lock-only')
    errors = [line for line in lock.stderr.splitlines() if line.startswith('npm error')]
    code = next((m.group(1) for m in map(re.compile(r'npm error code (\S+)').match, errors) if m), None)
    request = next((m.group(1) for m in map(re.compile(r'npm error .*request to (\S+) failed').match, errors) if m), None)
    r = {'id': cid, 'shows': shows, 'declarations': decls, 'inspect': name, 'lockExit': lock.returncode, 'errorCode': code,
         'wouldRequest': request, 'errorLines': errors[:4], 'warnLines': [l for l in lock.stderr.splitlines() if l.startswith('npm warn')][:4]}
    if lock.returncode == 0:
        packages = json.load(open(os.path.join(root, 'package-lock.json')))['packages']
        r['lockEntries'] = {k: {f: v for f, v in e.items() if f in ('resolved', 'link', 'version', 'name')}
                            for k, e in packages.items() if k == f'node_modules/{name}' or k.endswith(f'/node_modules/{name}')}
        inst = npm(root, 'install')
        r['installExit'] = inst.returncode
        installed = os.path.join(root, 'node_modules', name)
        r['rootLink'] = os.readlink(installed) if os.path.islink(installed) else None
        ls = npm(root, 'ls', '--all')
        r['lsExit'] = ls.returncode
        r['lsWarnOrErr'] = [l for l in (ls.stderr + ls.stdout).splitlines() if 'invalid' in l or 'npm error' in l or 'npm warn' in l][:4]
        r['loads'] = {where or 'root': loads_from(os.path.join(root, where), name) for where in ('app', 'w', 's')}
        for v in r['loads'].values():
            if 'path' in v:
                v['path'] = os.path.relpath(v['path'], root)
    results.append(r)
    print(cid, '|', r['lockExit'], code, request, r.get('lockEntries'), r.get('rootLink'), r.get('loads'), flush=True)
version = lambda *args: subprocess.run(args, capture_output=True, text=True, env=ENV).stdout.strip()
npm_dir = os.path.dirname(os.path.dirname(os.path.realpath(shutil.which('npm', path=ENV['PATH']))))
arborist = json.load(open(os.path.join(npm_dir, 'node_modules', '@npmcli', 'arborist', 'package.json')))['version']
npa = json.load(open(os.path.join(npm_dir, 'node_modules', 'npm-package-arg', 'package.json')))['version']
with open(out, 'w') as fh:
    fh.write(json.dumps({'npm': version('npm', '--version'), 'arborist': arborist, 'npa': npa, 'node': version('node', '--version'),
                         'registry': ENV['npm_config_registry'], 'offline': True, 'workspaces': WS, 'results': results},
                        indent=1).replace(scratch, '<scratch>') + '\n')
print('wrote', out)
