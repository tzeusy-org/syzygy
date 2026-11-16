#!/usr/bin/env python3
"""Apply one plan mutant to the clone, run the given vitest files, print each
failing test's full name and the head of its failure message, then restore
the source and verify its sha256. Reviewer tool for R-GP-IMPL-GEN-MUTATION-PLAN-1.

usage: apply_and_read.py <clone> <plan.json> <mutant-id> <out.json> <test-file>...
"""
import hashlib
import json
import os
import subprocess
import sys


def main() -> int:
    clone, plan_path, mutant_id, out_path, *tests = sys.argv[1:]
    plan = {m["id"]: m for m in json.load(open(plan_path))}
    m = plan[mutant_id]
    path = os.path.join(clone, m["file"])
    original = open(path, "rb").read()
    before = hashlib.sha256(original).hexdigest()
    text = original.decode("utf-8")
    count = text.count(m["from"])
    print(f"mutant {mutant_id} file {m['file']} occurrences {count} sha256-before {before}")
    if count != 1:
        return 2
    mutated = text.replace(m["from"], m["to"], 1)
    try:
        open(path, "wb").write(mutated.encode("utf-8"))
        subprocess.run(
            ["npx", "vitest", "run", *tests, "--reporter=json", f"--outputFile={out_path}"],
            cwd=clone, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            env={**os.environ, "CI": "1"},
        )
        if os.environ.get("READ_DIFF"):
            # The default reporter prints the expected/received diff the JSON omits.
            with open(out_path + ".txt", "wb") as sink:
                subprocess.run(["npx", "vitest", "run", *tests], cwd=clone, stdout=sink,
                               stderr=subprocess.STDOUT, env={**os.environ, "CI": "1", "NO_COLOR": "1"})
    finally:
        open(path, "wb").write(original)
    after = hashlib.sha256(open(path, "rb").read()).hexdigest()
    print(f"sha256-after {after} restored {after == before}")
    report = json.load(open(out_path))
    print(f"total {report['numTotalTests']} passed {report['numPassedTests']} failed {report['numFailedTests']}")
    for f in report["testResults"]:
        for a in f["assertionResults"]:
            if a["status"] == "failed":
                msg = " | ".join(a.get("failureMessages") or [])
                print(f"FAILED {a['fullName']}\n  duration {a.get('duration')}\n  {msg[:700]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
