"""syzygy-bpyt.8.34: the Tests delta by name. In one committed, clean tree, list every test name of the root vitest config
(`vitest list --json`) at the commit, then with each test file the change touches put back as it stands at <base>, and compare the two
name sets. Only test files differ between the two, so a name present in one listing only was added or removed. The files are restored
and the tree must be clean after. Usage: test_delta.py <tree> <base> <out.json>
"""
import hashlib, json, os, subprocess, sys

tree, base, out_file = sys.argv[1:4]


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, check=True).stdout


def listing():
    run = subprocess.run(['npx', 'vitest', 'list', '--json'], cwd=tree, capture_output=True, text=True, env={**os.environ, 'CI': '1'}, timeout=1200)
    assert run.returncode == 0, run.stderr[-2000:]
    return sorted(f"{entry['file'].removeprefix(tree.rstrip('/') + '/')} > {entry['name']}" for entry in json.loads(run.stdout))


assert git('status', '--porcelain') == b'', 'the tree must be committed and clean'
commit = git('rev-parse', 'HEAD').decode().strip()
base = git('rev-parse', base).decode().strip()
changed = [path for path in git('diff', '--name-only', base, commit, '--', 'apps', 'packages').decode().split()]
tests = [path for path in changed if path.endswith('.test.ts')]
assert all(path.endswith(('.test.ts', '.testkit.ts')) for path in changed), changed
head_names = listing()
originals = {path: open(os.path.join(tree, path), 'rb').read() for path in tests}
try:
    for path in tests:
        open(os.path.join(tree, path), 'wb').write(git('show', f'{base}:{path}'))
    base_names = listing()
finally:
    for path, data in originals.items():
        open(os.path.join(tree, path), 'wb').write(data)
added, removed = sorted(set(head_names) - set(base_names)), sorted(set(base_names) - set(head_names))
by_file = {}
for name in added:
    by_file.setdefault(name.split(' > ')[0], 0)
    by_file[name.split(' > ')[0]] += 1
record = {
    'bead': 'syzygy-bpyt.8.34', 'commit': commit, 'base': base, 'changedUnderAppsAndPackages': changed,
    'toolSha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
    'names': {'base': len(base_names), 'commit': len(head_names)}, 'distinct': {'base': len(set(base_names)), 'commit': len(set(head_names))},
    'added': len(added), 'removed': len(removed), 'addedByFile': by_file, 'addedNames': added, 'removedNames': removed,
    'trackedTreeCleanAfter': git('status', '--porcelain') == b'',
}
json.dump(record, open(out_file, 'w'), indent=1, ensure_ascii=False)
open(out_file, 'a').write('\n')
print(json.dumps({k: record[k] for k in ('names', 'distinct', 'added', 'removed', 'addedByFile', 'trackedTreeCleanAfter')}))
