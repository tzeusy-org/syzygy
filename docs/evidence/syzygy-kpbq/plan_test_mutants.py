"""Rule-6 mutants for generation-mutation.test.ts (syzygy-kpbq).

Each mutant edits the plan, apps/three-surface-poc/src/polaris-generation/
generation-mutation.ts, never the test. It runs the one test file under
vitest's JSON reporter and counts as killed only when the run fails with the
failure message the mutated predicate should produce. The plan's original
bytes are written back after every mutant and their sha256 is checked.

    python3 -I docs/evidence/syzygy-kpbq/plan_test_mutants.py OUT.json

Run it from the repository root on a clean, committed tree. It exits 0 only
when the control passes and every mutant is killed.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

PLAN = "apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"
TEST = "apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts"

# (id, predicate, [(old, new), ...], expected failure-message substring)
MUTANTS = [
    ("T1", "fragment occurs once: the repair-cycle cap's pre-5955f8c0 one-line fragment",
     [(r"""from: "if (repairs >= budget.maxRepairCycles) {\n        if (verdict.reviewerBlocking) stop('repair-exhausted');",""",
       r"""from: "if (repairs >= budget.maxRepairCycles) stop('repair-exhausted');",""")],
     "pipeline-repair-cycle-cap-disabled: expected +0 to be 1"),
    ("T2", "fragment occurs once: the duplicate-handle check's pre-69995614 file",
     [("    file: DRAFT_MODEL_SOURCE,", "    file: PROVIDER_DRAFT_SOURCE,")],
     "provider-draft-duplicate-handle-check-disabled: expected +0 to be 1"),
    ("T3", "fragment occurs once: a fragment that occurs twice",
     [("""from: "if (Array.isArray(record.sourceIds) && record.sourceIds.some(id => !sources.has(id))) throw new Error('unknown-source');",""",
       """from: "throw new Error('unknown-source');",""")],
     "provider-draft-unknown-source-check-disabled: expected 2 to be 1"),
    ("T4", "the mutation changes the source",
     [("to: 'const sorted = (keys as string[]);',", "to: 'const sorted = (keys as string[]).sort();',")],
     "not to be"),
    ("T5", "every mutant names a must-fail test",
     [("mustFail: ['requires declared review coverage of inventory and every claim-bearing block'],", "mustFail: [],")],
     "expected 0 to be greater than 0"),
    ("T6", "ids are distinct",
     [("id: 'canonical-json-cycle-check-disabled',", "id: 'canonical-json-sorted-keys-disabled',")],
     "expected 11 to be 12"),
    ("T7", "the plan holds twelve mutants",
     [("export const GENERATION_LITERAL_MUTATIONS: readonly LiteralMutation[] = [",
       "export const GENERATION_LITERAL_MUTATIONS: readonly LiteralMutation[] = (["),
      ("\n];\n", "\n] as LiteralMutation[]).slice(1);\n")],
     "expected 11 to be 12"),
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def run_test(scratch, label):
    out = os.path.join(scratch, label + ".json")
    proc = subprocess.run(
        ["npx", "vitest", "run", TEST, "--reporter=json", "--outputFile=" + out],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env={**os.environ, "CI": "1"})
    with open(out, encoding="utf-8") as handle:
        report = json.load(handle)
    tests = [t for f in report["testResults"] for t in f["assertionResults"]]
    return {
        "exit": proc.returncode,
        "total": report["numTotalTests"],
        "failed": report["numFailedTests"],
        "failureMessages": [m.splitlines()[0] for t in tests for m in t.get("failureMessages", [])],
    }


def main(out_path):
    commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    status = subprocess.run(["git", "status", "--porcelain", "--", PLAN, TEST], capture_output=True, text=True, check=True).stdout
    with open(PLAN, "rb") as handle:
        original = handle.read()
    digest = sha256(original)
    text = original.decode("utf-8")
    results = []
    with tempfile.TemporaryDirectory(prefix="plan-test-mutants-") as scratch:
        control = run_test(scratch, "control")
        try:
            for mutant_id, predicate, edits, expected in MUTANTS:
                mutated = text
                for old, new in edits:
                    assert mutated.count(old) == 1, (mutant_id, old)
                    mutated = mutated.replace(old, new)
                with open(PLAN, "w", encoding="utf-8") as handle:
                    handle.write(mutated)
                try:
                    run = run_test(scratch, mutant_id)
                finally:
                    with open(PLAN, "wb") as handle:
                        handle.write(original)
                with open(PLAN, "rb") as handle:
                    restored = sha256(handle.read()) == digest
                matched = any(expected in message for message in run["failureMessages"])
                results.append({
                    "id": mutant_id, "predicate": predicate,
                    "edits": [{"old": old, "new": new} for old, new in edits],
                    "expectedMessage": expected, "observed": run,
                    "killed": run["exit"] != 0 and run["failed"] > 0 and matched,
                    "restored": restored,
                })
        finally:
            with open(PLAN, "wb") as handle:
                handle.write(original)
    record = {
        "subject": "generation-mutation.test.ts, by mutating the plan it checks",
        "commit": commit,
        "uncommittedChanges": [line for line in status.splitlines() if line.strip()],
        "plan": PLAN, "planSha256": digest, "test": TEST,
        "control": control,
        "controlPassed": control["exit"] == 0 and control["failed"] == 0 and control["total"] > 0,
        "mutants": results,
        "summary": {
            "mutants": len(results),
            "killed": sum(r["killed"] for r in results),
            "restored": sum(r["restored"] for r in results),
        },
    }
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    ok = record["controlPassed"] and record["summary"]["killed"] == len(MUTANTS) == record["summary"]["restored"]
    print(f"control {'passed' if record['controlPassed'] else 'FAILED'}; "
          f"{record['summary']['killed']}/{len(MUTANTS)} killed; {record['summary']['restored']} restored")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
