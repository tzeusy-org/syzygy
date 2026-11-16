"""Reviewer copy (rev-547) of docs/evidence/syzygy-bpyt-39/root_exception_probe.py at 38fa1596, FORMS replaced by the seven forms
of the testkit's first bullet the lane did not run. Every other byte as in the original, which follows.
"""
"""syzygy-bpyt.39 (the PR 541 round-3 review's N5): what npm installs for a `file:`, path, tarball-name, `link:` or `workspace:`
version declared under a workspace's own name, in the root's manifest and, as the control, in a workspace's. The evidence for the
root-manifest exception the testkit's first two LOCAL_VERSION bullets now name; the round-3 review observed it for `workspace:`
and `link:` (its Q6 and Q7), and this repeats those two beside the forms it did not run.

After the round-3 reviewer's npm_alias_probe_r3.py (docs/evidence/guard-pins-followup-2-review-2026-10-27/r3/tools/), with its
environment: each case is a fresh project whose root lists workspaces `w` (wlib 1.0.0), `s` (@syzygy/slib 1.0.0) and `app`
(app 0.0.0). Every npm and node call runs with an environment built from PATH alone (HOME an empty scratch home, empty user and
global configs, a private empty cache, offline, a registry of http://127.0.0.1:9/) and with its working directory inside the
scratch directory, the version calls included, so the one npmrc outside the scratch directory npm opens is its own builtin
`<npm>/npmrc` (absent here), as every npm call does (the round-3 review's N3; npmrc_trace.py here traces it).
Usage: python3 -I root_exception_probe.py <empty scratch dir> <out.json>
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
FORMS = [('.', '.'), ('..', '..'), ('../x', '../nowhere'), ('/x', '/nonexistent-r547/nowhere'), ('~/x', '~/nowhere'),
         ('x.tar', 'nowhere.tar'), ('x.tar.gz', 'nowhere.tar.gz')]
# (id, what it shows, {manifest dir ('' is the root): {field: {name: spec}}}, the name to inspect)
CASES = [(f'R{i}', f"the root's manifest declares {form} under a workspace's name", {'': {D: {'wlib': spec}}}, 'wlib')
         for i, (form, spec) in enumerate(FORMS, 1)] + \
        [(f'A{i}', f"control: app's manifest declares {form} under a workspace's name", {'app': {D: {'wlib': spec}}}, 'wlib')
         for i, (form, spec) in enumerate(FORMS, 1)] + \
        [(f'N{i}', f"control: the root's manifest declares {form} under a name no workspace has", {'': {D: {'dossier': spec}}}, 'dossier')
         for i, (form, spec) in enumerate(FORMS, 1)]


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
        r['installErrorLines'] = [line for line in inst.stderr.splitlines() if line.startswith('npm error')][:4]
        installed = os.path.join(root, 'node_modules', name)
        r['rootLink'] = os.readlink(installed) if os.path.islink(installed) else None
        r['loads'] = {where or 'root': loads_from(os.path.join(root, where), name) for where in ('app', 'w', 's')}
        for v in r['loads'].values():
            if 'path' in v:
                v['path'] = os.path.relpath(v['path'], root)
    results.append(r)
    print(cid, '|', r['lockExit'], code, request, r.get('lockEntries'), r.get('installExit'), r.get('rootLink'), r.get('loads', {}).get('app'), flush=True)
version = lambda *args: subprocess.run(args, cwd=scratch, capture_output=True, text=True, env=ENV).stdout.strip()
npm_dir = os.path.dirname(os.path.dirname(os.path.realpath(shutil.which('npm', path=ENV['PATH']))))
arborist = json.load(open(os.path.join(npm_dir, 'node_modules', '@npmcli', 'arborist', 'package.json')))['version']
npa = json.load(open(os.path.join(npm_dir, 'node_modules', 'npm-package-arg', 'package.json')))['version']
with open(out, 'w') as fh:
    fh.write(json.dumps({'npm': version('npm', '--version'), 'arborist': arborist, 'npa': npa, 'node': version('node', '--version'),
                         'registry': ENV['npm_config_registry'], 'offline': True, 'workspaces': WS, 'results': results},
                        indent=1).replace(scratch, '<scratch>') + '\n')
print('wrote', out)
