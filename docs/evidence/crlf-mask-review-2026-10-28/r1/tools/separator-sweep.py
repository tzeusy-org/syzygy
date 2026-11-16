#!/usr/bin/env python3
"""Which tracked files under packages/ and apps/ hold U+2028, U+2029 or U+0085, as a raw code point or as a JavaScript escape.
Usage: separator-sweep.py <clone>"""
import re, subprocess, sys
root = sys.argv[1]
files = [f for f in subprocess.run(['git', 'ls-files', '-z', 'packages', 'apps'], cwd=root, capture_output=True, check=True).stdout.decode().split('\0') if f]
RAW = {'U+2028': ' ', 'U+2029': ' ', 'U+0085': '\u0085'}
ESC = re.compile(r'\\u2028|\\u2029|\\u0085|\\x85|\\u\{2028\}|\\u\{2029\}|\\u\{85\}|fromCharCode\(\s*(0x2028|0x2029|0x85|8232|8233|133)\b', re.I)
hits = []
for f in files:
    try:
        s = open(f'{root}/{f}', encoding='utf8').read()
    except (UnicodeDecodeError, IsADirectoryError, FileNotFoundError):
        continue
    raw = [k for k, v in RAW.items() if v in s]
    esc = sorted(set(m.group(0) for m in ESC.finditer(s)))
    if raw or esc:
        hits.append((f, raw, esc))
print('tracked files under packages/ and apps/:', len(files))
print('files holding one:', len(hits))
for h in hits:
    print('  ', h)
