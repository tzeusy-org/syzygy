#!/usr/bin/env python3
"""Find each phrase the round-2 raw quotes without a line number, in the PR's files at the reviewed commit and the PR body.
Usage: r2_phrase_check.py <clone> <commit> <pr-body.md>
Whitespace and `//` comment markers are normalized away, so a phrase wrapped across comment lines is found."""
import re
import subprocess
import sys

clone, commit, body = sys.argv[1:4]
FILES = ['docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json', 'apps/three-surface-poc/src/fence-rules.test.ts',
         'packages/polaris-generation-consent/src/package-reader.test.ts', '.claude/skills/th-engineering/subskills/test-rigor/SKILL.md']
PHRASES = [
    'a silent partial item set under a known denominator',
    'the denominator is 1 of 3',
    'a hidden link removes the file it names from the manifest population',
    'whether anything downstream then reports that file as missing',
    'Not changed here; a fix flips the GAP',
    'recorded and not decided (an open owner question',
    'if it does, the partial set is a defect, not a refusal',
    'on the 25 fence-only cases',
    'Tests pin observable outcomes',
    'emit-equal (runtime-equal)',
    'renderer: a fence line indented with a tab does not end a paragraph',
    'while this repair ran',
]
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'\n\s*//', ' ', s)).strip()
texts = {f: norm(subprocess.run(['git', '-C', clone, 'show', f'{commit}:{f}'], capture_output=True, text=True).stdout) for f in FILES}
texts['PR body'] = norm(open(body, encoding='utf8').read())
for p in PHRASES:
    hits = [f for f, t in texts.items() if p in t]
    print('OK  ' if hits else 'MISS', p, '->', hits)
