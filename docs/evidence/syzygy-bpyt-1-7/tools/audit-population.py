#!/usr/bin/env python3
"""Recompute the finite R7 source population; no observed repository access.

Usage: python3 audit-population.py <checkout> <subject-commit> <output.json>
Reads committed blobs, not generated dist or untracked working files. This is
an audit instrument, not a new CI gate. Search hits are inventory, not reliance.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

root, subject, output = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3])


def git(*args):
    return subprocess.check_output(["git", *args], cwd=root)


subject = git("rev-parse", subject).decode().strip()
paths = git("ls-tree", "-rz", "--name-only", subject).decode().split("\0")[:-1]
index = git("ls-files", "-z").decode().split("\0")[:-1]
assert all("\n" not in p and "\r" not in p for p in paths), "batch input requires line-safe paths"
batch = subprocess.run(["git", "cat-file", "--batch"], cwd=root,
                       input="".join(f"{subject}:{p}\n" for p in paths).encode(), capture_output=True, check=True).stdout
blobs = {}
position = 0
for path in paths:
    after = batch.index(b"\n", position)
    _object, kind, size = batch[position:after].split()
    assert kind == b"blob", (path, kind)
    position = after + 1
    blobs[path] = batch[position:position + int(size)]
    position += int(size) + 1
assert position == len(batch)
texts = {}
for path, raw in blobs.items():
    try:
        texts[path] = raw.decode("utf-8")
    except UnicodeDecodeError:
        pass

source = [p for p in paths if p.startswith(("apps/", "packages/", "scripts/")) and re.search(r"\.(?:[cm]?[jt]sx?|py|sh)$", p)]
terms = [
    "agent_load_paths", "is_spent_round", "declared_rounds", "launchedMarkerState", "launchFormRefusal",
    "PERMITTING_ARM_ENABLED", "decideExecutionRule", "allowExecution", "createCredentialProbe",
    "CONFIGURED_ADAPTER_CREDENTIALS", "CONFIGURED_ADAPTER_DECLARATIONS", "credentialStepCheck", "prepareAgentHome",
    "waitModeStatus", "signoffRecordHolds", "readVersionedSignoffState", "recorderTemplate", "sittingTemplate",
    "parseActRecord", "namesAct", "NON_HUMAN_PRINCIPAL", "isIsoDate", "recognizeCodeContexts", "outsideFences",
    "pocObserverInputsAreClean", "draftOwnerAct", "leadInQuotations", "leadInQuotationSpans", "quotedSpans",
    "createRequire", "require(", "import(",
]
searches = []
for term in terms:
    python = sorted({p for p, text in texts.items() if term in text})
    probe = subprocess.run(["git", "grep", "-l", "-z", "-F", term, subject, "--"], cwd=root, capture_output=True)
    assert probe.returncode in (0, 1), (term, probe.stderr)
    second = sorted({p.decode().split(":", 1)[1] for p in probe.stdout.split(b"\0") if p})
    assert python == second, (term, set(python) ^ set(second))
    code_hits = [{"path": p, "lines": [i for i, line in enumerate(texts[p].splitlines(), 1) if term in line]} for p in source if p in python]
    searches.append({"term": term, "population": len(paths), "utf8Population": len(texts), "methods": ["Python literal membership in every committed UTF-8 blob", "git grep -l -z -F at subject"], "matchingPaths": python, "codeHits": code_hits})

governed_code = [p for p in paths if p.startswith((".syzygy/", "openspec/")) and re.search(r"\.(?:[cm]?[jt]sx?|py|sh)$", p)]
rfc = []
prefix = ".syzygy/governance/contracts/rfcs/"
for path in paths:
    if path.startswith(prefix):
        twin = path.replace(prefix, ".syzygy/governance/contracts/candidates/rfcs/", 1)
        rfc.append({"installed": path, "candidate": twin, "same": twin in blobs and blobs[path] == blobs[twin], "sha256": hashlib.sha256(blobs[path]).hexdigest()})

baseline = git("rev-parse", "dd520e8d").decode().strip()
old_paths = git("ls-tree", "-rz", "--name-only", baseline).decode().split("\0")[:-1]
estate = [p for p in old_paths if p.startswith((".syzygy/governance/contracts/candidates/history/", "docs/superpowers/")) or p.startswith(".syzygy/governance/contracts/candidates/round-")]
estate_rows = [{"path": p, "present": p in blobs, "same": p in blobs and blobs[p] == git("show", f"{baseline}:{p}"), "sha256": hashlib.sha256(blobs[p]).hexdigest() if p in blobs else None} for p in estate]
diff = git("diff", "--name-status", baseline, subject, "--", *estate).decode()
assert not diff, diff

# Full source hashes make protected-byte comparisons repeatable on future main.
protected = list(dict.fromkeys(source + governed_code + [p for p in paths if p in ("package.json", "package-lock.json", "PROJECT-STATUS.md", "CONTRIBUTING.md", "AGENTS.md") or p.startswith(".syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-")]))
result = dict(subject=subject, roots=["apps/", "packages/", "scripts/", ".syzygy/", "openspec/"],
              trackedTreePopulation=len(paths), indexPopulation=len(index), indexTreeEqual=set(paths) == set(index),
              indexOnly=sorted(set(index) - set(paths)), treeOnly=sorted(set(paths) - set(index)),
              utf8Population=len(texts), sourcePopulation=len(source), governedCode=governed_code,
              rfcPairs=rfc, estateBaseline=baseline, estatePopulation=len(estate), estateRows=estate_rows,
              estateSecondMethod={"command": ["git", "diff", "--name-status", baseline, subject, "--", "<each estate path>"], "stdout": diff},
              literalSearches=searches, protectedSources=[{"path": p, "sha256": hashlib.sha256(blobs[p]).hexdigest()} for p in protected])
output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"subject": subject, "tracked": len(paths), "source": len(source), "governedCode": len(governed_code), "rfcPairs": len(rfc), "estate": len(estate), "terms": len(terms), "output": str(output)}))
