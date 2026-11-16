#!/usr/bin/env python3
"""Run bounded instrument falsifiers in an explicitly supplied disposable clone.

Never pass the ordinary worktree. No source is committed; every original is
restored in finally. node_modules must be installed in that clone first.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

clone, out = map(lambda arg: Path(arg).resolve(), sys.argv[1:])
assert clone.name == "instrument-clone" and out.is_dir()
subject = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=clone, text=True).strip()
assert not subprocess.check_output(["git", "status", "--porcelain=v1"], cwd=clone)
rows = []


def run(name, relative, old, new, command, expected):
    file = clone / relative
    original = file.read_text()
    assert original.count(old) == 1, (name, original.count(old))
    try:
        file.write_text(original.replace(old, new))
        result = subprocess.run(command, cwd=clone, text=True, capture_output=True, timeout=90)
        log = out / f"{name}-RAW.log"
        log.write_text(result.stdout + result.stderr)
        rows.append(dict(id=name, sourceCommit=subject, path=relative, old=old, new=new,
                         command=command, exitCode=result.returncode, expectedExit=expected,
                         log=str(log), sha256=hashlib.sha256(log.read_bytes()).hexdigest()))
        assert (result.returncode == 0) == (expected == 0), (name, result.returncode)
        print(name, result.returncode, flush=True)
    finally:
        file.write_text(original)


routing = "scripts/spent_round_routing.py"
route_command = ["python3", "scripts/test_spent_round_routing.py"]
for name, old, new in [
    ("routing-duplicate", "if name in rounds:", "if False:"),
    ("routing-header", "if rows[0] !=", "if False and rows[0] !="),
    ("routing-directory", "if not directory.is_dir():", "if False:"),
    ("routing-containment", "if not resolved.is_relative_to(root):", "if False:"),
    ("routing-lexical", 'if "\\\\" in path or "\\0" in path or any(p in ("", ".", "..") for p in parts):', "if False:"),
    ("routing-explicit-history", "if explicit_history or not is_spent_round(path, rounds)", "if not is_spent_round(path, rounds)"),
    ("routing-membership", "parts[len(prefix)] in rounds", "False"),
    ("routing-prefix", "parts[:len(prefix)] == prefix", "True"),
    ("routing-name-grammar", 'ROUND_NAME.fullmatch(name)', 'True'),
]:
    run(name, routing, old, new, route_command, 1)

guard = ["node_modules/.bin/vitest", "run", "--project", "unit", "packages/polaris-generation-core/src/island-boundary.test.ts"]
main = "apps/syzygy/src/main.ts"
original = (clone / main).read_text()
for name, snippet, expected in [
    ("island-static-control", '\nimport { createRequire as auditMake } from "node:module"; const auditLoad = auditMake(import.meta.url); auditLoad("@syzygy/polaris-generation-core");\n', 1),
    ("island-dynamic-destructure", '\nconst { createRequire: auditMake } = await import("node:module"); const auditLoad = auditMake(import.meta.url); auditLoad("@syzygy/polaris-generation-core");\n', 0),
]:
    run(name, main, original, original + snippet, guard, expected)
    rows[-1]["old"], rows[-1]["new"] = "", snippet

# Preserve the selected RFC module in both trees; perturb only one clone copy.
candidate = ".syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md"
old = (clone / candidate).read_text()
run("mirror-byte-drift", candidate, old, old + "\n", ["python3", "scripts/check_governance.py"], 1)
rows[-1]["old"], rows[-1]["new"] = "", "\n"
rows[-1]["operation"] = "append to candidate twin only"

assert not subprocess.check_output(["git", "status", "--porcelain=v1"], cwd=clone)
(out / "instrument-mutations.json").write_text(json.dumps(dict(subject=subject, rows=rows), indent=2) + "\n")
