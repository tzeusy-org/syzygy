#!/usr/bin/env python3
"""Re-run the PR #543 reviewer's four survivors (R1, R2, R4, R5) byte for byte
against generation-mutation.test.ts at the reviewed commit of PR #546.

usage: python3 -I reviewer_survivors.py <clone> <out.json>

The edits are taken from the reviewer's own tool, loaded by path from the
clone (docs/evidence/gen-mutation-plan-review-2026-10-27/r1/tools/
own_test_mutants.py), never retyped; each run uses that tool's own run_test.
The edit loop is that tool's main loop, restricted to the four ids, since its
R3 edits a for-loop the reviewed test no longer has. The record also says
whether docs/evidence/syzygy-vsqr/test_mutants.py carries the same four edits.
"""
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

REVIEWER_TOOL = "docs/evidence/gen-mutation-plan-review-2026-10-27/r1/tools/own_test_mutants.py"
PR_TOOL = "docs/evidence/syzygy-vsqr/test_mutants.py"
IDS = ["R1", "R2", "R4", "R5"]


def load(clone, rel, name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(clone, rel))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main(clone, out_path):
    clone = os.path.abspath(clone)
    scratch = os.environ["TMPDIR"]
    reviewer = load(clone, REVIEWER_TOOL, "reviewer_tool")
    pr_tool = load(clone, PR_TOOL, "pr_tool")
    rev_edits = {m[0]: m[2] for m in reviewer.MUTANTS}
    pr_edits = {m[0]: m[2] for m in pr_tool.MUTANTS}
    commit = subprocess.run(["git", "-C", clone, "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    results = []
    for mutant_id in IDS:
        edits = rev_edits[mutant_id]
        originals = {f: open(os.path.join(clone, f), "rb").read() for f in edits}
        try:
            for f, pairs in edits.items():
                text = originals[f].decode("utf-8")
                for old, new in pairs:
                    assert text.count(old) == 1, (mutant_id, f, old)
                    text = text.replace(old, new)
                open(os.path.join(clone, f), "wb").write(text.encode("utf-8"))
            run = reviewer.run_test(clone, os.path.join(scratch, f"rev-{mutant_id}.json"))
        finally:
            for f, data in originals.items():
                open(os.path.join(clone, f), "wb").write(data)
        restored = all(sha256(open(os.path.join(clone, f), "rb").read()) == sha256(d) for f, d in originals.items())
        killed = run["exit"] != 0 and (run["failed"] > 0 or bool(run["fileErrors"]))
        results.append({"id": mutant_id, "edits": {f: [{"old": o, "new": n} for o, n in p] for f, p in edits.items()},
                        "sameEditsInPrTool": pr_edits.get(mutant_id) == edits,
                        "observed": run, "killed": killed, "restored": restored})
        print(f"{mutant_id} {'killed' if killed else 'SURVIVED'} restored={restored} sameEditsInPrTool={pr_edits.get(mutant_id) == edits} "
              f"{run['failed']}/{run['total']} {run['failureMessages'] + run['fileErrors']}", flush=True)
    clean = not subprocess.run(["git", "-C", clone, "status", "--porcelain"], capture_output=True, text=True, check=True).stdout.strip()
    record = {"subject": "the PR #543 reviewer's four survivors against generation-mutation.test.ts (PR #546)",
              "commit": commit, "reviewerTool": {"path": REVIEWER_TOOL, "sha256": sha256(open(os.path.join(clone, REVIEWER_TOOL), "rb").read())},
              "tool": {"path": "rev-546/tools/reviewer_survivors.py", "sha256": sha256(open(__file__, "rb").read())},
              "mutants": results, "treeCleanAfter": clean,
              "summary": {"mutants": len(results), "killed": sum(r["killed"] for r in results), "restored": sum(r["restored"] for r in results)}}
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    print(f"{record['summary']}; tree clean {clean}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
