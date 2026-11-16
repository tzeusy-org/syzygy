"""Writes a copy of crlf-differential.mjs that also dumps its separator slice, so slice-rebuild.mjs can compare the two sets.
Usage: python3 -I slice-dump.py <crlf-differential.mjs> <out copy.mjs>; run the copy with EVIDENCE_DIR and SLICE_DUMP set."""
import sys
src = open(sys.argv[1], encoding='utf8').read()
pairs = [
    ("const here = dirname(fileURLToPath(import.meta.url));", "const here = process.env.EVIDENCE_DIR;"),
    ("  return list;\n})();\n", "  return list;\n})();\nwriteFileSync(process.env.SLICE_DUMP, JSON.stringify(separatorSlice));\n"),
]
for old, new in pairs:
    if src.count(old) != 1:
        raise SystemExit(f'not exactly once: {old!r}')
    src = src.replace(old, new)
open(sys.argv[2], 'w', encoding='utf8').write(src)
