"""syzygy-bpyt.8.39: what npm installs for an `npm:` alias, the evidence for the testkit's `npm:` clause as rounds 1 and 2 of the
review of 8.39 (F1 each) corrected it, and as round 3's F1 corrected round 2's text. npa_probe.cjs reads how npm-package-arg parses
a spec; this observes what npm then installs.

Each case is a fresh project of three workspaces: `w` named `wlib` and `s` named `@syzygy/slib`, both at version 1.0.0, and `app`.
The case's one dependency is declared in `app`'s manifest, in the root's (round 2: npm treats the root's differently), or in both
(round 3: npm skips the root's and reads `app`'s by its own range). Every npm call, the version call included, runs offline, with a
private empty cache, an empty user and global config, an empty scratch HOME, no inherited npm_config_* variable, a registry of
http://127.0.0.1:9/ and a working directory inside the scratch directory, which may have no package.json or node_modules in any
directory above it (npm would take that directory as the project and read its `.npmrc`; the probe refuses one), so nothing is
fetched and the one npmrc outside the scratch directory npm opens is its own builtin `<npm>/npmrc` (absent here). The version
calls ran in the caller's directory, and so read its `.npmrc`, until syzygy-bpyt.39 (the round-3 review's N3);
docs/evidence/syzygy-bpyt-39/ traces the files npm opens.
A registry fetch shows as ENOTCACHED, with the URL npm would have requested. A link shows as a lockfile entry with `link: true`;
the case then installs in full, and records where `node_modules/<name>` points and which package.json Node loads for the name from
inside `app`. arborist's version is read beside the npm on PATH, found by resolving `npm` itself.
Usage: python3 -I npm_alias_probe.py <empty scratch dir, outside any npm project> <out.json>
"""
import json, os, re, shutil, subprocess, sys

scratch, out = (os.path.realpath(a) for a in sys.argv[1:3])
if os.listdir(scratch):
    sys.exit(f'{scratch} is not empty')
# npm takes the nearest directory above its working directory that holds a package.json or node_modules as the project, and
# reads that directory's .npmrc; the version calls run in the scratch directory itself, so no such directory may be above it.
up = os.path.dirname(scratch)
while True:
    if any(os.path.exists(os.path.join(up, name)) for name in ('package.json', 'node_modules')):
        sys.exit(f'{up} holds a package.json or node_modules, so npm would read its .npmrc: use a scratch directory outside any npm project')
    if up == os.path.dirname(up):
        break
    up = os.path.dirname(up)
WORKSPACES = {'w': 'wlib', 's': '@syzygy/slib'}
# (what the case shows, the manifest that declares it or a tuple of the manifests that do, the name it is declared under, its spec)
CASES = [
    ('an alias under a name no workspace has, its target a registry package', 'app', 'dossier', 'npm:typescript@^5.5.0'),
    ("an alias under a name no workspace has, its target a workspace's name", 'app', 'dossier', 'npm:wlib@*'),
    ('an alias under a name no workspace has, no version', 'app', 'dossier', 'npm:typescript'),
    ("an alias under a workspace's name, a range its version satisfies", 'app', 'wlib', 'npm:typescript@*'),
    ("an alias under a workspace's name, the target's range satisfied by the workspace's version", 'app', 'wlib', 'npm:typescript@^1.0.0'),
    ("an alias under a workspace's name, a range its version does not satisfy", 'app', 'wlib', 'npm:typescript@^5.5.0'),
    ("an alias under a scoped workspace's name, a range its version satisfies", 'app', '@syzygy/slib', 'npm:typescript@*'),
    ("control: a plain range under a workspace's name, satisfied", 'app', 'wlib', '^1.0.0'),
    ("control: a plain range under a workspace's name, not satisfied", 'app', 'wlib', '^5.5.0'),
    ("an alias under a workspace's name, no version", 'app', 'wlib', 'npm:typescript'),
    ("the root's manifest: an alias under a workspace's name, a range its version does not satisfy", 'root', 'wlib',
     'npm:typescript@^5.5.0'),
    ("the root's manifest: an alias under a scoped workspace's name, a range its version does not satisfy", 'root', '@syzygy/slib',
     'npm:typescript@^5.5.0'),
    ("the root's manifest: a plain range under a workspace's name, not satisfied", 'root', 'wlib', '^5.5.0'),
    ("control: the root's manifest, an alias under a name no workspace has", 'root', 'dossier', 'npm:typescript@^5.5.0'),
    ("the root's manifest and app's: the same alias under a workspace's name, a range its version does not satisfy", ('root', 'app'),
     'wlib', 'npm:typescript@^5.5.0'),
]
user, globalrc = (os.path.join(scratch, name) for name in ('empty-user-npmrc', 'empty-global-npmrc'))
open(user, 'w').close()
open(globalrc, 'w').close()
for directory in ('tmp', 'home'):
    os.makedirs(os.path.join(scratch, directory))
ENV = {**{k: v for k, v in os.environ.items() if not k.lower().startswith('npm_config_')}, 'HOME': os.path.join(scratch, 'home'),
       'npm_config_userconfig': user, 'npm_config_globalconfig': globalrc, 'npm_config_cache': os.path.join(scratch, 'cache'),
       'npm_config_offline': 'true', 'npm_config_registry': 'http://127.0.0.1:9/', 'npm_config_audit': 'false', 'npm_config_fund': 'false',
       'npm_config_update_notifier': 'false', 'TMPDIR': os.path.join(scratch, 'tmp')}


def npm(root, *args):
    return subprocess.run(['npm', *args, '--ignore-scripts'], cwd=root, capture_output=True, text=True, env=ENV, timeout=300)


def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as fh:
        json.dump(data, fh)


results = []
for index, (shows, where, name, spec) in enumerate(CASES):
    root = os.path.join(scratch, f'case{index}')
    manifests = (where,) if isinstance(where, str) else where
    declares = lambda manifest: {'dependencies': {name: spec}} if manifest in manifests else {}
    write(os.path.join(root, 'package.json'), {'name': 'probe-root', 'version': '0.0.0', 'private': True, 'workspaces': [*WORKSPACES, 'app'],
                                               **declares('root')})
    for directory, workspace in WORKSPACES.items():
        write(os.path.join(root, directory, 'package.json'), {'name': workspace, 'version': '1.0.0'})
    write(os.path.join(root, 'app', 'package.json'), {'name': 'app', 'version': '0.0.0', **declares('app')})
    lock = npm(root, 'install', '--package-lock-only')
    errors = [line for line in lock.stderr.splitlines() if line.startswith('npm error')]
    code = next((m.group(1) for m in map(re.compile(r'npm error code (\S+)').match, errors) if m), None)
    request = next((m.group(1) for m in map(re.compile(r'npm error .*request to (\S+) failed').match, errors) if m), None)
    entry, install, link, loads = None, None, None, None
    if lock.returncode == 0:
        packages = json.load(open(os.path.join(root, 'package-lock.json')))['packages']
        entry = {k: v for k, v in packages.get(f'node_modules/{name}', {}).items() if k in ('resolved', 'link', 'version', 'name')}
        install = npm(root, 'install').returncode
        installed = os.path.join(root, 'node_modules', name)
        link = os.readlink(installed) if os.path.islink(installed) else None
        node = subprocess.run(['node', '-e', f'const p = require.resolve({json.dumps(name + "/package.json")}); const m = require(p);'
                               ' console.log(JSON.stringify([require("node:fs").realpathSync(p), m.name, m.version]))'],
                              cwd=os.path.join(root, 'app'), capture_output=True, text=True, env=ENV)
        path, loaded, version = json.loads(node.stdout)
        loads = {'packageJson': os.path.relpath(path, root), 'name': loaded, 'version': version}
    results.append({'shows': shows, 'declaredIn': where if isinstance(where, str) else list(where), 'declared': {name: spec},
                    'lockExit': lock.returncode, 'errorCode': code, 'wouldRequest': request, 'lockEntry': entry, 'installExit': install,
                    'installedLink': link, 'appLoads': loads})
    print(index, shows, '|', lock.returncode, code, request, entry, link, loads, flush=True)
version = lambda *args: subprocess.run(args, cwd=scratch, capture_output=True, text=True, env=ENV).stdout.strip()
npm_dir = os.path.dirname(os.path.dirname(os.path.realpath(shutil.which('npm', path=ENV['PATH']))))  # <npm>/bin/npm-cli.js
arborist = json.load(open(os.path.join(npm_dir, 'node_modules', '@npmcli', 'arborist', 'package.json')))['version']
with open(out, 'w') as fh:
    fh.write(json.dumps({'npm': version('npm', '--version'), 'arborist': arborist, 'node': version('node', '--version'),
                         'registry': ENV['npm_config_registry'], 'offline': True, 'workspaces': WORKSPACES, 'results': results},
                        indent=1).replace(scratch, '<scratch>') + '\n')
print('wrote', out)
