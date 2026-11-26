"""Measure the v2.27 block against the v2.21 block: insertions only? (syzygy-5dhm.21)"""
import hashlib, pathlib, sys
root = pathlib.Path(sys.argv[1])
old = (root / "openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md").read_text()
new = (root / "openspec/changes/dossier-question-file/proposed/polaris-generation/spec.md").read_text()
def block(t): return t[t.index("### Requirement: Operator-agent authoring mode"):].split("\n")
o, n = [l for l in block(old) if l.strip()], [l for l in block(new) if l.strip()]
it = iter(n); in_order = all(any(l == m for m in it) for l in o)
added = [l for l in n if l not in set(o)]
sc = lambda ls: sum(l.startswith("#### Scenario") for l in ls)
print({"predecessorSha256": hashlib.sha256(old.encode()).hexdigest(), "proposedSha256": hashlib.sha256(new.encode()).hexdigest(),
       "predecessorNonEmpty": len(o), "predecessorInOrder": in_order, "added": len(added), "scenarios": [sc(o), sc(n)]})
