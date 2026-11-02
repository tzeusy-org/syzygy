#!/usr/bin/env python3
"""Pre-edit sweep for the dated mark on P-112's register row (syzygy-bpyt.55), run again after the edit.

Usage: p112-mark-sweep.py <repo root> <base commit> <out json>
Before the edit the file is hashed at the base commit and every tracked file at the base commit is searched, by two methods, for that
full digest, for the path in a manifest, and for P-112 in the two acceptance records. After the edit the file is hashed again and the
mark is checked to be the only change (the diff holds one line and the mark text, and nothing before the row's final cell moved).
"""
import hashlib
import json
import re
import subprocess
import sys

ROOT, BASE, OUT = sys.argv[1:4]
PATH = '.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md'
ACCEPTANCE = ['.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md', '.syzygy/governance/contracts/candidates/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md']


def git(*args, text=True):
    return subprocess.run(['git', '-C', ROOT, *args], capture_output=True, text=text, check=False).stdout


before = subprocess.run(['git', '-C', ROOT, 'show', f'{BASE}:{PATH}'], capture_output=True, check=True).stdout
digest = hashlib.sha256(before).hexdigest()
files = [f for f in git('ls-tree', '-r', '-z', '--name-only', BASE).split('\0') if f]
# method 1: git grep -F at the base commit; method 2: Python over every blob
citers_grep = [l for l in git('grep', '-l', '-F', digest, BASE).split('\n') if l]
citers_python = []
batch = subprocess.Popen(['git', '-C', ROOT, 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
for f in files:
    batch.stdin.write(f'{BASE}:{f}\n'.encode('utf8'))
    batch.stdin.flush()
    header = batch.stdout.readline().split()
    size = int(header[2])
    blob = batch.stdout.read(size)
    batch.stdout.read(1)
    if digest.encode() in blob:
        citers_python.append(f)
batch.stdin.close()
batch.wait()
manifest_hits = [l.split(':', 2)[1] for l in git('grep', '-n', '-F', 'PENDING-OWNER-DECISIONS.md', BASE, '--', '*MANIFEST*').split('\n') if l]
manifest_snapshot = {}
for f in sorted(set(manifest_hits)):
    for hit in re.finditer(r'"path":\s*"source/' + re.escape(PATH) + r'",(.*?)\}', subprocess.run(['git', '-C', ROOT, 'show', f'{BASE}:{f}'], capture_output=True, text=True).stdout, re.S):
        sha = re.search(r'"sha256":\s*"([0-9a-f]{64})"', hit.group(1))
        manifest_snapshot[f] = {'recordedSha256': sha.group(1) if sha else None, 'equalsFileDigest': bool(sha and sha.group(1) == digest)}
acceptance_hits = {}
for f in ACCEPTANCE:
    text = subprocess.run(['git', '-C', ROOT, 'show', f'{BASE}:{f}'], capture_output=True, text=True).stdout
    acceptance_hits[f] = {'grepFixedP112': len([l for l in git('grep', '-n', '-F', 'P-112', BASE, '--', f).split('\n') if l]), 'pythonP112': len(re.findall(r'P-112', text)), 'pythonLoadedProfile': len(re.findall(r'loaded-profile', text))}

after = open(f'{ROOT}/{PATH}', 'rb').read()
old_lines = before.decode('utf8').split('\n')
new_lines = after.decode('utf8').split('\n')
changed = [i for i, (a, b) in enumerate(zip(old_lines, new_lines), 1) if a != b]
only_row_changed = len(old_lines) == len(new_lines) and len(changed) == 1
row = new_lines[changed[0] - 1] if only_row_changed else ''
old_row = old_lines[changed[0] - 1] if only_row_changed else ''
mark_start = row.find('*(Marked 2026-10-29, `syzygy-bpyt.55`')
inserted = row[mark_start:row.find(' | owner act (one digest act)', mark_start)] if mark_start >= 0 else ''
result = {
    'subject': PATH,
    'baseCommit': BASE,
    'digestBefore': digest,
    'digestAfter': hashlib.sha256(after).hexdigest(),
    'trackedFilesAtBase': len(files),
    'trackedFilesHoldingTheBeforeDigest': {'gitGrep': citers_grep, 'python': citers_python},
    'manifestsNamingThePath': {'files': sorted(set(manifest_hits)), 'recordedSnapshot': manifest_snapshot},
    'acceptanceRecords': acceptance_hits,
    'afterTheEdit': {
        'linesChanged': changed,
        'oldRowWithTheMarkRemovedIsTheBeforeRow': bool(inserted) and row.replace(' ' + inserted, '', 1) == old_row,
        'markText': inserted,
        'headBannerAndAsOfLineUntouched': old_lines[:40] == new_lines[:40],
    },
}
with open(OUT, 'w', encoding='utf8') as handle:
    json.dump(result, handle, indent=1, ensure_ascii=True)
    handle.write('\n')
print(json.dumps({k: result[k] for k in ('digestBefore', 'digestAfter', 'trackedFilesHoldingTheBeforeDigest', 'afterTheEdit')}, indent=1)[:1800])
