#!/usr/bin/env python3
"""syzygy-5dhm.116: check that the cliffs' text, less the builder's own additions, is the predecessor's.

Usage: cliffs_inverse.py <worktree> <predecessor spec.md>. Loads the builder's literals, removes each addition (each found exactly once)
from the proposed file, restores the predecessor's title and banner, and compares with the predecessor; then compares the predecessor's
scenario headings with the first ones of the proposed text. It shares the builder's literals, so it checks the builder's arithmetic, not
its intent. It is the docs and code's inverse (docs/evidence/syzygy-5dhm-119/docs_and_code_inverse.py) with its paths moved.
"""
import importlib.util
import pathlib
import re
import sys

root, prior_path = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
loader = importlib.util.spec_from_file_location('b', root / 'docs/evidence/syzygy-5dhm-116/cliffs_build_spec.py')
b = importlib.util.module_from_spec(loader)
loader.loader.exec_module(b)
prior = prior_path.read_text(encoding='utf-8')
cur = (root / 'openspec/changes/dossier-cliffs/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
inv = cur
for add in [*('\n\n' + p for p in b.PARAGRAPHS), b.SCENARIOS, b.OBSERVABLE_ADD, b.ORACLE_ADD, b.FALSIFIER_ADD]:
    assert inv.count(add) == 1, add[:60]
    inv = inv.replace(add, '', 1)
old_lines, inv_lines = prior.split('\n'), inv.split('\n')
banner = next(i for i, line in enumerate(old_lines) if line.startswith('Candidate version '))
label = inv_lines[banner].split('replaces effective ')[1].split('. It binds')[0]
assert inv_lines[0] == b.NEW_TITLE and inv_lines[banner] == b.banner(label)
inv_lines[0], inv_lines[banner] = old_lines[0], old_lines[banner]
print('inverse equals the predecessor:', '\n'.join(inv_lines) == prior)
heads = lambda text: re.findall(r'^#### Scenario: .*$', text, re.M)
print('scenarios', len(heads(prior)), len(heads(cur)), 'prefix identical:', heads(cur)[:len(heads(prior))] == heads(prior))
