#!/usr/bin/env python3
"""syzygy-5dhm.26: recover REQ-polaris-generation-033 version 2.31 from version 2.41's bytes, and compare.

Usage: session_usage_inverse.py <worktree>
Removes each addition session_usage_build_spec.py makes (its literals, imported from it), asserting each is found exactly once, restores
the predecessor's title and banner, and exits 0 only when the result equals the predecessor's bytes. It also checks that every
predecessor scenario heading and body is carried byte-identically.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import session_usage_build_spec as b  # noqa: E402

root = pathlib.Path(sys.argv[1])
prior = (root / b.PREDECESSOR).read_text(encoding='utf-8')
successor = (root / 'openspec/changes/dossier-session-usage/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')


def drop(text: str, piece: str) -> str:
    assert text.count(piece) == 1, piece[:80]
    return text.replace(piece, '')


text = drop(successor, b.SCENARIOS)
text = drop(text, '\n\n' + b.BULLET)
for paragraph in b.PARAGRAPHS:
    text = drop(text, '\n\n' + paragraph)
text = text.replace(b.NEW_TITLE, b.OLD_TITLE, 1).replace(b.NEW_BANNER, b.OLD_BANNER, 1)
scenario = re.compile(r'^#### Scenario: .*?(?=^#### |^Form: |\Z)', re.M | re.S)
before = scenario.findall(prior)
after = scenario.findall(successor)
carried = all(block in after for block in before)
print(f'predecessor scenarios {len(before)}, successor {len(after)}, all carried byte-identically: {carried}')
print(f'inverse equals predecessor: {text == prior}')
sys.exit(0 if text == prior and carried else 1)
