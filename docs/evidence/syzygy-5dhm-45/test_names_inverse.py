#!/usr/bin/env python3
"""syzygy-5dhm.45: check that version 2.35's text, less the builder's own additions, is the predecessor's.

Usage: test_names_inverse.py <worktree> <predecessor spec.md>. Loads the builder's literals, removes each addition (each found exactly
once) from the 2.35 file, restores the predecessor's title and banner, and compares with the predecessor; then compares the predecessor's
scenario headings with the first ones of 2.35. It shares the builder's literals, so it checks the builder's arithmetic, not its intent.
"""
import importlib.util
import pathlib
import re
import sys

root, prior_path = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
loader = importlib.util.spec_from_file_location('b', root / 'docs/evidence/syzygy-5dhm-45/test_names_build_spec.py')
sys.argv = ['b', str(prior_path), 'version 0', '/dev/null']
b = importlib.util.module_from_spec(loader)
loader.loader.exec_module(b)
prior = prior_path.read_text(encoding='utf-8')
cur = (root / 'openspec/changes/dossier-test-names/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
inv = cur
for add in [*('\n\n' + p for p in b.PARAGRAPHS), b.SCENARIOS, b.OBSERVABLE_ADD, b.ORACLE_ADD, b.FALSIFIER_ADD]:
    assert inv.count(add) == 1, add[:60]
    inv = inv.replace(add, '', 1)
old_lines, inv_lines = prior.split('\n'), inv.split('\n')
banner = next(i for i, line in enumerate(old_lines) if line.startswith('Candidate version '))
assert inv_lines[0] == b.NEW_TITLE and inv_lines[banner] == b.NEW_BANNER.replace('version 0', inv_lines[banner].split('replaces effective ')[1].split('. It binds')[0])
inv_lines[0], inv_lines[banner] = old_lines[0], old_lines[banner]
print('inverse equals the predecessor:', '\n'.join(inv_lines) == prior)
heads = lambda text: re.findall(r'^#### Scenario: .*$', text, re.M)
print('scenarios', len(heads(prior)), len(heads(cur)), 'prefix identical:', heads(cur)[:len(heads(prior))] == heads(prior))
