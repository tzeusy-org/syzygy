#!/usr/bin/env python3
"""Count the predecessor REQ-polaris-generation-035 lines (version 2.18) carried in order in version 2.27, and the lines added.
Usage: python3 coverage_hold_survival.py <repository root>"""
import sys
from pathlib import Path

root = Path(sys.argv[1])
pred = (root / "openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md").read_text()
succ = (root / "openspec/changes/dossier-coverage-hold/proposed/polaris-generation/spec.md").read_text()
head, nxt = "### Requirement: Fresh-context review in the operator-agent mode\n", "### Requirement: Declared URL dossier supervisor\n"
old = [l for l in pred[pred.index(head):pred.index(nxt)].splitlines() if l.strip()]
new = [l for l in succ[succ.index(head):].splitlines() if l.strip()]
i, kept, added = 0, 0, []
for line in new:
    if i < len(old) and line == old[i]:
        i, kept = i + 1, kept + 1
    else:
        added.append(line)
print(f"predecessor non-empty lines {len(old)}, carried in order {kept}, added {len(added)}, successor {len(new)}")
print(f"scenarios: predecessor {sum(l.startswith('#### Scenario:') for l in old)}, successor {sum(l.startswith('#### Scenario:') for l in new)}")
assert kept == len(old) and kept + len(added) == len(new)
