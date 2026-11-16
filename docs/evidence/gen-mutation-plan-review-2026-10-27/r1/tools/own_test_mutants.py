#!/usr/bin/env python3
"""Reviewer mutants against generation-mutation.test.ts (R-GP-IMPL-GEN-MUTATION-PLAN-1).

Each mutant edits one or more files in the clone (the plan, the test, or a
guarded source), runs the one test file under vitest's JSON reporter, and
restores every edited file, checking its sha256. A mutant is "killed" when
the run fails; the record says which the reviewer expected and why.

usage: own_test_mutants.py <clone> <out.json>
"""
import hashlib
import json
import os
import subprocess
import sys

PLAN = "apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"
TEST = "apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts"
PIPELINE = "packages/polaris-generation-core/src/pipeline.ts"
CAP_FROM_NEW = r"""from: "if (repairs >= budget.maxRepairCycles) {\n        if (verdict.reviewerBlocking) stop('repair-exhausted');","""
CAP_FROM_OLD = r"""from: "if (repairs >= budget.maxRepairCycles) stop('repair-exhausted');","""

# (id, what it models, {file: [(old, new), ...]}, reviewer expectation)
MUTANTS = [
    ("R1", "guard rewritten in source, its old text kept once in a comment (fragment occurs once, in a comment only)",
     {PIPELINE: [("      if (calls >= budget.maxCalls) stop('budget-exhausted');",
                  "      if (budget.maxCalls <= calls) stop('budget-exhausted'); // was: if (calls >= budget.maxCalls) stop('budget-exhausted');")]},
     "survives: the test counts text occurrences and cannot tell a comment from code"),
    ("R2", "wrong `file` whose text contains the fragment once (the plan file itself)",
     {PLAN: [("    file: DRAFT_MODEL_SOURCE,", "    file: 'apps/three-surface-poc/src/polaris-generation/generation-mutation.ts',")]},
     "survives: nothing pins `file` to packages/polaris-generation-core/src/**"),
    ("R3", "the test skips one mutant (loop over the first 7 only), with the cap mutant's pre-5955f8c0 fragment planted",
     {TEST: [("for (const mutation of GENERATION_LITERAL_MUTATIONS) {", "for (const mutation of GENERATION_LITERAL_MUTATIONS.slice(0, 7)) {")],
      PLAN: [(CAP_FROM_NEW, CAP_FROM_OLD)]},
     "survives: a check-side mutation; the length assertion pins the plan, not the loop"),
    ("R4", "a mustFail name that matches no test title",
     {PLAN: [("mustFail: ['rejects pollution keys'],", "mustFail: ['rejects pollution keyz'],")]},
     "survives: mustFail is only checked non-empty"),
    ("R5", "`to` textually different from `from` but semantically equal",
     {PLAN: [("to: \"if (false) stop('budget-exhausted');\",", "to: \"if (calls >=  budget.maxCalls) stop('budget-exhausted');\",")]},
     "survives: the test checks only that the source changes"),
    ("R6", "`file` names a path that does not exist",
     {PLAN: [("    file: DRAFT_MODEL_SOURCE,", "    file: 'packages/polaris-generation-core/src/draft-modle.ts',")]},
     "killed: readFileSync throws ENOENT"),
    ("R7", "empty `from` fragment",
     {PLAN: [("from: 'const sorted = (keys as string[]).sort();',", "from: '',")]},
     "killed: an empty fragment splits into every character"),
    ("R8", "the two-occurrence fragment planted in draft-model.ts (the newly mutated file)",
     {PLAN: [("from: \"if (set.size !== values.length) throw new Error('duplicate-handle');\",", "from: \"unique(\",")]},
     "killed: draft-model.ts calls unique( more than once"),
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run_test(clone: str, out: str) -> dict:
    proc = subprocess.run(["npx", "vitest", "run", TEST, "--reporter=json", "--outputFile=" + out],
                          cwd=clone, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                          env={**os.environ, "CI": "1"})
    report = json.load(open(out, encoding="utf-8"))
    tests = [t for f in report["testResults"] for t in f["assertionResults"]]
    file_errors = [f.get("message", "") for f in report["testResults"] if f.get("status") == "failed" and not f["assertionResults"]]
    return {"exit": proc.returncode, "total": report["numTotalTests"], "failed": report["numFailedTests"],
            "failureMessages": [m.splitlines()[0] for t in tests for m in t.get("failureMessages", [])],
            "fileErrors": [e.splitlines()[0] if e else "" for e in file_errors]}


def main(clone: str, out_path: str) -> int:
    scratch = os.environ.get("TMPDIR", "/tmp")
    commit = subprocess.run(["git", "-C", clone, "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    control = run_test(clone, os.path.join(scratch, "own-control.json"))
    results = []
    for mutant_id, models, edits, expectation in MUTANTS:
        originals = {f: open(os.path.join(clone, f), "rb").read() for f in edits}
        try:
            for f, pairs in edits.items():
                text = originals[f].decode("utf-8")
                for old, new in pairs:
                    assert text.count(old) == 1, (mutant_id, f, old)
                    text = text.replace(old, new)
                open(os.path.join(clone, f), "wb").write(text.encode("utf-8"))
            run = run_test(clone, os.path.join(scratch, f"own-{mutant_id}.json"))
        finally:
            for f, data in originals.items():
                open(os.path.join(clone, f), "wb").write(data)
        restored = all(sha256(open(os.path.join(clone, f), "rb").read()) == sha256(d) for f, d in originals.items())
        killed = run["exit"] != 0 and (run["failed"] > 0 or bool(run["fileErrors"]))
        results.append({"id": mutant_id, "models": models,
                        "edits": {f: [{"old": o, "new": n} for o, n in p] for f, p in edits.items()},
                        "expectation": expectation, "observed": run, "killed": killed, "restored": restored})
        print(f"{mutant_id} {'killed  ' if killed else 'SURVIVED'} restored={restored} {run['failureMessages'][:1] or run['fileErrors'][:1]}")
    record = {"subject": "generation-mutation.test.ts, reviewer mutants", "commit": commit, "control": control,
              "controlPassed": control["exit"] == 0 and control["failed"] == 0 and control["total"] > 0,
              "mutants": results,
              "summary": {"mutants": len(results), "killed": sum(r["killed"] for r in results),
                          "restored": sum(r["restored"] for r in results)}}
    open(out_path, "w", encoding="utf-8").write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    print(f"control {'passed' if record['controlPassed'] else 'FAILED'}; {record['summary']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
