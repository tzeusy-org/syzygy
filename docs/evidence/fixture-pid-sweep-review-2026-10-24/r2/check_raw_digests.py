"""Checks every abbreviated hex value written `<prefix>…<suffix>` (or a bare 40/64-hex value) in the raw
against the full values computed here, by script (AGENTS.md rule 3).
Usage: python3 check_raw_digests.py <raw.md> <repo> <tools-dir> <subject.diff>
Source files are read as blobs of commit 564ec47c from <repo>, so no checkout is needed."""
import hashlib
import os
import re
import subprocess
import sys

raw, clone, tools, subject = sys.argv[1:5]
known = {}


def add(label, value):
    known[value] = label


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


add('subject diff', sha(subject))
for name in os.listdir(tools):
    path = os.path.join(tools, name)
    if os.path.isfile(path):
        add(f'tools/{name}', sha(path))
for rel in ['apps/three-surface-poc/src/fixture-directories.ts', 'apps/three-surface-poc/src/polaris-accessibility-main.ts',
            'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts', 'apps/three-surface-poc/src/test-model-fixture.ts', 'vitest.config.ts']:
    blob = subprocess.run(['git', '-C', clone, 'show', f'564ec47c:{rel}'], capture_output=True, check=True).stdout
    add(rel, hashlib.sha256(blob).hexdigest())
for ref in ['564ec47c', '9a30237e', '3f08143c', '0d4d5098', 'c64d2834']:
    add(f'commit {ref}', subprocess.run(['git', '-C', clone, 'rev-parse', ref], capture_output=True, text=True, check=True).stdout.strip())
text = open(raw, encoding='utf-8').read()
bad = 0
for m in re.finditer(r'([0-9a-f]{6,})…([0-9a-f]{4,})?', text):
    pre, suf = m.group(1), m.group(2) or ''
    hits = [lab for full, lab in known.items() if full.startswith(pre) and full.endswith(suf)]
    status = 'ok' if len(hits) == 1 else 'NO-MATCH' if not hits else 'AMBIGUOUS'
    bad += status != 'ok'
    print(status, m.group(0), hits)
for m in re.finditer(r'(?<![0-9a-f])([0-9a-f]{40}|[0-9a-f]{64})(?![0-9a-f])', text):
    status = 'ok' if m.group(1) in known else 'NO-MATCH'
    bad += status != 'ok'
    print(status, m.group(1)[:16], known.get(m.group(1)))
print('problems', bad)
