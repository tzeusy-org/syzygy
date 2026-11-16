"""rev-531 tree sweep, independent of the lane's tools.

Usage: python3 -I sweep.py <repo> <commit> <out.json>
Over `git ls-tree -r -z <commit>`: every tracked package.json (manifest population), every dependency in its four
dependency fields, which versions match the PR's LOCAL_VERSION pattern (Python port, checked against the JS one by npa_probe),
and every tracked file under a `src/` directory of apps/* or packages/* by extension.
"""
import json, re, subprocess, sys
from collections import Counter

repo, commit, out = sys.argv[1:4]
LOCAL = re.compile(r'^(?:file:|link:|workspace:|npm:|\.\.?(?:/|$)|/|~/)|\.(?:tgz|tar|tar\.gz)$', re.I)
FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
raw = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], capture_output=True, check=True).stdout
paths = [p.decode() for p in raw.split(b'\0') if p]
manifests = sorted(p for p in paths if p == 'package.json' or p.endswith('/package.json'))
rows, field_counts, tilde, nonregistry = [], Counter(), [], []
for m in manifests:
    data = json.loads(subprocess.run(['git', '-C', repo, 'show', f'{commit}:{m}'], capture_output=True, check=True).stdout)
    for field in FIELDS:
        for name, version in (data.get(field) or {}).items():
            field_counts[field] += 1
            local = bool(LOCAL.search(version))
            rows.append({'manifest': m, 'field': field, 'name': name, 'version': version, 'local': local})
            if version.startswith('~'):
                tilde.append([m, field, name, version])
            if not re.match(r'^[\^~]?\d', version) and version not in ('*', 'latest'):
                nonregistry.append([m, field, name, version])
in_src = [p for p in paths if re.match(r'^(apps|packages)/[^/]+/src/', p)]
ext = Counter()
for p in in_src:
    m = re.search(r'(\.d)?\.[A-Za-z0-9]+$', p.split('/')[-1])
    ext[m.group(0) if m else '(none)'] += 1
odd = sorted(p for p in in_src if re.search(r'\.(mts|cts|tsx)$', p))
anywhere = sorted(p for p in paths if re.search(r'\.(mts|cts|tsx)$', p))
result = {'commit': commit, 'trackedPaths': len(paths), 'manifests': manifests, 'manifestCount': len(manifests),
          'dependencyCount': len(rows), 'perField': dict(field_counts), 'localMatches': [r for r in rows if r['local']],
          'tildeVersions': tilde, 'nonNumericVersions': nonregistry, 'srcFileCount': len(in_src), 'srcExtensions': dict(ext),
          'srcMtsCtsTsx': odd, 'mtsCtsTsxAnywhereTracked': anywhere,
          'bareNames': sorted({r['name'] for r in rows})}
json.dump(result, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in result.items() if k not in ('bareNames', 'manifests')}, indent=1))
