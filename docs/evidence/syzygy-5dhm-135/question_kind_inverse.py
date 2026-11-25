#!/usr/bin/env python3
"""syzygy-5dhm.135: check that version 2.32's text inverts to version 2.29's and keeps every predecessor scenario byte for byte.

Usage: question_kind_inverse.py <worktree>. Imports the builder's literals, removes each addition from the 2.32 file, restores the
title and banner, and compares with the 2.29 file; then compares the ordered scenario bodies of 2.29 with the first 215 of 2.32.
"""
import importlib.util
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
spec = importlib.util.spec_from_file_location('b', root / 'docs/evidence/syzygy-5dhm-135/question_kind_build_spec.py')
sys.argv = ['b', str(root), '/dev/null']
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
new = (root / 'openspec/changes/dossier-question-kind-floor/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')
old = b.prior
inv = new.replace(b.NEW_TITLE, b.OLD_TITLE, 1).replace(b.NEW_BANNER, b.OLD_BANNER, 1)
for paragraph in b.PARAGRAPHS:
    assert inv.count('\n\n' + paragraph) == 1
    inv = inv.replace('\n\n' + paragraph, '', 1)
inv = inv.replace(b.SCENARIOS, '', 1)
for add in (b.OBSERVABLE_ADD, b.ORACLE_ADD, b.FALSIFIER_ADD):
    assert inv.count(add) == 1
    inv = inv.replace(add, '', 1)
print('inverse equals 2.29:', inv == old)


def scenarios(text):
    parts = re.split(r'^#### Scenario: ', text, flags=re.M)[1:]
    return [p.split('\n\nForm: event-response.')[0].rstrip('\n') for p in parts]


a, z = scenarios(old), scenarios(new)
print('scenarios', len(a), len(z), 'prefix identical:', a == z[:len(a)] if len(z) >= len(a) else False)
# the last predecessor scenario is followed by the added ones in 2.32: compare its own body up to the next heading
print('added', [s.split('\n')[0] for s in z[len(a):]])
