#!/usr/bin/env python3
"""Rule-9 sweep for the round-4 removal: seven literal tokens over every tracked file at the clone's HEAD (method 1: Python over
the blobs from `git cat-file --batch`), cross-checked against `git grep -F -l` (method 2), plus the PR body and bead 4.24 text.

usage: sweep.py CLONE PR_BODY BEAD_TEXT"""
import subprocess, sys

clone, pr_body, bead_text = sys.argv[1:4]
TOKENS = ['--profile', 'instrument', 'measure-restore-probes', 'probe_measure_restore', 'KIT_', 'FILE_', 'PROF']
# Files that belong to this PR or name its scripts: the ones a dangling reference would mislead.
RELEVANT_PREFIXES = ('docs/evidence/syzygy-bpyt-4-13/', 'scripts/measure_vitest_test_durations.py', 'scripts/size_vitest_test_timeouts.py',
                     'packages/polaris-generation-consent/src/package-reader.test.ts')


def git(*a, inp=None, ok=(0,)):
    r = subprocess.run(['git', '-C', clone, *a], capture_output=True, input=inp)
    if r.returncode not in ok: raise SystemExit(f'git {a} exit {r.returncode}: {r.stderr!r}')
    return r.stdout


head = git('rev-parse', 'HEAD').decode().strip()
paths = [p for p in git('ls-files', '-z').decode().split('\0') if p]
# method 1: blob bytes at HEAD
listing = git('ls-tree', '-r', '-z', 'HEAD').decode().split('\0')
blobs = {}
for row in listing:
    if not row: continue
    meta, path = row.split('\t', 1)
    mode, typ, oid = meta.split()
    if typ == 'blob': blobs[path] = oid
print(f'HEAD {head}; tracked files (ls-files) {len(paths)}; blobs in HEAD tree {len(blobs)}; equal sets {set(paths) == set(blobs)}')
oids = list(dict.fromkeys(blobs.values()))
out = git('cat-file', '--batch', inp=('\n'.join(oids) + '\n').encode())
content, i = {}, 0
for oid in oids:
    nl = out.index(b'\n', i)
    hdr = out[i:nl].split()
    size = int(hdr[2])
    content[oid] = out[nl + 1:nl + 1 + size]
    i = nl + 1 + size + 1
m1 = {t: sorted(p for p, o in blobs.items() if t.encode() in content[o]) for t in TOKENS}
symlinks = sum(1 for row in listing if row.startswith('120000'))
print(f'symlink entries in tree: {symlinks}')
for t in TOKENS:
    m2 = sorted(p for p in git('grep', '-F', '-l', '-a', '-e', t, 'HEAD', ok=(0, 1)).decode().splitlines())
    m2 = sorted(p.split(':', 1)[1] for p in m2)
    rel = [p for p in m1[t] if p.startswith(RELEVANT_PREFIXES)]
    print(f'\n== {t!r}: method1 {len(m1[t])} files, method2 (git grep -F -l -a HEAD) {len(m2)} files, equal {m1[t] == m2}; '
          f'in PR-relevant paths {len(rel)}')
    for p in rel:
        text = content[blobs[p]].decode('utf8', 'replace').split('\n')
        for n, line in enumerate(text, 1):
            if t in line:
                print(f'   {p}:{n}: {line.strip()[:220]}')
    if len(m1[t]) <= 25:
        print('   files:', m1[t])
    if m1[t] != m2:
        print('   only m1:', sorted(set(m1[t]) - set(m2))[:20], 'only m2:', sorted(set(m2) - set(m1[t]))[:20])
# files that name the measurement script or the deleted files, whatever the token
for name in ('measure_vitest_test_durations', 'bpyt-4-13', 'bpyt.4.13'):
    hits = sorted(p for p, o in blobs.items() if name.encode() in content[o])
    print(f'\nfiles naming {name!r}: {len(hits)}')
    for p in hits: print('   ', p)
for label, path in (('PR body', pr_body), ('bead 4.24', bead_text)):
    text = open(path, encoding='utf8').read().split('\n')
    print(f'\n== {label} ({path}, {len(text)} lines)')
    for t in TOKENS:
        rows = [(n, l) for n, l in enumerate(text, 1) if t in l]
        print(f'  {t!r}: {len(rows)} lines')
        for n, l in rows: print(f'     {n}: {l.strip()[:260]}')
