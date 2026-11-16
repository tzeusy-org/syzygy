#!/usr/bin/env python3
"""Sweep the blobs of a commit for ways of creating a top-level temp-directory entry that scratch_trace.cjs does not wrap.

Usage: creator_sweep.py <clone> <commit> <out.json>

Population: every blob of <commit> under apps/, packages/, scripts/ (plus root *.ts/*.mjs/*.cjs/*.js) whose name ends
.ts .mts .cts .js .mjs .cjs .py .sh (git ls-tree -r -z; blobs read with git cat-file --batch). For each file it records whether
the file names the temp directory at all (TMP below), and every line matching each CREATOR pattern. A file is a candidate for a
kind when it matches both TMP and that kind. Python re, never grep (rule 1).
"""
import json
import re
import subprocess
import sys

clone, commit, out = sys.argv[1], sys.argv[2], sys.argv[3]
SUFFIXES = ('.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.py', '.sh')
TMP = re.compile(r'\btmpdir\(\)|\bTMPDIR\b|\btempfile\.|\bmktemp\b|[\'"`]/tmp/|gettempdir')
CREATORS = {
    'appendFile': r'\bappendFile(?:Sync)?\(',
    'open': r'\bopen(?:Sync)?\(|\bpromises\.open\(|\bfsp?\.open\(',
    'stream': r'\bcreateWriteStream\(',
    'copyFile': r'\bcopyFile(?:Sync)?\(',
    'cp': r'\bcp(?:Sync)?\(',
    'rename': r'\brename(?:Sync)?\(',
    'link': r'\blink(?:Sync)?\(',
    'recursive-mkdir': r'recursive:\s*true',
    'socket-listen': r'\.listen\(\s*(?:\{\s*path|[A-Za-z_.]*(?:sock|Sock|path|Path))',
    'mkdtempDisposable': r'mkdtempDisposable',
    'shell-out': r'\b(?:spawn|spawnSync|execFile|execFileSync|exec|execSync|fork)\(',
    'env-object': r'\benv:\s*\{',
    'py-tempfile': r'\btempfile\.(?:mkdtemp|TemporaryDirectory|NamedTemporaryFile|mkstemp|TemporaryFile|SpooledTemporaryFile)\(',
    'sh-mktemp': r'\bmktemp\b',
    'literal-tmp': r'[\'"`]/tmp/',
}
COMPILED = {k: re.compile(v) for k, v in CREATORS.items()}
names = [n for n in subprocess.run(['git', 'ls-tree', '-r', '-z', '--name-only', commit], cwd=clone, capture_output=True, text=True, check=True).stdout.split('\0')
         if n.endswith(SUFFIXES) and (n.split('/')[0] in ('apps', 'packages', 'scripts') or '/' not in n)]
data = subprocess.run(['git', 'cat-file', '--batch'], cwd=clone, input=''.join(f'{commit}:{n}\n' for n in names).encode(), capture_output=True, check=True).stdout
pos, files = 0, {}
for n in names:
    end = data.index(b'\n', pos)
    size = int(data[pos:end].split()[2])
    files[n] = data[end + 1:end + 1 + size].decode('utf-8', 'replace')
    pos = end + 1 + size + 1
assert pos == len(data)
result = {'commit': commit, 'blobs': len(files), 'filesNamingTemp': 0, 'byKind': {}}
temp_files = {n for n, t in files.items() if TMP.search(t)}
result['filesNamingTemp'] = len(temp_files)
for kind, rx in COMPILED.items():
    hits = {}
    for n in sorted(temp_files):
        lines = [(i, l.strip()[:200]) for i, l in enumerate(files[n].splitlines(), 1) if rx.search(l)]
        if lines:
            hits[n] = lines
    result['byKind'][kind] = {'candidateFiles': len(hits), 'lines': sum(len(v) for v in hits.values()), 'hits': hits}
open(out, 'w').write(json.dumps(result, indent=1) + '\n')
print(json.dumps({'blobs': result['blobs'], 'filesNamingTemp': result['filesNamingTemp'],
                  'byKind': {k: {'files': v['candidateFiles'], 'lines': v['lines']} for k, v in result['byKind'].items()}}, indent=1))
