#!/usr/bin/env python3
"""Count the commands of PROJECT-STATUS.md's "How to verify this page" sh block at a commit, read from git objects; runs nothing.

Usage: battery-count.py <clone> <rev> [<rev> ...]
Two methods: round 1's rule (non-blank, non-comment, non-assignment lines of the first ```sh block after the heading), and a
plain count of lines that begin with `python3 `, `node `, `npm ` or `bash ` in the same block.
"""
import re
import subprocess
import sys

clone = sys.argv[1]
for rev in sys.argv[2:]:
    text = subprocess.run(['git', '-C', clone, 'show', f'{rev}:PROJECT-STATUS.md'], capture_output=True, text=True, check=True).stdout
    section = text[text.index('## How to verify this page'):]
    block = re.search(r'```sh\n(.*?)\n```', section, re.S).group(1)
    lines = [l.strip() for l in block.split('\n')]
    rule = [l for l in lines if l and not l.startswith('#') and not re.fullmatch(r'[A-Z_][A-Z0-9_]*=\S+', l)]
    plain = [l for l in lines if re.match(r'(python3|node|npm|bash) ', l)]
    print(f'{rev}: commands (round-1 rule) {len(rule)}; lines starting python3/node/npm/bash {len(plain)}')
