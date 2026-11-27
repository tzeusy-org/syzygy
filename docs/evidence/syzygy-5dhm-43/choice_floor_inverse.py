#!/usr/bin/env python3
"""syzygy-5dhm.43: check that version 2.37's text, less the builder's own additions, is version 2.36's.

Usage: choice_floor_inverse.py <worktree>. Loads the builder's literals, removes each addition (each found exactly once) from the 2.37
file, restores the title and banner, and compares with the 2.36 file; then compares the 263 predecessor scenario headings with the first
263 of 2.37. It shares the builder's literals, so it checks the builder's arithmetic, not its intent.
"""
import importlib.util
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
spec_loader = importlib.util.spec_from_file_location('b', root / 'docs/evidence/syzygy-5dhm-43/choice_floor_build_spec.py')
sys.argv = ['b', str(root), '/dev/null']
b = importlib.util.module_from_spec(spec_loader)
spec_loader.loader.exec_module(b)
prior = (root / 'openspec/changes/polaris-source-example-advice/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
cur = (root / 'openspec/changes/dossier-choice-floor/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
inv = cur
for add in ('\n\n' + b.PARAGRAPH, b.SCENARIOS, b.OBSERVABLE_ADD, b.ORACLE_ADD, b.FALSIFIER_ADD):
    assert inv.count(add) == 1, add[:60]
    inv = inv.replace(add, '', 1)
for new, old in ((b.NEW_TITLE, b.OLD_TITLE), (b.NEW_BANNER, b.OLD_BANNER)):
    assert inv.count(new) == 1
    inv = inv.replace(new, old, 1)
print('inverse equals 2.36:', inv == prior)
heads = lambda text: re.findall(r'^#### Scenario: .*$', text, re.M)
print('scenarios', len(heads(prior)), len(heads(cur)), 'prefix identical:', heads(cur)[:len(heads(prior))] == heads(prior))
