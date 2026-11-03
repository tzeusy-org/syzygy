#!/usr/bin/env python3
"""Compare two syzygy-bpyt.6.5 differential outputs (base, head).

Usage: compare_differential.py BASE.json HEAD.json

Every shape, phase-A observation, reader row and model row (served
/api/poc and human page digests) must be identical, except the scenarios
whose fault fires only on a second `ls-tree`: the head lists the tree once,
so those are reported as the expected difference. Every Git call log must
be identical or equal to the base's with exactly its second `ls-tree`
removed. Prints a JSON summary; exits 1 on any other difference.
"""
import json
import sys

SECOND_LISTING_FAULTS = ("|ls-tree-2-fails|", "|ls-tree-2-malformed|")


def main(base_path: str, head_path: str) -> int:
    base = json.load(open(base_path, encoding="utf-8"))
    head = json.load(open(head_path, encoding="utf-8"))
    summary: dict = {"rows": {"base": base["rows"], "head": head["rows"]}, "sections": {}}
    unexpected: list = []
    expected: list = []
    for section in ("shapes", "phaseA", "reader", "models"):
        b, h = base[section], head[section]
        if set(b) != set(h):
            unexpected.append(f"{section}: key sets differ")
            continue
        differ = [k for k in b if b[k] != h[k]]
        for key in differ:
            if section == "shapes" and any(f in key for f in SECOND_LISTING_FAULTS):
                expected.append({"scenario": key, "base": b[key].get("kind"), "head": h[key].get("kind"),
                                 "baseFailure": b[key].get("failure")})
            else:
                unexpected.append(f"{section}: {key}")
        summary["sections"][section] = {"scenarios": len(b), "identical": len(b) - len(differ), "differ": len(differ)}
    identical = dropped = 0
    for key, calls in base["gitCalls"].items():
        after = head["gitCalls"][key]
        if calls == after:
            identical += 1
            continue
        listings = [i for i, call in enumerate(calls) if call.startswith("ls-tree ")]
        if len(listings) >= 2 and calls[: listings[1]] + calls[listings[1] + 1 :] == after[: len(calls) - 1]:
            dropped += 1
        elif any(f in key for f in SECOND_LISTING_FAULTS) and len(listings) >= 2 and calls[: listings[1]] == after[: listings[1]]:
            dropped += 1
        else:
            unexpected.append(f"gitCalls: {key}")
    summary["gitCalls"] = {"scenarios": len(base["gitCalls"]), "identical": identical, "secondListingDropped": dropped}
    summary["expectedDifferences"] = expected
    summary["unexpectedDifferences"] = unexpected
    print(json.dumps(summary, indent=1))
    return 1 if unexpected else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
