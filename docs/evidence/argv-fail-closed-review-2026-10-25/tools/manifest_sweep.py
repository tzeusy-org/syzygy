"""rev-528: sweep every tracked package.json at a commit, from the git objects (never the working tree).

Usage: python3 -I manifest_sweep.py <repo> <commit>
Reports, per manifest: name, whether it declares `imports`, and each exports entry whose value is not a plain string: its runtime
conditions (every key but `types`), whether they all name one string, and any array, nested object, null or `*` key.
"""
import json, subprocess, sys

repo, commit = sys.argv[1:3]


def git(*args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True).stdout


paths = [p for p in git('ls-tree', '-r', '-z', '--name-only', commit).decode().split('\0') if p.endswith('package.json')]
workspace = [p for p in paths if p.count('/') == 2 and p.split('/')[0] in ('apps', 'packages')]
report = {'commit': git('rev-parse', commit).decode().strip(), 'trackedPackageJson': paths, 'workspaceManifests': len(workspace),
          'withImports': [], 'exportsEntries': 0, 'stringEntries': 0, 'objectEntries': [], 'multiRuntime': [], 'disagreeing': [],
          'arrays': [], 'nested': [], 'patterns': [], 'nulls': [], 'exportsNotObject': [], 'names': {}}
for path in workspace:
    manifest = json.loads(git('show', f'{commit}:{path}'))
    report['names'][path] = manifest.get('name')
    if 'imports' in manifest:
        report['withImports'].append(path)
    exports = manifest.get('exports')
    if exports is None:
        continue
    if not isinstance(exports, dict) or not all(key.startswith('.') for key in exports):
        report['exportsNotObject'].append(path)
        continue
    for key, value in exports.items():
        report['exportsEntries'] += 1
        where = f'{path} {key}'
        if '*' in key:
            report['patterns'].append(where)
        if isinstance(value, str):
            report['stringEntries'] += 1
            continue
        if value is None:
            report['nulls'].append(where)
            continue
        if isinstance(value, list):
            report['arrays'].append(where)
            continue
        runtime = {k: v for k, v in value.items() if k != 'types'}
        report['objectEntries'].append({'entry': where, 'conditions': list(value.keys())})
        if any(not isinstance(v, str) for v in runtime.values()):
            report['nested'].append(where)
        if len(runtime) > 1:
            same = len(set(json.dumps(v) for v in runtime.values())) == 1
            report['multiRuntime'].append({'entry': where, 'conditions': list(runtime), 'sameTarget': same})
            if not same:
                report['disagreeing'].append(where)
json.dump(report, sys.stdout, indent=1)
print()
