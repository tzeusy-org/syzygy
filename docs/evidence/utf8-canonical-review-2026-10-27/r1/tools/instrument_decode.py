#!/usr/bin/env python3
"""Make a recording build of decodeUtf8 for reach_probe.mjs: rewrites the BUILT packages/support/dist/decode-utf8.js
(untracked build output, never a source file) so every call pushes { bytes, result } onto globalThis.__du8.
Usage: instrument_decode.py <clone>. The anchor must occur exactly once. Rebuild with tsc -b --force to undo.
"""
import sys

path = sys.argv[1] + '/packages/support/dist/decode-utf8.js'
text = open(path, encoding='utf-8').read()
old = 'export function decodeUtf8(bytes) {\n'
if text.count(old) != 1:
    raise SystemExit(f'anchor occurs {text.count(old)} times')
new = ('export function decodeUtf8(bytes) {\n    const __r = __decode(bytes);\n'
       '    if (Array.isArray(globalThis.__du8)) globalThis.__du8.push({ bytes: Uint8Array.from(bytes), result: __r });\n'
       '    return __r;\n}\nfunction __decode(bytes) {\n')
open(path, 'w', encoding='utf-8').write(text.replace(old, new))
print('instrumented', path)
