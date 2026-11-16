#!/usr/bin/env python3
"""Who cites the base and code digests of markdown-code-context.ts, over every tracked file at HEAD, by two methods.
Usage: digest-sweep.py <clone>  (method 1: Python bytes search over `git ls-files -z`; method 2: `git grep -l -F` per digest)"""
import subprocess, sys
root = sys.argv[1]
DIG = {'base': 'a02c105a483d11a9e90d27aade01ef5ddee6b60b9e165a9a7193c5baaa21f8fe', 'code': '93b95f6d4eabc440344404d01040ba1f10bdceb65e69ab74c4ea59c1fa5831f7'}
files = [f for f in subprocess.run(['git', 'ls-files', '-z'], cwd=root, capture_output=True, check=True).stdout.decode().split('\0') if f]
m1 = {k: [] for k in DIG}
for f in files:
    try:
        b = open(f'{root}/{f}', 'rb').read()
    except (IsADirectoryError, FileNotFoundError):
        continue
    for k, d in DIG.items():
        if d.encode() in b:
            m1[k].append(f)
m2 = {k: sorted(subprocess.run(['git', 'grep', '-l', '-F', d], cwd=root, capture_output=True, text=True).stdout.split()) for k, d in DIG.items()}
print('tracked files', len(files))
for k in DIG:
    print(k, 'method1', len(m1[k]), 'method2', len(m2[k]), 'agree', sorted(m1[k]) == m2[k])
    for f in sorted(m1[k]):
        print('   ', f)
