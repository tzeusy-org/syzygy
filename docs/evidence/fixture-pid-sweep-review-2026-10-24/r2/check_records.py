"""Reads every JSON record in the evidence directory by script and prints, per record, the keys
that name its subject (commit, digests) plus its top-level keys. Then checks each recorded
sha256 against the file's bytes at the code commit it names.

Usage: python3 check_records.py <clone> <evidence-dir>
"""
import hashlib
import json
import os
import re
import subprocess
import sys

clone, ev = sys.argv[1:3]
HEX40 = re.compile(r'^[0-9a-f]{40}$')
HEX64 = re.compile(r'^[0-9a-f]{64}$')


def walk(value, path=''):
    if isinstance(value, dict):
        for k, v in value.items():
            yield from walk(v, f'{path}.{k}')
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from walk(v, f'{path}[{i}]')
    else:
        yield path, value


def blob_sha(commit, path):
    r = subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], capture_output=True)
    return hashlib.sha256(r.stdout).hexdigest() if r.returncode == 0 else f'git-show-failed:{r.returncode}'


names = sorted(n for n in os.listdir(ev) if n.endswith('.json'))
print('records', len(names))
for name in names:
    data = json.load(open(os.path.join(ev, name)))
    leaves = list(walk(data))
    commits = sorted({v for p, v in leaves if isinstance(v, str) and HEX40.match(v)})
    print(f'\n== {name}: top keys {list(data)[:14]}')
    print('   40-hex values:', commits)
    # digest maps: any dict whose keys look like repo paths and values are 64-hex
    checked = 0
    mismatches = []
    def maps(value, path=''):
        if isinstance(value, dict):
            if value and all(isinstance(k, str) and '/' in k or k.endswith(('.ts', '.py')) for k in value) and all(isinstance(v, str) and HEX64.match(v) for v in value.values()):
                yield path, value
            for k, v in value.items():
                yield from maps(v, f'{path}.{k}')
        elif isinstance(value, list):
            for i, v in enumerate(value):
                yield from maps(v, f'{path}[{i}]')
    for path, m in maps(data):
        for file, digest in m.items():
            for c in commits:
                if blob_sha(c, file) == digest:
                    checked += 1
                    break
            else:
                mismatches.append((path, file, digest[:12]))
    print('   digest-map entries matching a named commit:', checked, 'unmatched:', mismatches)
