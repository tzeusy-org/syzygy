#!/usr/bin/env python3
"""Compare two syzygy-bpyt.6.5 capture outputs (base, head).

Usage: compare_capture.py BASE.json HEAD.json

Both files come from capture-harness.test.ts.txt (mode `real-git-fixture`,
or mode `live` for the operator run). Every scenario's shape record must be
identical. Every Git call log must be identical to the base's or equal to it
with exactly its second `ls-tree` removed, and the head must list the tree
exactly once (AC 2).
Prints a JSON summary; exits 1 on any other difference or when the two files
name different modes, scenarios or revisions.
"""
import json
import sys


def main(base_path: str, head_path: str) -> int:
    base = json.load(open(base_path, encoding="utf-8"))
    head = json.load(open(head_path, encoding="utf-8"))
    unexpected: list = []
    if base["mode"] != head["mode"]:
        unexpected.append(f"mode: {base['mode']} != {head['mode']}")
    for section in ("shapes", "gitCalls") + (("revisions",) if "revisions" in base else ()):
        if set(base[section]) != set(head.get(section, {})):
            unexpected.append(f"{section}: key sets differ")
    if base.get("revisions") != head.get("revisions"):
        unexpected.append("revisions differ (the two sides read different objects)")
    if base.get("revision") != head.get("revision"):
        unexpected.append("revision differs")
    scenarios = []
    for key in base["shapes"]:
        row = {"scenario": key, "kind": base["shapes"][key].get("kind", "threw")}
        row["shapeIdentical"] = base["shapes"][key] == head["shapes"].get(key)
        if not row["shapeIdentical"]:
            unexpected.append(f"shapes: {key}")
        calls, after = base["gitCalls"][key], head["gitCalls"].get(key, [])
        listings = [i for i, call in enumerate(calls) if call.startswith("ls-tree ")]
        row["lsTree"] = {"base": len(listings), "head": sum(1 for call in after if call.startswith("ls-tree "))}
        if calls == after:
            row["calls"] = "identical"
        elif len(listings) >= 2 and calls[: listings[1]] + calls[listings[1] + 1 :] == after:
            row["calls"] = "second-ls-tree-dropped"
        else:
            row["calls"] = "DIFFERENT"
            unexpected.append(f"gitCalls: {key}")
        if row["lsTree"]["head"] != 1:
            unexpected.append(f"lsTree: {key}: head listed the tree {row['lsTree']['head']} times")
        row["catFile"] = {"base": sum(1 for c in calls if c.startswith("cat-file ")), "head": sum(1 for c in after if c.startswith("cat-file "))}
        scenarios.append(row)
    summary = {"mode": base["mode"], "scenarios": scenarios, "unexpectedDifferences": unexpected}
    print(json.dumps(summary, indent=1))
    return 1 if unexpected else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
