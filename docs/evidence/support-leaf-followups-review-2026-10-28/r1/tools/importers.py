import json, re, subprocess, sys
clone, out = sys.argv[1], sys.argv[2]
files = subprocess.run(['git', '-C', clone, 'ls-tree', '-r', '-z', '--name-only', '2f48eefa'], capture_output=True, check=True).stdout.decode().split('\0')
files = [f for f in files if f]
needles = {'purity.testkit': re.compile(r'purity\.testkit'), 'workspace-reach.testkit': re.compile(r'workspace-reach\.testkit')}
res = {k: [] for k in needles}
for f in files:
    if not re.search(r'\.(?:[cm]?[jt]sx?|json|py|ya?ml)$', f) or f.startswith('docs/'):
        continue
    try:
        text = subprocess.run(['git', '-C', clone, 'show', f'2f48eefa:{f}'], capture_output=True, check=True).stdout.decode('utf8', 'replace')
    except subprocess.CalledProcessError:
        continue
    for k, rx in needles.items():
        if rx.search(text) and not f.endswith(k + '.ts'):
            res[k].append(f)
summary = {'denominator_tracked_files': len(files), 'scanned': 'code/config files outside docs/ (js/ts/json/py/yaml)', 'importers': res,
           'non_test_importers': {k: [f for f in v if not f.endswith('.test.ts')] for k, v in res.items()}}
json.dump(summary, open(out, 'w'), indent=1); print(json.dumps(summary, indent=1))
