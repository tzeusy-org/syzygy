"""rev-541: does npm install every `npm:` alias from the registry (the N4 sentence)? Offline, with an empty private cache and
an empty user config, so nothing is fetched and no user npmrc is read: a registry fetch shows up as ENOTCACHED, and a local link
shows up as a `link: true` lockfile entry.

Usage: python3 -I npm_alias_probe.py <scratch dir> <out.json>
Each case is a two-workspace project: `w` is a workspace named `wlib` (version 1.0.0), and workspace `app` declares one
dependency. `npm install --package-lock-only --offline` builds the ideal tree; when it succeeds, a full offline install follows
and Node reports which package.json the declared name loads from inside `app`.
"""
import json, os, shutil, subprocess, sys

scratch, out = sys.argv[1:3]
CASES = [
    ('alias under the workspace name, target a registry package', 'wlib', 'npm:typescript@*'),
    ('alias under the workspace name, target the workspace', 'wlib', 'npm:wlib@*'),
    ('alias under the workspace name, target ranged to the workspace version', 'wlib', 'npm:typescript@^1.0.0'),
    ('alias under the workspace name, target range the workspace version does not satisfy', 'wlib', 'npm:typescript@^5.5.0'),
    ('alias under another name, target the workspace name', 'dossier', 'npm:wlib@*'),
    ('alias under another name, target a registry package', 'dossier', 'npm:typescript@^5.5.0'),
    ('alias under another name, scoped target, no version', 'dossier', 'npm:@scope/lib'),
    ('control: plain range on the workspace name', 'wlib', '*'),
    ('control: no declaration at all (spec None)', 'wlib', None),
]
results = []
for index, (label, name, spec) in enumerate(CASES):
    root = os.path.join(scratch, f'case{index}')
    shutil.rmtree(root, ignore_errors=True)
    os.makedirs(os.path.join(root, 'w'))
    os.makedirs(os.path.join(root, 'app'))
    json.dump({'name': 'probe-root', 'version': '0.0.0', 'private': True, 'workspaces': ['w', 'app']}, open(os.path.join(root, 'package.json'), 'w'))
    json.dump({'name': 'wlib', 'version': '1.0.0'}, open(os.path.join(root, 'w', 'package.json'), 'w'))
    json.dump({'name': 'app', 'version': '0.0.0', 'dependencies': {} if spec is None else {name: spec}}, open(os.path.join(root, 'app', 'package.json'), 'w'))
    open(os.path.join(scratch, 'empty-npmrc'), 'w').close()
    open(os.path.join(scratch, 'empty-globalrc'), 'w').close()
    env = {**os.environ, 'npm_config_userconfig': os.path.join(scratch, 'empty-npmrc'), 'npm_config_globalconfig': os.path.join(scratch, 'empty-globalrc'),
           'npm_config_cache': os.path.join(scratch, 'cache'), 'npm_config_offline': 'true', 'npm_config_audit': 'false', 'npm_config_fund': 'false',
           'npm_config_update_notifier': 'false', 'TMPDIR': os.path.join(scratch, 'tmp')}
    os.makedirs(env['TMPDIR'], exist_ok=True)
    run = subprocess.run(['npm', 'install', '--package-lock-only', '--ignore-scripts'], cwd=root, capture_output=True, text=True, env=env, timeout=300)
    lock_path = os.path.join(root, 'package-lock.json')
    entries = {}
    if os.path.exists(lock_path):
        packages = json.load(open(lock_path)).get('packages', {})
        entries = {key: {k: value.get(k) for k in ('name', 'version', 'resolved', 'link') if k in value}
                   for key, value in packages.items() if key.endswith('/' + name) or key == name}
    error = [line for line in (run.stderr or '').splitlines() if line.strip()][:4]
    loads = None
    if run.returncode == 0:
        # Reify too, then ask Node what the declared name loads from inside `app`.
        subprocess.run(['npm', 'install', '--ignore-scripts'], cwd=root, capture_output=True, text=True, env=env, timeout=300, check=True)
        loads = subprocess.run(['node', '-e', f"const p=require.resolve('{name}/package.json');const m=require(p);console.log(require('fs').realpathSync(p)+' '+m.name+'@'+m.version)"],
                               cwd=os.path.join(root, 'app'), capture_output=True, text=True).stdout.strip().replace(scratch, '<scratch>')
    results.append({'case': label, 'declared': {} if spec is None else {name: spec}, 'exit': run.returncode, 'lockEntries': entries, 'stderr': error, 'appLoads': loads})
    print(index, label, run.returncode, json.dumps(entries), error[:1], loads, flush=True)
npm = subprocess.run(['npm', '--version'], capture_output=True, text=True).stdout.strip()
json.dump({'npm': npm, 'results': results}, open(out, 'w'), indent=1)
print('wrote', out)
