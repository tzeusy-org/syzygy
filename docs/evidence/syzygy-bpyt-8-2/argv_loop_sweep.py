"""syzygy-bpyt.8.2 AC1: the sweep for a hand-rolled argv loop. Population: every non-test .ts file under apps/syzygy/src and
packages/polaris-dossier/src (a *.test.ts file is left out; a *.testkit.ts file is in). A hit is a line matching any pattern below,
each Python `re`, case-sensitive, matched per line. Every hit is printed with its file and line, so each can be judged; the sweep
claims nothing by itself. Usage: argv_loop_sweep.py <tree> <out.json>
"""
import json, os, re, sys

tree, out = sys.argv[1], sys.argv[2]
NAME = r'\w*(?:argv|Argv|args|Args)\w*'
PATTERNS = {
    'index-loop': rf'for\s*\(\s*(?:let|var)\s+\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*{NAME}\.length',
    'of-loop': rf'for\s*\(\s*(?:const|let)\s+\w+\s+of\s+{NAME}\s*\)',
    'while-loop': rf'while\s*\([^)]*{NAME}\.length',
    'next-element': rf'\b{NAME}\s*\[\s*\+\+\w+\s*\]|\b{NAME}\s*\[\s*\w+\s*\+\s*1\s*\]|\b{NAME}\s*\[\s*\w+\+\+\s*\]',
    'shift': rf'\b{NAME}\.shift\(\)',
    'dash-test': r"""startsWith\(\s*['"]-""",
}
ROOTS = ['apps/syzygy/src', 'packages/polaris-dossier/src']
files, hits = [], []
for root in ROOTS:
    for name in sorted(os.listdir(os.path.join(tree, root))):
        if not name.endswith('.ts') or name.endswith('.test.ts'):
            continue
        rel = f'{root}/{name}'
        files.append(rel)
        for number, line in enumerate(open(os.path.join(tree, rel), encoding='utf8'), 1):
            for kind, pattern in PATTERNS.items():
                if re.search(pattern, line):
                    hits.append({'file': rel, 'line': number, 'kind': kind, 'text': line.strip()[:200]})
json.dump({'tree': os.path.abspath(tree), 'roots': ROOTS, 'patterns': PATTERNS, 'files': len(files), 'hits': hits},
          open(out, 'w'), indent=1)
print(len(files), 'files,', len(hits), 'hits')
for hit in hits:
    print(f"  {hit['file']}:{hit['line']} [{hit['kind']}] {hit['text'][:140]}")
