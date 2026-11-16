"""Rule-6 mutants for generation-mutation.test.ts after syzygy-vsqr (N2, N3).

Each mutant edits one or more files (the plan, a guarded source, the runner or
the test itself), runs the one test file under vitest's JSON reporter and
writes every edited file back, checking its sha256. A mutant counts as killed
only when the run fails, the expected number of tests fail (when one is
given) and every expected failure-message substring is among the messages; a
mutant expected to survive must pass. The mutants are:

- R1, R2, R4, R5: the four the PR #543 reviewer found surviving (R-GP-IMPL-
  GEN-MUTATION-PLAN-1, docs/evidence/gen-mutation-plan-review-2026-10-27/r1/
  tools/own_test_mutants.py), with that tool's edits byte for byte;
- R6, R7, R8: that tool's mutants the old test already killed, edits byte for
  byte, with the new messages;
- R3: that tool's check-side mutant, adapted to the it.each table: the table
  cut to seven rows with T1's fragment planted. Expected to survive: the
  length row pins the plan, not the table (the reviewer's reading);
- T1-T7: docs/evidence/syzygy-kpbq/plan_test_mutants.py's plan mutants, edits
  byte for byte, with the new messages;
- V1-V4: the new predicates. V1 plants two drifts and needs both reported by
  id in one run (N2). V2 drops a test file from the runner. V3 points a
  mutation at a test file. V4 removes the `each` arm from the title reader.

    python3 -I docs/evidence/syzygy-vsqr/test_mutants.py OUT.json

Run it from the root of a clean, committed checkout with node_modules. It
exits 0 only when the control passes, every mutant runs as expected and every
edited file is restored.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

PLAN = "apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"
TEST = "apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts"
RUNNER = "apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts"
PIPELINE = "packages/polaris-generation-core/src/pipeline.ts"
CAP_FROM_NEW = r"""from: "if (repairs >= budget.maxRepairCycles) {\n        if (verdict.reviewerBlocking) stop('repair-exhausted');","""
CAP_FROM_OLD = r"""from: "if (repairs >= budget.maxRepairCycles) stop('repair-exhausted');","""
EACH_ARM = """ ||
  (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression) && callee.expression.name.text === 'each' &&
    ts.isIdentifier(callee.expression.expression) && ['it', 'test'].includes(callee.expression.expression.text));"""

# (id, predicate, {file: [(old, new), ...]}, expect, expected failed-test count or None, [message substrings])
MUTANTS = [
    ("R1", "the mutation changes the emit: a fragment that occurs once, in a comment only",
     {PIPELINE: [("      if (calls >= budget.maxCalls) stop('budget-exhausted');",
                  "      if (budget.maxCalls <= calls) stop('budget-exhausted'); // was: if (calls >= budget.maxCalls) stop('budget-exhausted');")]},
     "killed", 1, ["pipeline-max-calls-disabled: the mutation changes the emitted JavaScript"]),
    ("R2", "the file is a non-test file under polaris-generation-core/src: the plan's own path, which holds the fragment once",
     {PLAN: [("    file: DRAFT_MODEL_SOURCE,", "    file: 'apps/three-surface-poc/src/polaris-generation/generation-mutation.ts',")]},
     "killed", 1, ["provider-draft-duplicate-handle-check-disabled: apps/three-surface-poc/src/polaris-generation/generation-mutation.ts is a non-test file under"]),
    ("R3", "check-side: the it.each table cut to seven rows, with T1's fragment planted",
     {TEST: [("it.each(GENERATION_LITERAL_MUTATIONS.map(", "it.each(GENERATION_LITERAL_MUTATIONS.slice(0, 7).map(")],
      PLAN: [(CAP_FROM_NEW, CAP_FROM_OLD)]},
     "survived", None, []),
    ("R4", "every must-fail name is in a test title: a name matching no test",
     {PLAN: [("mustFail: ['rejects pollution keys'],", "mustFail: ['rejects pollution keyz'],")]},
     "killed", 1, ['parse-json-pollution-key-check-disabled: must-fail "rejects pollution keyz" is in a test title']),
    ("R5", "the mutation changes the emit: a `to` that differs from `from` only in spacing",
     {PLAN: [("to: \"if (false) stop('budget-exhausted');\",", "to: \"if (calls >=  budget.maxCalls) stop('budget-exhausted');\",")]},
     "killed", 1, ["pipeline-max-calls-disabled: the mutation changes the emitted JavaScript"]),
    ("R6", "the file is read: a path that does not exist",
     {PLAN: [("    file: DRAFT_MODEL_SOURCE,", "    file: 'packages/polaris-generation-core/src/draft-modle.ts',")]},
     "killed", 1, ["ENOENT"]),
    ("R7", "the fragment occurs once: an empty fragment",
     {PLAN: [("from: 'const sorted = (keys as string[]).sort();',", "from: '',")]},
     "killed", 1, ["canonical-json-sorted-keys-disabled: occurrences of the fragment in packages/polaris-generation-core/src/canonical-json.ts"]),
    ("R8", "the fragment occurs once: a fragment that occurs four times in draft-model.ts",
     {PLAN: [("from: \"if (set.size !== values.length) throw new Error('duplicate-handle');\",", "from: \"unique(\",")]},
     "killed", 1, ["provider-draft-duplicate-handle-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/draft-model.ts: expected 4 to be 1"]),
    ("T1", "the fragment occurs once: the repair-cycle cap's pre-5955f8c0 one-line fragment",
     {PLAN: [(CAP_FROM_NEW, CAP_FROM_OLD)]},
     "killed", 1, ["pipeline-repair-cycle-cap-disabled: occurrences of the fragment in packages/polaris-generation-core/src/pipeline.ts: expected +0 to be 1"]),
    ("T2", "the fragment occurs once: the duplicate-handle check's pre-69995614 file",
     {PLAN: [("    file: DRAFT_MODEL_SOURCE,", "    file: PROVIDER_DRAFT_SOURCE,")]},
     "killed", 1, ["provider-draft-duplicate-handle-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/provider-draft.ts: expected +0 to be 1"]),
    ("T3", "the fragment occurs once: a fragment that occurs twice",
     {PLAN: [("""from: "if (Array.isArray(record.sourceIds) && record.sourceIds.some(id => !sources.has(id))) throw new Error('unknown-source');",""",
              """from: "throw new Error('unknown-source');",""")]},
     "killed", 1, ["provider-draft-unknown-source-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/provider-draft.ts: expected 2 to be 1"]),
    ("T4", "the mutation changes the emit: `to` equal to `from`",
     {PLAN: [("to: 'const sorted = (keys as string[]);',", "to: 'const sorted = (keys as string[]).sort();',")]},
     "killed", 1, ["canonical-json-sorted-keys-disabled: the mutation changes the emitted JavaScript"]),
    ("T5", "every mutation names a must-fail test",
     {PLAN: [("mustFail: ['requires declared review coverage of inventory and every claim-bearing block'],", "mustFail: [],")]},
     "killed", 1, ["provider-draft-unknown-finding-target-check-disabled: must-fail names: expected 0 to be greater than 0"]),
    ("T6", "ids are distinct",
     {PLAN: [("id: 'canonical-json-cycle-check-disabled',", "id: 'canonical-json-sorted-keys-disabled',")]},
     "killed", 1, ["expected 11 to be 12"]),
    ("T7", "the plan holds twelve mutations",
     {PLAN: [("export const GENERATION_LITERAL_MUTATIONS: readonly LiteralMutation[] = [",
              "export const GENERATION_LITERAL_MUTATIONS: readonly LiteralMutation[] = (["),
             ("\n];\n", "\n] as LiteralMutation[]).slice(1);\n")]},
     "killed", 1, ["expected 11 to be 12"]),
    ("V1", "every drift is reported by id in one run (N2): T1 and T2 planted together",
     {PLAN: [(CAP_FROM_NEW, CAP_FROM_OLD), ("    file: DRAFT_MODEL_SOURCE,", "    file: PROVIDER_DRAFT_SOURCE,")]},
     "killed", 2, ["pipeline-repair-cycle-cap-disabled: occurrences of the fragment",
                   "provider-draft-duplicate-handle-check-disabled: occurrences of the fragment"]),
    ("V2", "the runner runs the test files must-fail names are read from: one dropped from its TEST_FILES",
     {RUNNER: [("  'packages/polaris-generation-core/src/provider-draft.test.ts',\n] as const;", "] as const;")]},
     "killed", 1, ["packages/polaris-generation-core/src/provider-draft.test.ts: expected"]),
    ("V3", "the file is not a test file: a mutation pointed at its own test file",
     {PLAN: [("    file: CANONICAL_JSON_SOURCE,\n    description: 'object keys are encoded in insertion order",
              "    file: 'packages/polaris-generation-core/src/canonical-json.test.ts',\n    description: 'object keys are encoded in insertion order")]},
     "killed", 1, ["canonical-json-sorted-keys-disabled: packages/polaris-generation-core/src/canonical-json.test.ts is a non-test file under"]),
    ("V4", "check-side: the title reader without its `each` arm",
     {TEST: [(EACH_ARM, ";")]},
     "killed", 2, ['parse-json-duplicate-key-check-disabled: must-fail "rejects duplicate decoded keys" is in a test title',
                   'parse-json-pollution-key-check-disabled: must-fail "rejects pollution keys" is in a test title']),
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def run_test(scratch, label):
    out = os.path.join(scratch, label + ".json")
    proc = subprocess.run(["npx", "vitest", "run", TEST, "--reporter=json", "--outputFile=" + out],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env={**os.environ, "CI": "1"})
    with open(out, encoding="utf-8") as handle:
        report = json.load(handle)
    tests = [t for f in report["testResults"] for t in f["assertionResults"]]
    file_errors = [f.get("message", "") for f in report["testResults"] if f.get("status") == "failed" and not f["assertionResults"]]
    return {"exit": proc.returncode, "total": report["numTotalTests"], "failed": report["numFailedTests"],
            "failureMessages": [m.splitlines()[0] for t in tests for m in t.get("failureMessages", [])],
            "fileErrors": [e.splitlines()[0] if e else "" for e in file_errors]}


def main(out_path):
    commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    if subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, check=True).stdout.strip():
        sys.exit("the checkout is not clean")
    touched = sorted({f for _, _, edits, _, _, _ in MUTANTS for f in edits})
    digests = {f: sha256(open(f, "rb").read()) for f in touched}
    results = []
    with tempfile.TemporaryDirectory(prefix="vsqr-test-mutants-") as scratch:
        control = run_test(scratch, "control")
        for mutant_id, predicate, edits, expect, count, messages in MUTANTS:
            originals = {f: open(f, "rb").read() for f in edits}
            try:
                for f, pairs in edits.items():
                    text = originals[f].decode("utf-8")
                    for old, new in pairs:
                        if text.count(old) != 1: sys.exit(f"{mutant_id}: {f}: the fragment occurs {text.count(old)} times")
                        text = text.replace(old, new)
                    open(f, "wb").write(text.encode("utf-8"))
                run = run_test(scratch, mutant_id)
            finally:
                for f, data in originals.items():
                    open(f, "wb").write(data)
            restored = all(sha256(open(f, "rb").read()) == digests[f] for f in edits)
            failed = run["exit"] != 0 and (run["failed"] > 0 or bool(run["fileErrors"]))
            said = all(any(m in line for line in run["failureMessages"] + run["fileErrors"]) for m in messages)
            outcome = "killed" if failed else "survived"
            as_expected = outcome == expect and (expect == "survived" or (said and (count is None or run["failed"] == count)))
            results.append({"id": mutant_id, "predicate": predicate,
                            "edits": {f: [{"old": o, "new": n} for o, n in pairs] for f, pairs in edits.items()},
                            "expect": expect, "expectedFailedTests": count, "expectedMessages": messages,
                            "observed": run, "outcome": outcome, "asExpected": as_expected, "restored": restored})
            print(f"{mutant_id} {outcome} asExpected={as_expected} restored={restored} {(run['failureMessages'] + run['fileErrors'])[:1]}", flush=True)
    clean = not subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, check=True).stdout.strip()
    record = {"subject": "generation-mutation.test.ts after syzygy-vsqr, by mutating the plan, a guarded source, the runner and the test",
              "commit": commit, "tool": {"path": "docs/evidence/syzygy-vsqr/test_mutants.py", "sha256": sha256(open(__file__, "rb").read())},
              "files": [{"path": f, "sha256": digests[f]} for f in touched],
              "control": control, "controlPassed": control["exit"] == 0 and control["failed"] == 0 and control["total"] > 0,
              "mutants": results, "treeCleanAfter": clean,
              "summary": {"mutants": len(results), "asExpected": sum(r["asExpected"] for r in results),
                          "killed": sum(r["outcome"] == "killed" for r in results), "restored": sum(r["restored"] for r in results)}}
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    ok = record["controlPassed"] and clean and record["summary"]["asExpected"] == len(MUTANTS) == record["summary"]["restored"]
    print(f"control {'passed' if record['controlPassed'] else 'FAILED'}; {record['summary']}; tree clean {clean}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
