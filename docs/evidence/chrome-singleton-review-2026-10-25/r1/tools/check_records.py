"""Summarise every JSON record in the evidence directory: top-level keys, every
commit-like field (full 40-hex or abbreviated), and digest-like fields."""
import json
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
HEX40 = re.compile(r'^[0-9a-f]{40}$')
HEXSHORT = re.compile(r'^[0-9a-f]{7,39}$')
HEX64 = re.compile(r'^[0-9a-f]{64}$')


def walk(value, path, out):
    if isinstance(value, dict):
        for key, item in value.items():
            walk(item, f'{path}.{key}', out)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            walk(item, f'{path}[{index}]', out)
    elif isinstance(value, str):
        lowered = path.lower()
        if 'commit' in lowered or 'head' in lowered or 'base' in lowered:
            if HEX40.match(value):
                out['commit40'].append((path, value))
            elif HEXSHORT.match(value):
                out['commitShort'].append((path, value))
        if HEX64.match(value):
            out['digest64'].append((path, value))


files = sorted(root.glob('*.json'))
print(f'records: {len(files)}')
for file in files:
    data = json.loads(file.read_text())
    out = {'commit40': [], 'commitShort': [], 'digest64': []}
    walk(data, '$', out)
    keys = list(data.keys()) if isinstance(data, dict) else type(data).__name__
    print(f'\n== {file.name}')
    print('  keys:', keys)
    seen = {}
    for path, value in out['commit40']:
        seen.setdefault(value, []).append(path)
    for value, paths in seen.items():
        print(f'  commit40 {value}: {len(paths)} at e.g. {paths[:3]}')
    short = {}
    for path, value in out['commitShort']:
        short.setdefault(value, []).append(path)
    for value, paths in short.items():
        print(f'  commitShort {value}: {len(paths)} at e.g. {paths[:3]}')
    print(f'  digest64 fields: {len(out["digest64"])}')
